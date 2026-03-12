'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type ServiceRow = {
  id: string;
  title: string;
  description: string | null;
  price: string | null;
  commissionEuro: number | null;
  createdAt: string;
  partner: { id: string; name: string };
};

export default function AdminServicesPage() {
  const { user } = useAuth();
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editingCommission, setEditingCommission] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'ADMIN') {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await api.admin.services.list();
        setServices(data);
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

  async function handleSaveCommission(id: string) {
    const raw = editingCommission[id];
    const value =
      raw === undefined || raw === '' ? null : Number(raw.replace(',', '.'));
    setError('');
    setSavingId(id);
    try {
      const updated = await api.admin.services.updateCommission(id, value);
      setServices((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, commissionEuro: updated.commissionEuro } : s,
        ),
      );
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

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">
        Serviços (admin)
      </h1>
      <p className="mt-2 text-zinc-600">
        Veja os serviços cadastrados pelos parceiros e defina/edite a comissão
        da RPM (valor em euros) para cada serviço.
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">
          Carregando serviços cadastrados…
        </p>
      ) : services.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          Ainda não há serviços cadastrados.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-2 text-left">Parceiro</th>
                <th className="px-4 py-2 text-left">Serviço</th>
                <th className="px-4 py-2 text-left">Preço</th>
                <th className="px-4 py-2 text-left">Comissão (EUR)</th>
                <th className="px-4 py-2 text-left">Criado em</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {services.map((s) => (
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
                    {s.price ?? <span className="text-zinc-400">—</span>}
                  </td>
                  <td className="px-4 py-2 align-top">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={
                        editingCommission[s.id] ??
                        (s.commissionEuro !== null && s.commissionEuro !== undefined
                          ? String(s.commissionEuro)
                          : '')
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
                    {new Date(s.createdAt).toLocaleString('pt-PT')}
                  </td>
                  <td className="px-4 py-2 text-right align-top">
                    <button
                      type="button"
                      onClick={() => handleSaveCommission(s.id)}
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
    </div>
  );
}

