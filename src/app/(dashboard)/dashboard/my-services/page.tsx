'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { CardButton } from '@/components/ui/CardButton';

type PartnerServiceRow = {
  id: string;
  title: string;
  description: string | null;
  price: string | null;
  priceOnRequest: boolean;
  rpmCommissionEur: string | null;
};

export default function MyServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<PartnerServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [priceOnRequest, setPriceOnRequest] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'PARTNER') {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await api.partner.services.list();
        setServices(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar serviços do parceiro.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (!user) return null;

  if (user.role !== 'PARTNER') {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Meus serviços</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Esta área é exclusiva para parceiros.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!description.trim()) {
        setError('A descrição é obrigatória.');
        setSubmitting(false);
        return;
      }
      if (!priceOnRequest && !price.trim()) {
        setError('O valor é obrigatório quando o serviço não é "sob consulta".');
        setSubmitting(false);
        return;
      }

      if (editingId) {
        const updated = await api.partner.services.update(editingId, {
          title,
          description: description.trim(),
          priceOnRequest,
          price: priceOnRequest ? undefined : price.trim() || undefined,
        });
        setServices((prev) =>
          prev.map((s) => (s.id === editingId ? updated : s)),
        );
      } else {
        const created = await api.partner.services.create({
          title,
          description: description.trim(),
          priceOnRequest,
          price: priceOnRequest ? undefined : price.trim() || undefined,
        });
        setServices((prev) => [created, ...prev]);
      }

      setTitle('');
      setDescription('');
      setPrice('');
      setPriceOnRequest(false);
      setEditingId(null);
      setIsModalOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao salvar serviço. Tente novamente.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(service: PartnerServiceRow) {
    setEditingId(service.id);
    setTitle(service.title);
    setDescription(service.description ?? '');
    setPrice(service.price ?? '');
    setPriceOnRequest(service.priceOnRequest ?? false);
    setError('');
    setIsModalOpen(true);
  }

  async function handleDelete(service: PartnerServiceRow) {
    if (
      !window.confirm(
        `Tem certeza que deseja remover este serviço? Esta ação é irreversível.\n\nServiço: ${service.title}`,
      )
    ) {
      return;
    }
    setError('');
    try {
      await api.partner.services.delete(service.id);
      setServices((prev) => prev.filter((s) => s.id !== service.id));
      if (editingId === service.id) {
        setEditingId(null);
        setTitle('');
        setDescription('');
        setPrice('');
        setPriceOnRequest(false);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao remover serviço. Tente novamente.',
      );
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Meus serviços</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Cadastre os serviços que serão exibidos no marketplace. A categoria dos
        serviços será definida pelo time RPM.
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6">
        <CardButton
          type="button"
          variant="primary"
          onClick={() => {
            setEditingId(null);
            setTitle('');
            setDescription('');
            setPrice('');
            setPriceOnRequest(false);
            setError('');
            setIsModalOpen(true);
          }}
        >
          Cadastrar serviço
        </CardButton>
      </div>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !submitting && setIsModalOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">
                {editingId ? 'Editar serviço' : 'Cadastrar novo serviço'}
              </h2>
              <button
                type="button"
                onClick={() => !submitting && setIsModalOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-xs text-zinc-500 hover:bg-zinc-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-700">
                  Título do serviço
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-700">
                  Descrição
                </label>
                <textarea
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-zinc-700">
                  Valor
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="Ex.: 50.00"
                  disabled={priceOnRequest}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-zinc-100 disabled:text-zinc-500"
                />
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={priceOnRequest}
                    onChange={(e) => {
                      setPriceOnRequest(e.target.checked);
                      if (e.target.checked) setPrice('');
                    }}
                    className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                  Sob consulta
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting
                    ? 'Salvando…'
                    : editingId
                      ? 'Salvar alterações'
                      : 'Cadastrar serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">
          Carregando serviços cadastrados…
        </p>
      ) : services.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          Nenhum serviço cadastrado ainda.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-2 text-left">Título</th>
                <th className="px-4 py-2 text-left">Descrição</th>
                <th className="px-4 py-2 text-left">Valor (EUR)</th>
                <th className="px-4 py-2 text-left">Comissão RPM</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id} className="border-t border-zinc-200">
                  <td className="px-4 py-2 align-top">{s.title}</td>
                  <td className="px-4 py-2 align-top">
                    {s.description ? (
                      <span className="line-clamp-3 max-w-xs whitespace-pre-line text-zinc-700">
                        {s.description}
                      </span>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 align-top">
                    {s.priceOnRequest ? (
                      <span className="text-xs text-zinc-600">Sob consulta</span>
                    ) : s.price ? (
                      <span className="text-xs font-medium text-emerald-700">
                        {s.price} €
                      </span>
                    ) : (
                      <span className="text-zinc-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 align-top">
                    {s.rpmCommissionEur ? (
                      <span className="text-xs font-medium text-zinc-800">
                        {s.rpmCommissionEur}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="space-x-2 px-4 py-2 text-right align-top">
                    <button
                      type="button"
                      onClick={() => startEdit(s)}
                      className="cursor-pointer rounded bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s)}
                      className="cursor-pointer rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

