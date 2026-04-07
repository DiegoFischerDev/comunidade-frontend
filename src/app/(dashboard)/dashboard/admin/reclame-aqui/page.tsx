'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

type Payload = Awaited<ReturnType<typeof api.admin.support.tickets>>;

function prettyDtPt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminReclameAquiPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canSee = user?.role === 'ADMIN';

  const load = useCallback(async () => {
    if (!canSee) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.support.tickets(300);
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, [canSee]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = useMemo(() => data?.items ?? [], [data?.items]);

  if (!user) return null;
  if (!canSee) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Reclame aqui</h1>
        <p className="mt-2 text-sm text-zinc-600">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Reclame aqui</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Tickets enviados por membros/visitantes (elogios, reclamações de parceiros e bugs).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Atualizar
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">Nenhum ticket encontrado.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Quem abriu</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">Mensagem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {items.map((t) => (
                <tr key={t.id} className="align-top text-zinc-800">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-900">
                    {prettyDtPt(t.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{t.user.name}</td>
                  <td className="whitespace-nowrap px-4 py-3">{t.user.whatsapp}</td>
                  <td className="px-4 py-3">
                    <div className="whitespace-pre-wrap text-zinc-800">{t.message}</div>
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

