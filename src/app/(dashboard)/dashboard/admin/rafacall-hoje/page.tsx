'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type TodayPayload = Awaited<ReturnType<typeof api.admin.rafacall.today>>;

function waUrl(digits: string, leadName: string): string {
  const text = `Olá ${leadName.trim() || '!'}\n\nFalo em relação à chamada agendada connosco hoje na Comunidade RPM.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export default function AdminRafaCallHojePage() {
  const { user } = useAuth();
  const [data, setData] = useState<TodayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const tz = useMemo(() => 'Europe/Lisbon', []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.rafacall.today(tz);
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, [tz]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    void load();
  }, [user, load]);

  if (!user) return null;

  if (user.role !== 'ADMIN') {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Agendamentos (Rafa Call)</h1>
        <p className="mt-2 text-sm text-zinc-600">Sem permissão para esta página.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Agendamentos de hoje (Rafa Call)</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Dia civil em <span className="font-medium">{tz}</span>.
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

      {data && data.items.length === 0 && !loading ? (
        <p className="mt-6 text-sm text-zinc-600">Nenhum agendamento para hoje.</p>
      ) : null}

      {data && data.items.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-4 py-3">Horário (Lisboa)</th>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3 w-40">WhatsApp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {data.items.map((row) => {
                const start = new Date(row.startsAt);
                const end = new Date(row.endsAt);
                const slot = `${start.toLocaleTimeString('pt-PT', { timeZone: tz, hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString('pt-PT', { timeZone: tz, hour: '2-digit', minute: '2-digit' })}`;
                return (
                  <tr key={row.id} className="text-zinc-800">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-900">
                      {slot}
                      <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                        tz do lead: {row.bookingTimezone}
                      </span>
                    </td>
                    <td className="px-4 py-3">{row.userName}</td>
                    <td className="px-4 py-3">
                      <a
                        href={waUrl(row.whatsappDigits, row.userName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#20BD5A]"
                      >
                        Abrir chat
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

