'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type ServiceRow = {
  id: string;
  title: string;
  description: string | null;
  price: string | null;
  priceOnRequest?: boolean;
  commission: string | null;
  cashbackEuro: number | null;
  pendingApproval: boolean;
  createdAt: string;
  partner: { id: string; name: string };
};

export default function AdminServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [pendingServices, setPendingServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingCommission, setEditingCommission] = useState<
    Record<string, string>
  >({});
  const [editingCashback, setEditingCashback] = useState<
    Record<string, string>
  >({});
  const [filterText, setFilterText] = useState('');

  function serviceMatchesFilter(s: ServiceRow, term: string) {
    const t = term.trim().toLowerCase();
    if (!t) return true;

    const priceLabel = s.priceOnRequest
      ? 'sob consulta'
      : s.price != null
      ? s.price
      : '';
    const cashbackLabel =
      s.cashbackEuro != null && s.cashbackEuro > 0
        ? `${s.cashbackEuro} €`
        : '';

    const haystack = [
      s.title,
      s.description ?? '',
      s.partner.name,
      priceLabel,
      cashbackLabel,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(t);
  }

  const filteredServices = filterText
    ? services.filter((s) => serviceMatchesFilter(s, filterText))
    : services;

  const filteredPendingServices = filterText
    ? pendingServices.filter((s) => serviceMatchesFilter(s, filterText))
    : pendingServices;

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'ADMIN') {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [all, pending] = await Promise.all([
          api.admin.services.list(),
          api.admin.services.listPending(),
        ]);
        setServices(all);
        setPendingServices(pending);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar serviços.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) return null;

  if (user.role !== 'ADMIN') {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Serviços (admin)
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  async function handleSaveCommission(service: ServiceRow) {
    const id = service.id;
    const raw = editingCommission[id];
    const value = raw === undefined || raw === '' ? null : raw.trim();
    const rawCashback = editingCashback[id];
    const cashbackValue =
      rawCashback === undefined || rawCashback === ''
        ? null
        : Number(rawCashback.replace(',', '.'));
    if (rawCashback && (Number.isNaN(cashbackValue) || cashbackValue! < 0)) {
      setError('Valor de cashback inválido. Utilize apenas números positivos.');
      return;
    }
    setError('');
    setSavingId(id);
    try {
      const updated = await api.admin.services.updateCommission(id, {
        commission: value,
        cashbackEuro: cashbackValue,
      });
      const applyUpdated = (s: ServiceRow): ServiceRow =>
        s.id !== id
          ? s
          : {
              ...s,
              commission: updated.commission ?? s.commission,
              cashbackEuro:
                updated.cashbackEuro !== null ? updated.cashbackEuro : s.cashbackEuro,
            };

      setServices((prev) => prev.map(applyUpdated));
      setPendingServices((prev) => prev.map(applyUpdated));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao atualizar comissão. Tente novamente.',
      );
    } finally {
      setSavingId(null);
    }
  }

  async function handleApprove(service: ServiceRow) {
    setError('');
    try {
      await api.admin.services.approve(service.id);
      setPendingServices((prev) => prev.filter((s) => s.id !== service.id));
      setServices((prev) =>
        prev.map((s) =>
          s.id === service.id ? { ...s, pendingApproval: false } : s,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao aprovar serviço. Tente novamente.',
      );
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">
        Serviços (admin)
      </h1>
      <p className="mt-2 text-zinc-600">
        Veja os serviços cadastrados pelos parceiros e defina a comissão da
        RPM. Indique o valor e o símbolo ao final (ex.: 10% ou 5 €).
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-4">
        <div className="w-full md:max-w-sm">
          <label className="block text-xs font-medium text-zinc-700">
            Filtrar serviços
          </label>
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Pesquisar por parceiro, serviço, preço ou cashback…"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">
          Carregando serviços cadastrados…
        </p>
      ) : (
        <>
          <section className="mt-6 space-y-2">
            <h2 className="text-sm font-semibold text-zinc-900">
              Serviços pendentes de aprovação
            </h2>
            {filteredPendingServices.length === 0 ? (
              <p className="text-xs text-zinc-500">
                Nenhum serviço pendente de aprovação no momento.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-amber-50 text-zinc-600">
                    <tr>
                      <th className="px-4 py-2 text-left">Parceiro</th>
                      <th className="px-4 py-2 text-left">Serviço</th>
                      <th className="px-4 py-2 text-left">Preço</th>
                      <th className="px-4 py-2 text-left">Comissão RPM</th>
                      <th className="px-4 py-2 text-left">Cashback (EUR)</th>
                      <th className="px-4 py-2 text-left">Criado em</th>
                      <th className="px-4 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPendingServices.map((s) => (
                      <tr key={s.id} className="border-t border-zinc-200">
                        <td className="px-4 py-2 align-top">{s.partner.name}</td>
                        <td className="px-4 py-2 align-top">
                          <div className="font-medium text-zinc-900">
                            {s.title}
                          </div>
                          {s.description && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600">
                              {s.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2 align-top">
                          {s.priceOnRequest ? (
                            <span className="text-zinc-600">Sob consulta</span>
                          ) : s.price != null ? (
                            s.price
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 align-top">
                          <input
                            type="text"
                            placeholder="Ex: 10% ou 5 €"
                            value={editingCommission[s.id] ?? (s.commission ?? '')}
                            onChange={(e) =>
                              setEditingCommission((prev) => ({
                                ...prev,
                                [s.id]: e.target.value,
                              }))
                            }
                            className="w-28 rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 align-top">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="Ex: 20"
                            value={
                              editingCashback[s.id] ??
                              (s.cashbackEuro != null ? String(s.cashbackEuro) : '')
                            }
                            onChange={(e) =>
                              setEditingCashback((prev) => ({
                                ...prev,
                                [s.id]: e.target.value,
                              }))
                            }
                            className="w-24 rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 align-top">
                          {new Date(s.createdAt).toLocaleString('pt-PT')}
                        </td>
                        <td className="px-4 py-2 text-right align-top">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveCommission(s)}
                              disabled={savingId === s.id}
                              className="cursor-pointer rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                            >
                              {savingId === s.id ? 'Salvando…' : 'Salvar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApprove(s)}
                              className="cursor-pointer rounded bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                            >
                              Aprovar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-8">
            <h2 className="text-sm font-semibold text-zinc-900">
              Todos os serviços
            </h2>
            {filteredServices.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500">
                Nenhum serviço encontrado com os filtros atuais.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50 text-zinc-600">
                    <tr>
                      <th className="px-4 py-2 text-left">Parceiro</th>
                      <th className="px-4 py-2 text-left">Serviço</th>
                      <th className="px-4 py-2 text-left">Preço</th>
                      <th className="px-4 py-2 text-left">Comissão RPM</th>
                      <th className="px-4 py-2 text-left">Cashback (EUR)</th>
                      <th className="px-4 py-2 text-left">Criado em</th>
                      <th className="px-4 py-2 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServices.map((s) => (
                      <tr key={s.id} className="border-t border-zinc-200">
                        <td className="px-4 py-2 align-top">{s.partner.name}</td>
                        <td className="px-4 py-2 align-top">
                          <div className="font-medium text-zinc-900">
                            {s.title}
                          </div>
                          {s.description && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600">
                              {s.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2 align-top">
                          {s.priceOnRequest ? (
                            <span className="text-zinc-600">Sob consulta</span>
                          ) : s.price != null ? (
                            s.price
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 align-top">
                          <input
                            type="text"
                            placeholder="Ex: 10% ou 5 €"
                            value={
                              editingCommission[s.id] ?? (s.commission ?? '')
                            }
                            onChange={(e) =>
                              setEditingCommission((prev) => ({
                                ...prev,
                                [s.id]: e.target.value,
                              }))
                            }
                            className="w-24 rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 align-top">
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            placeholder="Ex: 20"
                            value={
                              editingCashback[s.id] ??
                              (s.cashbackEuro != null
                                ? String(s.cashbackEuro)
                                : '')
                            }
                            onChange={(e) =>
                              setEditingCashback((prev) => ({
                                ...prev,
                                [s.id]: e.target.value,
                              }))
                            }
                            className="w-24 rounded-lg border border-zinc-300 px-2 py-1 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-2 align-top">
                          {new Date(s.createdAt).toLocaleString('pt-PT')}
                        </td>
                        <td className="px-4 py-2 text-right align-top">
                          <button
                            type="button"
                            onClick={() => handleSaveCommission(s)}
                            disabled={savingId === s.id}
                            className="cursor-pointer rounded bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                          >
                            {savingId === s.id ? 'Salvando…' : 'Salvar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

