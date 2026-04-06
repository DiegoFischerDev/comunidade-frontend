'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type TodayPayload = Awaited<ReturnType<typeof api.admin.calendly.today>>;

function formatSlot(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-PT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Lisbon',
  });
}

function waUrl(digits: string, leadName: string): string {
  const text = `Olá ${leadName.trim() || '!'}\n\nFalo em relação à chamada agendada connosco hoje na Comunidade RPM.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export default function AdminCalendlyHojePage() {
  const { user } = useAuth();
  const [data, setData] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.calendly.today();
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    void load();
  }, [user, load]);

  if (!user) return null;

  if (user.role !== 'ADMIN') {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Agendamentos Calendly</h1>
        <p className="mt-2 text-sm text-zinc-600">Sem permissão para esta página.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Agendamentos de hoje (Calendly)</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Convites ativos com início no dia atual ({data?.timeZone ?? 'Europe/Lisbon'}). Atualiza a partir
            da API Calendly.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
        >
          {loading ? 'A carregar…' : 'Atualizar'}
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {data && !data.configured ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">API Calendly não configurada no servidor</p>
          <p className="mt-2 text-amber-900/90">
            {data.message} O Personal Access Token precisa de scopes como{' '}
            <code className="rounded bg-amber-100/80 px-1">scheduled_events:read</code>,{' '}
            <code className="rounded bg-amber-100/80 px-1">users:read</code> e{' '}
            <code className="rounded bg-amber-100/80 px-1">organizations:read</code>.
          </p>
        </div>
      ) : null}

      {data?.configured && data.message ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {data.message}
        </p>
      ) : null}

      {data?.configured && !data.message && data.items.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-600">Nenhum agendamento ativo para hoje neste intervalo.</p>
      ) : null}

      {data && data.items.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-4 py-3">Horário</th>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Comunidade</th>
                <th className="px-4 py-3 w-40">WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.items.map((row) => (
                <tr key={row.eventUri} className="text-zinc-800">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-900">
                    {formatSlot(row.startTime)}
                    <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                      {row.eventName}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.inviteeName}</td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-zinc-600">
                    {row.inviteeEmail ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {row.matchedUserId ? (
                      <span className="text-emerald-800" title={row.matchedUserId}>
                        {row.matchedUserName ?? row.matchedUserId}
                      </span>
                    ) : (
                      <span className="text-zinc-400">Não encontrado na BD</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.whatsappDigits ? (
                      <a
                        href={waUrl(row.whatsappDigits, row.inviteeName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#20BD5A]"
                      >
                        Abrir chat
                      </a>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                    {row.whatsappSource === 'calendly' && row.whatsappDigits ? (
                      <span className="mt-1 block text-[10px] text-zinc-400">nº do Calendly</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
