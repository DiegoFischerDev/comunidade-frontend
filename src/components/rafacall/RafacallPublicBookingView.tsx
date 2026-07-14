'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlagBr, FlagPt } from '@/components/CountryFlags';
import { ServicesSpecialistsImage } from '@/components/brand/ServicesSpecialistsImage';
import { api } from '@/lib/api';
import {
  LOGIN_COUNTRY_DIALS,
  parseFullDigitsToDialLocal,
} from '@/lib/login-phone-storage';
import {
  clearRafacallGuestBooking,
  getOrCreateRafacallDeviceId,
  readRafacallLastName,
  saveRafacallGuestBooking,
  saveRafacallLastName,
} from '@/lib/rafacall-guest-storage';
import { BRAND_LOGO_HORIZONTAL_COLORIDA, SITE_NAME_FULL } from '@/lib/site-branding';

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

function formatDayFreeSlotsLabel(
  slots: { startsAt: string }[],
  timeZone: string,
): string {
  if (slots.length === 0) return 'Sem horários livres';
  return slots.map((s) => formatSlotTimeInTz(s.startsAt, timeZone)).join(' | ');
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

function WhatsappDialFlag({ dial, className = 'h-6 w-6' }: { dial: string; className?: string }) {
  const imgClass = `shrink-0 object-contain [aspect-ratio:1/1] ${className}`;
  if (dial === '351') return <FlagPt className={imgClass} alt="" aria-hidden />;
  if (dial === '55') return <FlagBr className={imgClass} alt="" aria-hidden />;
  const preset = LOGIN_COUNTRY_DIALS.find((c) => c.dial === dial);
  if (preset) {
    return (
      <span className="text-2xl leading-none" aria-hidden>
        {preset.flag}
      </span>
    );
  }
  return (
    <span className="text-lg leading-none text-muted" aria-hidden>
      🌐
    </span>
  );
}

function CalendarRescheduleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
      <path d="M16 14h.01" />
      <path d="M12 14h.01" />
      <path d="M8 14h.01" />
      <path d="M7 18h10" />
    </svg>
  );
}

function CancelCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function AgendarBrandLogo() {
  return (
    <div className="mb-6 flex justify-center">
      <Image
        src={BRAND_LOGO_HORIZONTAL_COLORIDA}
        alt={SITE_NAME_FULL}
        width={480}
        height={120}
        className="h-auto w-[min(100%,14rem)] sm:w-52"
        priority
      />
    </div>
  );
}

