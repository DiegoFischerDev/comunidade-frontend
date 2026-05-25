'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoginWhatsappFields } from '@/components/auth/LoginWhatsappFields';
import { api } from '@/lib/api';
import {
  readRafacallGuestBooking,
  saveRafacallGuestBooking,
  clearRafacallGuestBooking,
} from '@/lib/rafacall-guest-storage';

type AvailabilityPayload = Awaited<ReturnType<typeof api.rafacall.guestAvailability>>;
type GuestBooking = Awaited<ReturnType<typeof api.rafacall.guestBooking>>;

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

function formatBookingFullPt(startsAtIso: string, endsAtIso: string, timeZone: string): {
  main: string;
  sub: string;
} {
  const start = new Date(startsAtIso);
  const end = new Date(endsAtIso);
  const main = start.toLocaleString('pt-PT', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const sub = `Até às ${end.toLocaleTimeString('pt-PT', { timeZone, hour: '2-digit', minute: '2-digit' })}`;
  return { main, sub };
}

type Props = { bookingId: string };

type View = 'confirm' | 'detail' | 'reschedule' | 'cancel';

export function RafacallManageView({ bookingId }: Props) {
  const tz = useMemo(() => resolvedUserTz(), []);

  const [whatsapp, setWhatsapp] = useState('');
  const [whatsappError, setWhatsappError] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [booking, setBooking] = useState<GuestBooking | null>(null);
  const [view, setView] = useState<View>('confirm');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Auto-preenche WhatsApp se já o tivermos guardado neste dispositivo.
  useEffect(() => {
    const stored = readRafacallGuestBooking();
    if (stored && stored.bookingId === bookingId) {
      setWhatsapp(stored.whatsapp);
    }
  }, [bookingId]);

  const submitConfirm = useCallback(async () => {
    if (confirmLoading) return;
    const wa = whatsapp.replace(/\D/g, '');
    if (wa.length < 8) {
      setWhatsappError('WhatsApp inválido.');
      return;
    }
    setWhatsappError('');
    setConfirmLoading(true);
    try {
      const b = await api.rafacall.guestBooking(bookingId, wa);
      setBooking(b);
      setConfirmed(true);
      setView('detail');
      if (b.name) {
        saveRafacallGuestBooking({
          bookingId: b.id,
          startsAt: b.startsAt,
          endsAt: b.endsAt,
          timezone: b.timezone,
          name: b.name,
          whatsapp: wa,
        });
      }
    } catch (e) {
      setWhatsappError(e instanceof Error ? e.message : 'Não foi possível verificar o WhatsApp.');
    } finally {
      setConfirmLoading(false);
    }
  }, [bookingId, whatsapp, confirmLoading]);

  const loadAvailability = useCallback(async () => {
    if (!booking) return;
    setActionLoading(true);
    setActionError('');
    try {
      const from = ymdInTz(new Date(), tz);
      const to = ymdInTz(addDays(new Date(), 14), tz);
      const avail = await api.rafacall.guestAvailability({
        from,
        to,
        tz,
        excludeBookingId: booking.id,
      });
      setAvailability(avail);
      const firstFree = avail.days.find((d) => d.slots.length > 0)?.date;
      const firstBlockedOnly = avail.days.find(
        (d) => d.slots.length === 0 && (d.adminBlockedSlots?.length ?? 0) > 0,
      )?.date;
      setSelectedDate(firstFree ?? firstBlockedOnly ?? avail.days[0]?.date ?? '');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erro ao carregar horários.');
    } finally {
      setActionLoading(false);
    }
  }, [booking, tz]);

  const openReschedule = useCallback(() => {
    setView('reschedule');
    void loadAvailability();
  }, [loadAvailability]);

  const doReschedule = useCallback(
    async (startsAtUtcIso: string) => {
      if (!booking) return;
      setActionLoading(true);
      setActionError('');
      try {
        const updated = await api.rafacall.guestReschedule({
          bookingId: booking.id,
          whatsapp: whatsapp.replace(/\D/g, ''),
          newStartsAtUtcIso: startsAtUtcIso,
          tz,
        });
        setBooking(updated);
        saveRafacallGuestBooking({
          bookingId: updated.id,
          startsAt: updated.startsAt,
          endsAt: updated.endsAt,
          timezone: updated.timezone,
          name: updated.name ?? booking.name ?? '',
          whatsapp: whatsapp.replace(/\D/g, ''),
        });
        // Se foi gerado um novo bookingId, atualizar a URL.
        if (updated.id !== booking.id && typeof window !== 'undefined') {
          window.history.replaceState({}, '', `/agendamento/${updated.id}`);
        }
        setView('detail');
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Não foi possível reagendar.');
      } finally {
        setActionLoading(false);
      }
    },
    [booking, whatsapp, tz],
  );

  const doCancel = useCallback(async () => {
    if (!booking) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.rafacall.guestCancel({
        bookingId: booking.id,
        whatsapp: whatsapp.replace(/\D/g, ''),
        reason: 'user_cancel',
      });
      clearRafacallGuestBooking();
      setBooking({ ...booking, status: 'CANCELLED' });
      setView('detail');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível cancelar.');
    } finally {
      setActionLoading(false);
    }
  }, [booking, whatsapp]);

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

  // ===== Render =====

  if (!confirmed) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] py-8">
        <div className="mx-auto max-w-md px-4">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-zinc-900">Gerir agendamento</h1>
            <p className="mt-2 text-sm text-zinc-700">
              Para alterar ou cancelar o teu agendamento com a Rafa, confirma o número de WhatsApp
              que usaste no agendamento.
            </p>
            <div className="mt-4">
              <LoginWhatsappFields
                idPrefix="rafacall-manage"
                label="WhatsApp"
                value={whatsapp}
                error={whatsappError}
                onChange={(v) => {
                  setWhatsapp(v);
                  if (whatsappError) setWhatsappError('');
                }}
                disabled={confirmLoading}
              />
            </div>
            <button
              type="button"
              onClick={() => void submitConfirm()}
              disabled={confirmLoading}
              className="mt-4 w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {confirmLoading ? 'A verificar…' : 'Confirmar e abrir agendamento'}
            </button>
            <p className="mt-4 text-center text-xs text-zinc-500">
              <Link href="/dashboard" className="underline hover:text-zinc-700">
                Voltar à comunidade
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-sm text-zinc-600">A carregar…</p>
      </div>
    );
  }

  const isCancelled = booking.status !== 'SCHEDULED';
  const display = formatBookingFullPt(booking.startsAt, booking.endsAt, booking.timezone || tz);

  return (
    <div className="min-h-screen bg-[#f3f4f6] py-8">
      <div className="mx-auto max-w-3xl px-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-zinc-900">Meu agendamento com a Rafa</h1>
          {booking.name ? (
            <p className="mt-1 text-sm text-zinc-700">
              Olá, <span className="font-semibold">{booking.name}</span>.
            </p>
          ) : null}

          {actionError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {actionError}
            </p>
          ) : null}

          <div
            className={`mt-4 rounded-xl border px-4 py-3 ${
              isCancelled
                ? 'border-zinc-200 bg-zinc-50'
                : 'border-emerald-200 bg-emerald-50'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
              {isCancelled ? 'Cancelado' : 'Confirmado'}
            </p>
            <p className="mt-1 text-base font-semibold capitalize text-zinc-900">{display.main}</p>
            <p className="mt-0.5 text-xs text-zinc-600">
              {display.sub} · Fuso: {prettyTimezoneCityLabel(booking.timezone || tz)} (
              {booking.timezone || tz})
            </p>
          </div>

          {isCancelled ? (
            <p className="mt-6 text-sm text-zinc-700">
              Este agendamento foi cancelado. Para marcar uma nova chamada, volta ao dashboard.
            </p>
          ) : view === 'detail' ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openReschedule}
                className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
              >
                Reagendar
              </button>
              <button
                type="button"
                onClick={() => setView('cancel')}
                className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
              >
                Cancelar
              </button>
            </div>
          ) : null}

          {view === 'cancel' && !isCancelled ? (
            <div className="mt-6 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm text-zinc-800">
                Queres mesmo cancelar este agendamento? Vais poder agendar de novo a partir do
                dashboard (com nova taxa).
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void doCancel()}
                  disabled={actionLoading}
                  className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? 'A cancelar…' : 'Confirmar cancelamento'}
                </button>
                <button
                  type="button"
                  onClick={() => setView('detail')}
                  disabled={actionLoading}
                  className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : null}

          {view === 'reschedule' && !isCancelled ? (
            <div className="mt-6">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-900">Escolhe novo horário</p>
                <button
                  type="button"
                  onClick={() => setView('detail')}
                  className="rounded-full px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
                >
                  Voltar
                </button>
              </div>
              <div className="mt-4 grid gap-6 md:grid-cols-[260px_1fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    Dias
                  </p>
                  {!availability ? (
                    <p className="mt-3 text-sm text-zinc-600">A carregar…</p>
                  ) : availability.days.filter(
                      (d) => d.slots.length > 0 || (d.adminBlockedSlots?.length ?? 0) > 0,
                    ).length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-600">
                      Sem dias com horários disponíveis.
                    </p>
                  ) : (
                    <div className="mt-3 max-h-[420px] space-y-2 overflow-auto pr-1">
                      {availability.days
                        .filter(
                          (d) =>
                            d.slots.length > 0 || (d.adminBlockedSlots?.length ?? 0) > 0,
                        )
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
                              disabled={actionLoading}
                              onClick={() => setSelectedDate(d.date)}
                              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                                isActive
                                  ? 'border-emerald-400 bg-emerald-50'
                                  : 'border-zinc-200 bg-white hover:bg-zinc-50'
                              }`}
                            >
                              <span className="font-medium text-zinc-900">
                                {prettyYmdPt(d.date, tz)}
                              </span>
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
                  {actionLoading && !availability ? (
                    <p className="mt-3 text-sm text-zinc-600">A carregar…</p>
                  ) : daySlotGrid.length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-600">
                      Escolhe um dia na lista ao lado.
                    </p>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {daySlotGrid.map((s) =>
                        s.kind === 'free' ? (
                          <button
                            key={s.startsAt}
                            type="button"
                            disabled={actionLoading}
                            onClick={() => void doReschedule(s.startsAt)}
                            className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-emerald-50 disabled:opacity-50"
                          >
                            {formatSlotTimeInTz(s.startsAt, tz)}
                          </button>
                        ) : (
                          <div
                            key={s.startsAt}
                            className="rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-center text-sm font-semibold text-zinc-500"
                          >
                            <span className="block">{formatSlotTimeInTz(s.startsAt, tz)}</span>
                            <span className="mt-0.5 block text-[11px] font-medium normal-case text-zinc-500">
                              Bloqueado
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <p className="mt-8 text-center text-xs text-zinc-500">
            <Link href="/dashboard" className="underline hover:text-zinc-700">
              Voltar à comunidade
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
