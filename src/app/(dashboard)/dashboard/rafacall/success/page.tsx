'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import {
  rafacallGuestManageUrl,
  saveRafacallGuestBooking,
} from '@/lib/rafacall-guest-storage';

type AvailabilityPayload = Awaited<ReturnType<typeof api.rafacall.guestAvailability>>;

function resolvedUserTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Lisbon';
  } catch {
    return 'Europe/Lisbon';
  }
}

function ymdInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
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

function formatSlotTimeInTz(utcIso: string, timeZone: string): string {
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('pt-PT', { timeZone, hour: '2-digit', minute: '2-digit' });
}

function prettyTimezoneCityLabel(tz: string): string {
  const t = (tz || '').trim();
  if (!t) return 'Lisboa';
  const last = t.split('/').pop() || t;
  return last.replace(/_/g, ' ');
}

type ClaimState =
  | { kind: 'loading' }
  | { kind: 'ready'; unlockId: string; name: string; whatsapp: string }
  | { kind: 'error'; message: string };

export default function RafaCallPaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id')?.trim() ?? '';

  const [claim, setClaim] = useState<ClaimState>({ kind: 'loading' });
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [schedLoading, setSchedLoading] = useState(false);
  const [schedError, setSchedError] = useState('');

  const tz = useMemo(() => resolvedUserTz(), []);

  // 1) Claim do unlock no Stripe.
  useEffect(() => {
    let cancelled = false;
    if (!sessionId) {
      setClaim({ kind: 'error', message: 'Sessão de pagamento em falta.' });
      return;
    }
    async function run() {
      const maxAttempts = 12;
      for (let i = 0; i < maxAttempts; i++) {
        if (cancelled) return;
        try {
          const res = await api.stripe.claimGuestRafacallSession(sessionId);
          if (res.status === 'ready') {
            if (!cancelled) {
              setClaim({
                kind: 'ready',
                unlockId: res.unlockId,
                name: res.name,
                whatsapp: res.whatsapp,
              });
            }
            return;
          }
          if (res.status === 'consumed') {
            if (!cancelled) {
              setClaim({
                kind: 'error',
                message: 'Este pagamento já foi usado para um agendamento.',
              });
            }
            return;
          }
          if (res.status === 'expired') {
            if (!cancelled) {
              setClaim({ kind: 'error', message: 'Este pagamento expirou.' });
            }
            return;
          }
          if (res.status === 'invalid') {
            if (!cancelled) {
              setClaim({ kind: 'error', message: 'Sessão de pagamento inválida.' });
            }
            return;
          }
        } catch {
          // continua a tentar
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!cancelled) {
        setClaim({
          kind: 'error',
          message:
            'Não foi possível confirmar o pagamento. Verifica o WhatsApp ou tenta recarregar.',
        });
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // 2) Carrega disponibilidade após claim ok.
  useEffect(() => {
    if (claim.kind !== 'ready') return;
    let cancelled = false;
    setSchedLoading(true);
    const from = ymdInTz(new Date(), tz);
    const to = ymdInTz(addDays(new Date(), 14), tz);
    void api.rafacall
      .guestAvailability({ from, to, tz })
      .then((avail) => {
        if (cancelled) return;
        setAvailability(avail);
        const firstFree = avail.days.find((d) => d.slots.length > 0)?.date;
        const firstBlockedOnly = avail.days.find(
          (d) => d.slots.length === 0 && (d.adminBlockedSlots?.length ?? 0) > 0,
        )?.date;
        setSelectedDate(firstFree ?? firstBlockedOnly ?? avail.days[0]?.date ?? '');
      })
      .catch((e) => {
        if (!cancelled) {
          setSchedError(e instanceof Error ? e.message : 'Erro ao carregar horários.');
        }
      })
      .finally(() => {
        if (!cancelled) setSchedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [claim, tz]);

  const daySlots = useMemo(() => {
    if (!availability || !selectedDate) return [];
    return availability.days.find((d) => d.date === selectedDate)?.slots ?? [];
  }, [availability, selectedDate]);

  const dayAdminBlocked = useMemo(() => {
    if (!availability || !selectedDate) return [];
    return availability.days.find((d) => d.date === selectedDate)?.adminBlockedSlots ?? [];
  }, [availability, selectedDate]);

  const daySlotGrid = useMemo(() => {
    const free = daySlots.map((s) => ({ ...s, kind: 'free' as const }));
    const blocked = dayAdminBlocked.map((s) => ({ ...s, kind: 'admin_blocked' as const }));
    return [...free, ...blocked].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }, [daySlots, dayAdminBlocked]);

  const doBook = useCallback(
    async (startsAtUtcIso: string) => {
      if (claim.kind !== 'ready') return;
      setSchedLoading(true);
      setSchedError('');
      try {
        const created = await api.rafacall.guestBook({
          unlockId: claim.unlockId,
          startsAtUtcIso,
          tz,
        });
        saveRafacallGuestBooking({
          bookingId: created.id,
          startsAt: created.startsAt,
          endsAt: created.endsAt,
          timezone: created.timezone,
          name: claim.name,
          whatsapp: claim.whatsapp,
        });
        router.replace(rafacallGuestManageUrl(created.id));
      } catch (e) {
        setSchedError(e instanceof Error ? e.message : 'Não foi possível agendar.');
        setSchedLoading(false);
      }
    },
    [claim, tz, router],
  );

  if (claim.kind === 'loading') {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-sm text-zinc-600">A confirmar o pagamento e a preparar o agendamento…</p>
      </div>
    );
  }

  if (claim.kind === 'error') {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-sm text-red-700">{claim.message}</p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline"
        >
          Voltar ao dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-emerald-500 text-white">
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Pagamento confirmado</h1>
            <p className="mt-1 text-sm text-zinc-700">
              Olá, <span className="font-semibold">{claim.name}</span>. Escolhe abaixo a data e a
              hora da videochamada. Vamos enviar a confirmação para o WhatsApp{' '}
              <span className="font-medium">{claim.whatsapp}</span>.
            </p>
          </div>
        </div>
      </div>

      {schedError ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {schedError}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 md:grid-cols-[260px_1fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Dias</p>
          {!availability ? (
            <p className="mt-3 text-sm text-zinc-600">A carregar…</p>
          ) : availability.days.filter(
              (d) => d.slots.length > 0 || (d.adminBlockedSlots?.length ?? 0) > 0,
            ).length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">
              Sem dias com horários nos próximos dias. Tenta novamente mais tarde.
            </p>
          ) : (
            <div className="mt-3 max-h-[420px] space-y-2 overflow-auto pr-1">
              {availability.days
                .filter((d) => d.slots.length > 0 || (d.adminBlockedSlots?.length ?? 0) > 0)
                .map((d) => {
                  const isActive = d.date === selectedDate;
                  const nBlocked = d.adminBlockedSlots?.length ?? 0;
                  const sub =
                    d.slots.length > 0 && nBlocked > 0
                      ? `${d.slots.length} livres · ${nBlocked} bloq.`
                      : d.slots.length > 0
                        ? `${d.slots.length} livres`
                        : `${nBlocked} indisponível(is)`;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      disabled={schedLoading}
                      onClick={() => setSelectedDate(d.date)}
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                        isActive
                          ? 'border-emerald-400 bg-emerald-50'
                          : 'border-zinc-200 bg-white hover:bg-zinc-50'
                      }`}
                    >
                      <span className="font-medium text-zinc-900">{prettyYmdPt(d.date, tz)}</span>
                      <span className="text-xs text-zinc-600">{sub}</span>
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Horários de {prettyTimezoneCityLabel(tz)}
          </p>
          {schedLoading && !availability ? (
            <p className="mt-3 text-sm text-zinc-600">A carregar…</p>
          ) : !availability ? (
            <p className="mt-3 text-sm text-zinc-600">
              Não foi possível carregar os horários.
            </p>
          ) : daySlotGrid.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-600">Escolhe um dia na lista ao lado.</p>
          ) : (
            <>
              {daySlots.length === 0 && dayAdminBlocked.length > 0 ? (
                <p className="mt-1 text-xs text-zinc-500">
                  Neste dia só há horários bloqueados pela equipa no teu fuso horário.
                </p>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {daySlotGrid.map((s) =>
                  s.kind === 'free' ? (
                    <button
                      key={s.startsAt}
                      type="button"
                      disabled={schedLoading}
                      onClick={() => void doBook(s.startsAt)}
                      className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-emerald-50 disabled:opacity-50"
                      title={s.startsAt}
                    >
                      {formatSlotTimeInTz(s.startsAt, tz)}
                    </button>
                  ) : (
                    <div
                      key={s.startsAt}
                      className="rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-center text-sm font-semibold text-zinc-500"
                      title="Bloqueado pela equipa"
                    >
                      <span className="block">{formatSlotTimeInTz(s.startsAt, tz)}</span>
                      <span className="mt-0.5 block text-[11px] font-medium normal-case text-zinc-500">
                        Bloqueado
                      </span>
                    </div>
                  ),
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <p className="mt-8 text-center">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
        >
          Voltar ao dashboard
        </Link>
      </p>
    </div>
  );
}