export function RafacallPublicBookingView({ whatsappFromUrl, namePrefill = '' }: Props) {
  const tz = useMemo(() => resolvedUserTz(), []);
  const deviceId = useMemo(() => getOrCreateRafacallDeviceId(), []);

  const [screen, setScreen] = useState<Screen>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [whatsappDigits, setWhatsappDigits] = useState(whatsappFromUrl.replace(/\D/g, ''));

  const whatsappDisplay = useMemo(() => {
    const digits = whatsappDigits.replace(/\D/g, '');
    if (digits.length < 8) return null;
    const { dial, local } = parseFullDigitsToDialLocal(digits, LOGIN_COUNTRY_DIALS[0]!.dial);
    const preset = LOGIN_COUNTRY_DIALS.find((c) => c.dial === dial);
    return {
      dial,
      local,
      countryLabel: preset?.label ?? `DDI +${dial}`,
    };
  }, [whatsappDigits]);

  const [name, setName] = useState(namePrefill.trim());
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  const [authMode, setAuthMode] = useState<'device' | 'whatsapp'>('device');
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [pickerDayStep, setPickerDayStep] = useState<'days' | 'times'>('days');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (namePrefill.trim()) return;
    const saved = readRafacallLastName();
    if (saved) setName(saved);
  }, [namePrefill]);

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
    async (excludeBookingId?: string, options?: { autoSelectDay?: boolean }) => {
      const autoSelectDay = options?.autoSelectDay ?? true;
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
        if (autoSelectDay) {
          const firstFree = avail.days.find((d) => d.slots.length > 0)?.date;
          setSelectedDate(firstFree ?? '');
        } else {
          setSelectedDate('');
          setPickerDayStep('days');
        }
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
    saveRafacallLastName(trimmed);
    setActionError('');
    setPickerDayStep('days');
    setSelectedDate('');
    setScreen('picker');
    void loadAvailability(undefined, { autoSelectDay: false });
  }, [name, loadAvailability]);

  const doBook = useCallback(
    async (startsAtUtcIso: string) => {
      if (!deviceId) return;
      setActionLoading(true);
      setActionError('');
      try {
        const trimmedName = name.trim();
        saveRafacallLastName(trimmedName);
        const created = await api.rafacall.publicBook({
          name: trimmedName,
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
        const message = e instanceof Error ? e.message : 'Não foi possível agendar.';
        setActionError(message);
        if (/horário|disponível|bloqueado|ocupado/i.test(message)) {
          void loadAvailability(undefined, { autoSelectDay: false });
        }
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
      await loadPublicState();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Não foi possível cancelar.');
    } finally {
      setActionLoading(false);
    }
  }, [booking, authMode, deviceId, whatsappDigits, loadPublicState]);

  const daySlots = useMemo(() => {
    if (!availability || !selectedDate) return [];
    return availability.days.find((d) => d.date === selectedDate)?.slots ?? [];
  }, [availability, selectedDate]);

  const availableDays = useMemo(() => {
    if (!availability) return [];
    return availability.days.filter((d) => d.slots.length > 0);
  }, [availability]);

  const slotPicker = (() => {
    const isPickerWizard = screen === 'picker' || screen === 'manage_reschedule';
    const showDaysOnly = isPickerWizard && pickerDayStep === 'days';
    const showTimesOnly = isPickerWizard && pickerDayStep === 'times';

    const daysList = (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Dias</p>
        {!availability ? (
          <p className="mt-3 text-sm text-muted">A carregar…</p>
        ) : availableDays.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Sem dias com horários nos próximos dias. Tenta novamente mais tarde.
          </p>
        ) : (
          <div className={`mt-3 space-y-2 pr-1 ${showDaysOnly ? '' : 'max-h-[420px] overflow-auto'}`}>
            {availableDays.map((d) => {
              const isActive = d.date === selectedDate;
              const sub = formatDayFreeSlotsLabel(d.slots, tz);
              return (
                <button
                  key={d.date}
                  type="button"
                  disabled={actionLoading}
                  onClick={() => {
                    setSelectedDate(d.date);
                    if (isPickerWizard) setPickerDayStep('times');
                  }}
                  className={`flex w-full flex-col gap-1 rounded-xl border px-3 py-2 text-left text-sm transition-colors sm:flex-row sm:items-center sm:justify-between ${
                    isActive
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-border bg-card hover:bg-page'
                  }`}
                >
                  <span className="font-medium text-foreground">{prettyYmdPt(d.date, tz)}</span>
                  <span className="text-xs text-muted sm:text-right">{sub}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );

    const timesGrid = (
      <div>
        {showTimesOnly ? (
          <h2 className="text-lg font-bold leading-snug text-foreground sm:text-xl">
            Horários de {prettyTimezoneCityLabel(tz)}
            {selectedDate ? ` · ${prettyYmdPt(selectedDate, tz)}` : ''}
          </h2>
        ) : (
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Horários de {prettyTimezoneCityLabel(tz)}
            {selectedDate ? (
              <span className="normal-case tracking-normal text-foreground/80">
                {' '}
                · {prettyYmdPt(selectedDate, tz)}
              </span>
            ) : null}
          </p>
        )}
        {actionLoading && !availability ? (
          <p className="mt-3 text-sm text-muted">A carregar…</p>
        ) : daySlots.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            {showTimesOnly
              ? 'Sem horários disponíveis neste dia.'
              : 'Escolhe um dia na lista ao lado.'}
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {daySlots.map((s) => (
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
            ))}
          </div>
        )}
      </div>
    );

    if (showDaysOnly) {
      return <div className="mt-6">{daysList}</div>;
    }

    if (showTimesOnly) {
      return (
        <div className="mt-6 space-y-4">
          <button
            type="button"
            onClick={() => setPickerDayStep('days')}
            className="text-sm text-muted underline hover:text-foreground"
          >
            Voltar aos dias
          </button>
          {timesGrid}
        </div>
      );
    }

    return (
      <div className="mt-6 grid gap-6 md:grid-cols-[260px_1fr]">
        {daysList}
        {timesGrid}
      </div>
    );
  })();

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
        <AgendarBrandLogo />
        <div className="overflow-hidden rounded-2xl bg-card shadow-sm">
          <ServicesSpecialistsImage layout="modal" />
          <div className="p-6">
            <h1 className="text-xl font-bold text-foreground">Video chamada com Rafa &amp; Carol</h1>
            {whatsappDisplay ? (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-page px-3 py-2.5">
                <WhatsappDialFlag dial={whatsappDisplay.dial} />
                <div className="min-w-0">
                  <p className="text-xs text-muted">O teu WhatsApp</p>
                  <p className="text-sm font-semibold tabular-nums text-foreground">
                    +{whatsappDisplay.dial} {whatsappDisplay.local}
                  </p>
                  <p className="text-xs text-muted">{whatsappDisplay.countryLabel}</p>
                </div>
              </div>
            ) : null}
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-foreground/90">
              <p>
                Queremos muito te conhecer! Este agendamento é gratuito: vamos te explicar os
                detalhes do nosso serviço e entender o que você realmente precisa.
              </p>
              <p>
                Anote suas dúvidas e venha preparado(a) para esclarecer tudo que for possível.
              </p>
            </div>
            <p className="mt-4 inline-flex rounded-full bg-brand-primary/8 px-3 py-1 text-xs font-semibold text-brand-primary">
              Duração: 40 minutos
            </p>
            {actionError ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {actionError}
              </p>
            ) : null}
            <label className="mt-6 block text-sm font-medium text-foreground" htmlFor="rafacall-public-name">
              Indique seu nome
            </label>
            <input
              id="rafacall-public-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => saveRafacallLastName(name)}
              placeholder="Seu nome"
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
      </div>
    );
  }

  if (screen === 'picker') {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <AgendarBrandLogo />
        <div className="rounded-2xl bg-card p-6 shadow-sm">
          <h1 className="text-xl font-bold text-foreground">Escolhe data e hora</h1>
          <p className="mt-1 text-sm text-foreground/90">
            Olá, <span className="font-semibold">{name.trim()}</span>.
            {pickerDayStep === 'days'
              ? ' Escolhe um dia para ver os horários disponíveis.'
              : ` Horários no teu fuso horário (${prettyTimezoneCityLabel(tz)}).`}
          </p>
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
        <AgendarBrandLogo />
        <div className="rounded-2xl bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-foreground">Reagendar</h1>
              <p className="mt-1 text-sm text-foreground/90">
                Olá, <span className="font-semibold">{booking.name?.trim() || name.trim()}</span>.
                {pickerDayStep === 'days'
                  ? ' Escolhe um dia para ver os horários disponíveis.'
                  : ` Horários no teu fuso horário (${prettyTimezoneCityLabel(booking.timezone || tz)}).`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setScreen('manage_detail')}
              className="shrink-0 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-primary-1"
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
        <AgendarBrandLogo />
        <div className="rounded-2xl bg-card p-6 shadow-sm">
          {!isCancelled ? (
            <h1 className="text-xl font-bold leading-snug text-foreground">
              <span className="text-brand-primary">Tudo certo!</span> O teu agendamento com a Rafa
              &amp; Carol está confirmado
            </h1>
          ) : (
            <h1 className="text-xl font-bold text-foreground">O teu agendamento com a Rafa &amp; Carol</h1>
          )}

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

          {!isCancelled && screen !== 'manage_cancel' ? (
            <p className="mt-4 text-sm leading-relaxed text-foreground/90">
              No dia e horário agendado vamos te enviar o link da videochamada por aqui. Anote suas dúvidas e até já! 😊
            </p>
          ) : null}

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
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50/80 p-4">
              <div className="flex gap-3">
                <CancelCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-red-900">Queres mesmo cancelar este agendamento?</p>
                  <p className="mt-1 text-sm text-red-800/90">
                    Esta ação não pode ser desfeita. Depois podes marcar uma nova chamada quando quiseres.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void doCancel()}
                  disabled={actionLoading}
                  className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-red-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CancelCircleIcon className="h-5 w-5" />
                  {actionLoading ? 'A cancelar…' : 'Confirmar cancelamento'}
                </button>
                <button
                  type="button"
                  onClick={() => setScreen('manage_detail')}
                  disabled={actionLoading}
                  className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  Voltar
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
                Gerir agendamento
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setPickerDayStep('days');
                    setSelectedDate('');
                    setActionError('');
                    setScreen('manage_reschedule');
                    void loadAvailability(booking.id, { autoSelectDay: false });
                  }}
                  className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-[14px] border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-page"
                >
                  <CalendarRescheduleIcon className="h-5 w-5" />
                  Reagendar
                </button>
                <button
                  type="button"
                  onClick={() => setScreen('manage_cancel')}
                  className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-[14px] border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-800 transition-colors hover:border-red-300 hover:bg-red-100"
                >
                  <CancelCircleIcon className="h-5 w-5" />
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-center border-t border-border pt-6">
            <Link
              href="/"
              className="inline-flex w-full max-w-md cursor-pointer items-center justify-center gap-2.5 rounded-[14px] bg-brand-primary px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 sm:text-base"
            >
              <HomeIcon className="h-5 w-5" />
              Ir para o site
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
