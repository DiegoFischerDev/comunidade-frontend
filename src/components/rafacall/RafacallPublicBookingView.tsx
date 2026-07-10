'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import {
  clearRafacallGuestBooking,
  getOrCreateRafacallDeviceId,
  saveRafacallGuestBooking,
} from '@/lib/rafacall-guest-storage';

type AvailabilityPayload = Awaited<ReturnType<typeof api.rafacall.guestAvailability>>;
type PublicBooking = {
  id: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
  startsAt: string;
  endsAt: string;
  timezone: string;
  name: string | null;
  whatsapp: string | null;
  origin: 'USER_PAID' | 'PUBLIC_FREE';
};
type PublicState = Awaited<ReturnType<typeof api.rafacall.publicState>>;

type Screen =
  | 'loading'
  | 'error'
  | 'name'
  | 'picker'
  | 'manage_detail'
  | 'manage_reschedule'
  | 'manage_cancel';

type Props = {
  whatsappFromUrl: string;
  namePrefill?: string;
};

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

function applyPublicState(
  state: PublicState,
  setBooking: (b: PublicBooking | null) => void,
  setScreen: (s: Screen) => void,
  setWhatsappDigits: (w: string) => void,
  setAuthMode: (m: 'device' | 'whatsapp') => void,
) {
  if (state.mode === 'book') {
    setWhatsappDigits(state.whatsapp);
    setAuthMode('device');
    setScreen('name');
    return;
  }

  setBooking(state.booking);
  setWhatsappDigits(state.booking.whatsapp ?? '');
  setAuthMode(state.access);
  saveRafacallGuestBooking({
    bookingId: state.booking.id,
    startsAt: state.booking.startsAt,
    endsAt: state.booking.endsAt,
    timezone: state.booking.timezone,
    name: state.booking.name ?? '',
    whatsapp: state.booking.whatsapp ?? '',
  });
  setScreen('manage_detail');
}

