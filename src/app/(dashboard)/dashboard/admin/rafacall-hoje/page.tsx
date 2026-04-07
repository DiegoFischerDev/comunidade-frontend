'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type SchedulePayload = Awaited<ReturnType<typeof api.admin.rafacall.schedule>>;
type BlocksPayload = Awaited<ReturnType<typeof api.admin.rafacall.blocks>>;

function ymdInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

function prettyYmdPt(ymd: string, timeZone: string): string {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return ymd;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const utcMidday = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  return utcMidday.toLocaleDateString('pt-PT', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function formatSlotTimeInTz(utcIso: string, timeZone: string): string {
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('pt-PT', { timeZone, hour: '2-digit', minute: '2-digit' });
}

function waUrl(digits: string, leadName: string, startsAtIso: string, tz: string): string {
  const d = new Date(startsAtIso);
  const day = d.toLocaleDateString('pt-PT', {
    timeZone: tz,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
  const hour = d.toLocaleTimeString('pt-PT', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
  });
  const name = (leadName || '').trim() || '!';
  const text = `Oi ${name}, em relação ao nosso agendamento no ${day} às ${hour}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export default function AdminRafaCallHojePage() {
  const { user } = useAuth();
  const [data, setData] = useState<SchedulePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const tz = useMemo(() => 'Europe/Lisbon', []);

  const [blocks, setBlocks] = useState<BlocksPayload['blocks']>([]);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blocksError, setBlocksError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availability, setAvailability] = useState<
    Awaited<ReturnType<typeof api.rafacall.availability>> | null
  >(null);
  const [schedLoading, setSchedLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.admin.rafacall.schedule(tz);
      setData(res);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, [tz]);

  const loadBlocksAndAvailability = useCallback(async () => {
    setBlocksLoading(true);
    setBlocksError('');
    setSchedLoading(true);
    try {
      const from = ymdInTz(new Date(), tz);
      const to = ymdInTz(addDays(new Date(), 14), tz);

      const fromUtcIso = new Date().toISOString();
      const toUtcIso = addDays(new Date(), 14).toISOString();

      const [b, avail] = await Promise.all([
        api.admin.rafacall.blocks({ fromUtcIso, toUtcIso }),
        api.rafacall.availability({ from, to, tz }),
      ]);

      setBlocks(b.blocks);
      setAvailability(avail);
      const firstDayWithSlots = avail.days.find((d) => d.slots.length > 0)?.date ?? '';
      const firstAnyDay = avail.days[0]?.date ?? '';
      setSelectedDate(firstDayWithSlots || firstAnyDay);
    } catch (e) {
      setBlocks([]);
      setAvailability(null);
      setBlocksError(e instanceof Error ? e.message : 'Erro ao carregar bloqueios/horários.');
    } finally {
      setBlocksLoading(false);
      setSchedLoading(false);
    }
  }, [tz]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    void load();
    void loadBlocksAndAvailability();
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
          <h1 className="text-2xl font-semibold text-zinc-900">Agendamentos (Rafa Call)</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Agrupado por dia em <span className="font-medium">{tz}</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void load();
            void loadBlocksAndAvailability();
          }}
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

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Bloquear horários</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Marca slots como ocupados para eles não aparecerem para o lead.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadBlocksAndAvailability()}
            disabled={blocksLoading || schedLoading}
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
          >
            {blocksLoading || schedLoading ? 'A carregar…' : 'Atualizar bloqueios'}
          </button>
        </div>

        {blocksError ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {blocksError}
          </p>
        ) : null}

        <div className="mt-4 grid gap-6 md:grid-cols-[260px_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Dias</p>
            {!availability ? (
              <p className="mt-3 text-sm text-zinc-600">A carregar…</p>
            ) : availability.days.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-600">Sem dias disponíveis.</p>
            ) : (
              <div className="mt-3 max-h-[360px] space-y-2 overflow-auto pr-1">
                {availability.days.map((d) => {
                  const isActive = d.date === selectedDate;
                  const hasSlots = d.slots.length > 0;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => setSelectedDate(d.date)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? 'border-[#efc2c1] bg-[#efc2c1]/40'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50'
                      } ${!hasSlots ? 'opacity-70' : ''}`}
                    >
                      <span className="font-medium text-zinc-900">{prettyYmdPt(d.date, tz)}</span>
                      <span className="text-xs text-zinc-600">{d.slots.length} horários</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Horários</p>
            {schedLoading ? (
              <p className="mt-3 text-sm text-zinc-600">A carregar…</p>
            ) : !availability ? (
              <p className="mt-3 text-sm text-zinc-600">Não foi possível carregar horários.</p>
            ) : (
              (() => {
                const day = availability.days.find((d) => d.date === selectedDate);
                const slots = day?.slots ?? [];
                if (!day) {
                  return <p className="mt-3 text-sm text-zinc-600">Escolhe um dia.</p>;
                }
                if (slots.length === 0) {
                  return (
                    <p className="mt-3 text-sm text-zinc-600">
                      Este dia não tem horários disponíveis (talvez já estejam todos ocupados).
                    </p>
                  );
                }

                const blockedByStart = new Map(blocks.map((b) => [b.startsAt, b]));

                return (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {slots.map((s) => {
                      const isBlocked = blockedByStart.has(s.startsAt);
                      return (
                        <button
                          key={s.startsAt}
                          type="button"
                          disabled={schedLoading}
                          onClick={async () => {
                            setSchedLoading(true);
                            setBlocksError('');
                            try {
                              if (isBlocked) {
                                const b = blockedByStart.get(s.startsAt);
                                if (b) await api.admin.rafacall.deleteBlock(b.id);
                              } else {
                                await api.admin.rafacall.createBlock({
                                  startsAtUtcIso: s.startsAt,
                                  endsAtUtcIso: s.endsAt,
                                  reason: 'admin_block',
                                });
                              }
                              await loadBlocksAndAvailability();
                            } catch (e) {
                              setBlocksError(
                                e instanceof Error ? e.message : 'Erro ao atualizar bloqueio.',
                              );
                            } finally {
                              setSchedLoading(false);
                            }
                          }}
                          className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                            isBlocked
                              ? 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100'
                              : 'border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50'
                          }`}
                          title={s.startsAt}
                        >
                          {formatSlotTimeInTz(s.startsAt, tz)}
                          <span className="mt-0.5 block text-[11px] font-medium">
                            {isBlocked ? 'Ocupado' : 'Livre'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </div>

      {data && data.days.length === 0 && !loading ? (
        <p className="mt-6 text-sm text-zinc-600">Nenhum agendamento.</p>
      ) : null}

      {data && data.days.length > 0 ? (
        <div className="mt-6 space-y-6">
          {data.days.map((day) => (
            <div key={day.date} className="rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3">
                <p className="text-sm font-semibold text-zinc-900">
                  {new Date(`${day.date}T12:00:00.000Z`).toLocaleDateString('pt-PT', {
                    timeZone: tz,
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-xs text-zinc-600">{day.items.length} agendamentos</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-zinc-200 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    <tr>
                      <th className="px-4 py-3">Horário (Lisboa)</th>
                      <th className="px-4 py-3">Lead</th>
                      <th className="px-4 py-3 w-40">WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {day.items.map((row) => {
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
                              href={waUrl(row.whatsappDigits, row.userName, row.startsAt, tz)}
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
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

