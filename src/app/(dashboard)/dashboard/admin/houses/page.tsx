'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type AdminHouseRow = Awaited<ReturnType<typeof api.admin.houses.list>>[number];

export default function AdminHousesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [items, setItems] = useState<AdminHouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await api.admin.houses.list();
    setItems(data);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar anúncios.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isAdmin, load]);

  const total = useMemo(() => items.length, [items]);

  const onDelete = async (id: string) => {
    if (!window.confirm('Eliminar este anúncio e apagar as médias no servidor?')) return;
    setBusyId(id);
    setError('');
    try {
      await api.admin.houses.delete(id);
      setItems((prev) => prev.filter((h) => h.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao eliminar.');
    } finally {
      setBusyId(null);
    }
  };

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Anúncios de casas</h1>
        <p className="mt-2 text-sm text-zinc-600">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Anúncios de casas</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Gerir imóveis publicados por parceiros. Ao eliminar, as imagens e vídeos são removidos do armazenamento.
          Anúncios indisponíveis com data de disponibilidade há mais de 2 meses são apagados automaticamente (com
          médias).
        </p>
        <p className="mt-1 text-xs text-zinc-500">Total: {total}</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-600">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum anúncio registado.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-2 text-left">Título</th>
                <th className="px-4 py-2 text-left">Parceiro</th>
                <th className="px-4 py-2 text-left">Categoria</th>
                <th className="px-4 py-2 text-left">Estado</th>
                <th className="px-4 py-2 text-left">Disponível a partir</th>
                <th className="px-4 py-2 text-left">Criado</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((h) => (
                <tr key={h.id} className="border-t border-zinc-200">
                  <td className="max-w-[200px] px-4 py-2 align-top">
                    <span className="line-clamp-2 font-medium text-zinc-900">{h.title}</span>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {h.city} · {h.typology}
                    </p>
                  </td>
                  <td className="px-4 py-2 align-top">{h.partner.name}</td>
                  <td className="px-4 py-2 align-top">
                    {h.partner.category?.name ?? '—'}
                  </td>
                  <td className="px-4 py-2 align-top">
                    {h.status === 'AVAILABLE' ? (
                      <span className="text-xs font-medium text-emerald-700">Disponível</span>
                    ) : (
                      <span className="text-xs font-medium text-zinc-600">Indisponível</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 align-top">
                    {new Date(h.availableFrom).toLocaleDateString('pt-PT')}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 align-top">
                    {new Date(h.createdAt).toLocaleString('pt-PT')}
                  </td>
                  <td className="px-4 py-2 text-right align-top">
                    <button
                      type="button"
                      disabled={busyId === h.id}
                      onClick={() => onDelete(h.id)}
                      className="rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      {busyId === h.id ? 'A apagar…' : 'Eliminar'}
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