export function RafacallPublicBookingView({ whatsappFromUrl, namePrefill = '' }: Props) {
  const tz = useMemo(() => resolvedUserTz(), []);
  const deviceId = useMemo(() => getOrCreateRafacallDeviceId(), []);

  const [screen, setScreen] = useState<Screen>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [whatsappDigits, setWhatsappDigits] = useState(whatsappFromUrl.replace(/\D/g, ''));
  const [name, setName] = useState(namePrefill.trim());
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [authMode, setAuthMode] = useState<'device' | 'whatsapp'>('device');
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadPublicState = useCallback(async () => {
    const wa = whatsappFromUrl.replace(/\D/g, '');
    if (wa.length < 8) {
      setErrorMessage('Indica um número de WhatsApp válido com indicativo do país (ex.: 351999999999).');
      setScreen('error');
      return;
    }
    if (!deviceId) {
      setErrorMessage('Não foi possível identificar este dispositivo. Tenta noutro browser.');
      setScreen('error');
      return;
    }
    setScreen('loading');
    setErrorMessage('');
    try {
      const state = await api.rafacall.publicState({ whatsapp: wa, deviceId });
      applyPublicState(state, setBooking, setScreen, setWhatsappDigits, setAuthMode);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : 'Não foi possível carregar o agendamento.');
      setScreen('error');
    }
  }, [whatsappFromUrl, deviceId]);

  useEffect(() => {
    void loadPublicState();
  }, [loadPublicState]);

  const loadAvailability = useCallback(
    async (excludeBookingId?: string) => {
      setActionLoading(true);
      setActionError('');
      try {
        const from = ymdInTz(new Date(), tz);
        const to = ymdInTz(addDays(new Date(), 14), tz);
        const avail = await api.rafacall.guestAvailability({
          from,
          to,
          tz,
          excludeBookingId,
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
    },
    [tz],
  );

  const goToPicker = useCallback(() => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setActionError('Indica o teu nome para continuar.');
      return;
    }
    setActionError('');
    setScreen('picker');
    void loadAvailability();
  }, [name, loadAvailability]);

  const doBook = useCallback(
    async (startsAtUtcIso: string) => {
      if (!deviceId) return;
      setActionLoading(true);
      setActionError('');
      try {
        const created = await api.rafacall.publicBook({
          name: name.trim(),
          whatsapp: whatsappDigits,
          deviceId,
          startsAtUtcIso,
          tz,
        });
        setBooking(created);
        setAuthMode('device');
        saveRafacallGuestBooking({
          bookingId: created.id,
          startsAt: created.startsAt,
          endsAt: created.endsAt,
          timezone: created.timezone,
          name: created.name ?? name.trim(),
          whatsapp: created.whatsapp ?? whatsappDigits,
        });
        setScreen('manage_detail');
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Não foi possível agendar.');
      } finally {
        setActionLoading(false);
      }
    },
    [deviceId, name, whatsappDigits, tz],
  );

  const doReschedule = useCallback(
    async (startsAtUtcIso: string) => {
      if (!booking) return;
      setActionLoading(true);
      setActionError('');
      try {
        const updated = await api.rafacall.guestReschedule({
          bookingId: booking.id,
          ...(authMode === 'device' && deviceId ? { deviceId } : { whatsapp: whatsappDigits }),
          newStartsAtUtcIso: startsAtUtcIso,
          tz,
        });
        const nextBooking: PublicBooking = {
          id: updated.id,
          status: updated.status,
          startsAt: updated.startsAt,
          endsAt: updated.endsAt,
          timezone: updated.timezone,
          name: updated.name,
          whatsapp: updated.whatsapp,
          origin: updated.origin ?? booking.origin,
        };
        setBooking(nextBooking);
        saveRafacallGuestBooking({
          bookingId: nextBooking.id,
          startsAt: nextBooking.startsAt,
          endsAt: nextBooking.endsAt,
          timezone: nextBooking.timezone,
          name: nextBooking.name ?? '',
          whatsapp: nextBooking.whatsapp ?? whatsappDigits,
        });
        setScreen('manage_detail');
      } catch (e) {
        setActionError(e instanceof Error ? e.message : 'Não foi possível reagendar.');
      } finally {
        setActionLoading(false);
      }
    },
    [booking, authMode, deviceId, tz, whatsappDigits],
  );

  const doCancel = useCallback(async () => {
    if (!booking) return;
    setActionLoading(true);
    setActionError('');
    try {
      await api.rafacall.guestCancel({
        bookingId: booking.id,
        ...(authMode === 'device' && deviceId ? { deviceId } : { whatsapp: whatsappDigits }),
        reason: 'user_cancel',
      });
      clearRafacallGuestBooking();
      setBooking({ ...booking, status: 'CANCELLED' });
      setScreen('manage_detail');
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível cancelar.');
    } finally {
      setActionLoading(false);
    }
  }, [booking, authMode, deviceId, whatsappDigits]);

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

  const slotPicker = (
    <div className="mt-6 grid gap-6 md:grid-cols-[260px_1fr]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Dias</p>
        {!availability ? (
          <p className="mt-3 text-sm text-muted">A carregar…</p>
        ) : availability.days.filter(
            (d) => d.slots.length > 0 || (d.adminBlockedSlots?.length ?? 0) > 0,
          ).length === 0 ? (
          <p className="mt-3 text-sm text-muted">
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
                    disabled={actionLoading}
                    onClick={() => setSelectedDate(d.date)}
                    className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? 'border-emerald-400 bg-emerald-50'
                        : 'border-border bg-card hover:bg-page'
                    }`}
                  >
                    <span className="font-medium text-foreground">{prettyYmdPt(d.date, tz)}</span>
                    <span className="text-xs text-muted">{sub}</span>
                  </button>
                );
              })}
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Horários de {prettyTimezoneCityLabel(tz)}
        </p>
        {actionLoading && !availability ? (
          <p className="mt-3 text-sm text-muted">A carregar…</p>
        ) : daySlotGrid.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Escolhe um dia na lista ao lado.</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {daySlotGrid.map((s) =>
              s.kind === 'free' ? (
                <button
                  key={s.startsAt}
                  type="button"
                  disabled={actionLoading}
                  onClick={() =>
                    void (screen === 'manage_reschedule' ? doReschedule(s.startsAt) : doBook(s.startsAt))
                  }
                  className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-emerald-50 disabled:opacity-50"
                >
                  {formatSlotTimeInTz(s.startsAt, tz)}
                </button>
              ) : (
                <div
                  key={s.startsAt}
                  className="rounded-xl border border-border bg-primary-1 px-3 py-2 text-center text-sm font-semibold text-muted"
                >
                  <span className="block">{formatSlotTimeInTz(s.startsAt, tz)}</span>
                  <span className="text-xs font-normal">Bloqueado</span>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </div>
  );

  if (screen === 'loading') {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-sm text-muted">A preparar o agendamento…</p>
      </div>
    );
  }

  if (screen === 'error') {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-sm text-red-700">{errorMessage}</p>
      </div>
    );
  }

  if (screen === 'name') {
    return (
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="rounded-2xl bg-card p-6 shadow-sm">
          <h1 className="text-xl font-bold text-foreground">Agendar com a Rafa &amp; Carol</h1>
          <p className="mt-2 text-sm text-foreground/90">
            Videochamada gratuita. Indica o teu nome e escolhe o melhor horário para ti.
          </p>
          {actionError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {actionError}
            </p>
          ) : null}
          <label className="mt-6 block text-sm font-medium text-foreground" htmlFor="rafacall-public-name">
            O teu nome
          </label>
          <input
            id="rafacall-public-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Como te devemos chamar?"
            className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-3 text-sm text-foreground outline-none focus:border-brand-primary"
            autoComplete="name"
          />
          <button
            type="button"
            onClick={goToPicker}
            className="mt-6 w-full rounded-full bg-brand-primary px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            Ver horários disponíveis
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'picker') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl bg-card p-6 shadow-sm">
          <h1 className="text-xl font-bold text-foreground">Escolhe data e hora</h1>
          <p className="mt-1 text-sm text-foreground/90">
            Olá, <span className="font-semibold">{name.trim()}</span>. Os horários abaixo estão no teu
            fuso horário ({prettyTimezoneCityLabel(tz)}).
          </p>
          {actionError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {actionError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setScreen('name')}
            className="mt-4 text-sm text-muted underline hover:text-foreground"
          >
            Voltar ao nome
          </button>
          {slotPicker}
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <p className="text-sm text-muted">A carregar…</p>
      </div>
    );
  }

  const isCancelled = booking.status !== 'SCHEDULED';
  const display = formatBookingFullPt(booking.startsAt, booking.endsAt, booking.timezone || tz);

  if (screen === 'manage_reschedule') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold text-foreground">Reagendar</h1>
            <button
              type="button"
              onClick={() => setScreen('manage_detail')}
              className="rounded-full px-3 py-1.5 text-sm text-muted hover:bg-primary-1"
            >
              Voltar
            </button>
          </div>
          {actionError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {actionError}
            </p>
          ) : null}
          {slotPicker}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page py-8">
      <div className="mx-auto max-w-3xl px-4">
        <div className="rounded-2xl bg-card p-6 shadow-sm">
          <h1 className="text-xl font-bold text-foreground">O teu agendamento com a Rafa &amp; Carol</h1>
          {booking.name ? (
            <p className="mt-1 text-sm text-foreground/90">
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
              isCancelled ? 'border-border bg-page' : 'border-emerald-200 bg-emerald-50'
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {isCancelled ? 'Cancelado' : 'Confirmado'}
            </p>
            <p className="mt-1 text-base font-semibold capitalize text-foreground">{display.main}</p>
            <p className="mt-0.5 text-xs text-muted">
              {display.sub} · Fuso: {prettyTimezoneCityLabel(booking.timezone || tz)} ({booking.timezone || tz})
            </p>
          </div>

          {isCancelled ? (
            <div className="mt-6 space-y-3">
              <p className="text-sm text-foreground/90">
                Este agendamento foi cancelado. Podes marcar uma nova chamada quando quiseres.
              </p>
              <button
                type="button"
                onClick={() => void loadPublicState()}
                className="rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Agendar novamente
              </button>
            </div>
          ) : screen === 'manage_cancel' ? (
            <div className="mt-6 rounded-xl border border-border bg-page p-4">
              <p className="text-sm text-foreground">Queres mesmo cancelar este agendamento?</p>
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
                  onClick={() => setScreen('manage_detail')}
                  disabled={actionLoading}
                  className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-page disabled:opacity-50"
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setScreen('manage_reschedule');
                  void loadAvailability(booking.id);
                }}
                className="rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Reagendar
              </button>
              <button
                type="button"
                onClick={() => setScreen('manage_cancel')}
                className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-page"
              >
                Cancelar
              </button>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-muted">
            <Link href="/" className="underline hover:text-foreground/90">
              Voltar à comunidade
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
