'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import {
  OPEN_RAFA_CALL_SCHEDULE_EVENT,
  RAFA_CALL_CHECKOUT_PATH,
} from '@/lib/auth-ui-events';
import { CardButton } from '@/components/ui/CardButton';
import { ModalPortal } from '@/components/ui/ModalPortal';
import {
  rafacallGuestManageUrl,
  readRafacallGuestBooking,
  type RafacallGuestBookingStored,
} from '@/lib/rafacall-guest-storage';

type RafacallStatusPayload = Awaited<ReturnType<typeof api.rafacall.status>>;
type RafacallBookingPayload = Awaited<ReturnType<typeof api.rafacall.booking>>['booking'];
type AvailabilityPayload = Awaited<ReturnType<typeof api.rafacall.availability>>;

function formatRafacallScheduledPt(
  slotStartsAt: string | null,
  slotEndsAt: string | null,
  timeZone: string,
): { main: string; sub?: string } {
  const tz = (timeZone || 'Europe/Lisbon').trim() || 'Europe/Lisbon';
  const start = slotStartsAt
    ? new Date(slotStartsAt)
    : slotEndsAt
      ? new Date(new Date(slotEndsAt).getTime() - 30 * 60 * 1000)
      : null;
  const end = slotEndsAt ? new Date(slotEndsAt) : null;
  if (!start || Number.isNaN(start.getTime())) {
    return { main: '—' };
  }
  const main = start.toLocaleString('pt-PT', {
    timeZone: tz,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  let sub: string | undefined;
  if (end && !Number.isNaN(end.getTime())) {
    sub = `Até às ${end.toLocaleTimeString('pt-PT', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }
  return { main, sub };
}

function isActiveRafacallSlot(slotEndsAt: string | null | undefined): boolean {
  if (!slotEndsAt) return false;
  const t = new Date(slotEndsAt).getTime();
  if (Number.isNaN(t)) return false;
  return t > Date.now();
}

function formatEur(cents: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatBrl(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

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

function prettyTimezoneCityLabel(tz: string): string {
  const t = (tz || '').trim();
  if (!t) return 'Lisboa';
  const last = t.split('/').pop() || t;
  return last.replace(/_/g, ' ');
}

type RafaCallCardProps = {
  /** Tamanhos Next/Image quando o cartão está no carrossel do dashboard. */
  carouselImageSizes?: string;
};

export function RafaCallCard({ carouselImageSizes }: RafaCallCardProps = {}) {
  const router = useRouter();
  const { user, token } = useAuth();
  const searchParams = useSearchParams();
  const [payOpen, setPayOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [rafacallStatus, setRafacallStatus] = useState<
    RafacallStatusPayload | null | undefined
  >(undefined);
  const [booking, setBooking] = useState<RafacallBookingPayload | null | undefined>(undefined);
  const [guestBooking, setGuestBooking] = useState<RafacallGuestBookingStored | null>(null);
  const [amounts, setAmounts] = useState<{ eurCents: number; pixCentavos: number } | null>(
    null,
  );
  const [amountsLoading, setAmountsLoading] = useState(false);

  type SchedMode = 'schedule' | 'cancel';
  const [schedOpen, setSchedOpen] = useState(false);
  const [schedMode, setSchedMode] = useState<SchedMode>('schedule');
  const [schedLoading, setSchedLoading] = useState(false);
  const [schedError, setSchedError] = useState('');
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  const refreshGuestBookingFromStorage = useCallback(() => {
    setGuestBooking(readRafacallGuestBooking());
  }, []);

  const refreshRafacallStatus = useCallback(async () => {
    if (!user || !token) {
      setRafacallStatus(undefined);
      setBooking(undefined);
      return;
    }
    try {
      const s = await api.rafacall.status();
      setRafacallStatus(s);
      const b = await api.rafacall.booking();
      setBooking(b.booking);
    } catch {
      setRafacallStatus(null);
      setBooking(null);
    }
  }, [user, token]);

  useEffect(() => {
    refreshGuestBookingFromStorage();
  }, [refreshGuestBookingFromStorage]);

  useEffect(() => {
    void refreshRafacallStatus();
  }, [refreshRafacallStatus]);

  useEffect(() => {
    const onFocus = () => {
      refreshGuestBookingFromStorage();
      if (user && token) void refreshRafacallStatus();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, token, refreshRafacallStatus, refreshGuestBookingFromStorage]);

  const closePayModal = useCallback(() => {
    setPayOpen(false);
  }, []);

  const ensureAmountsForIntro = useCallback(() => {
    if (amounts !== null || amountsLoading) return;
    setAmountsLoading(true);
    void (async () => {
      try {
        const a = await api.stripe.getRafaCallAmounts();
        setAmounts(a);
      } catch {
        setAmounts(null);
      } finally {
        setAmountsLoading(false);
      }
    })();
  }, [amounts, amountsLoading]);

  const openIntroModal = useCallback(() => {
    ensureAmountsForIntro();
    setPayOpen(true);
  }, [ensureAmountsForIntro]);

  const openScheduler = useCallback(async () => {
    if (!user || !token) {
      // Guest sem booking ainda: ir direto ao checkout (novo fluxo).
      router.push(RAFA_CALL_CHECKOUT_PATH);
      return;
    }
    setSchedOpen(true);
    setSchedMode('schedule');
    setSchedError('');
    setAvailability(null);
    setSelectedDate('');
    setSchedLoading(true);
    try {
      const tz = resolvedUserTz();
      const from = ymdInTz(new Date(), tz);
      const to = ymdInTz(addDays(new Date(), 14), tz);
      const [b, avail, s] = await Promise.all([
        api.rafacall.booking(),
        api.rafacall.availability({ from, to, tz }),
        api.rafacall.status(),
      ]);
      setBooking(b.booking);
      setAvailability(avail);
      setRafacallStatus(s);
      const firstFree = avail.days.find((d) => d.slots.length > 0)?.date;
      const firstBlockedOnly = avail.days.find(
        (d) => d.slots.length === 0 && (d.adminBlockedSlots?.length ?? 0) > 0,
      )?.date;
      setSelectedDate(firstFree ?? firstBlockedOnly ?? avail.days[0]?.date ?? '');
    } catch (e) {
      setAvailability(null);
      setSchedError(e instanceof Error ? e.message : 'Erro ao carregar horários.');
    } finally {
      setSchedLoading(false);
    }
  }, [user, token, router]);

  const openCancelModal = useCallback(async () => {
    if (!user || !token) {
      // Guests gerem o agendamento na página dedicada.
      if (guestBooking) {
        router.push(rafacallGuestManageUrl(guestBooking.bookingId));
      }
      return;
    }
    setSchedOpen(true);
    setSchedMode('cancel');
    setSchedError('');
    setSchedLoading(true);
    try {
      const b = await api.rafacall.booking();
      setBooking(b.booking);
    } catch (e) {
      setSchedError(e instanceof Error ? e.message : 'Não foi possível carregar o agendamento.');
    } finally {
      setSchedLoading(false);
    }
  }, [user, token, guestBooking, router]);

  const handleAgendar = useCallback(async () => {
    // Se temos um agendamento guest neste dispositivo, abrir a página de gestão.
    if (guestBooking) {
      router.push(rafacallGuestManageUrl(guestBooking.bookingId));
      return;
    }
    if (!user || !token) {
      openIntroModal();
      return;
    }
    setStatusLoading(true);
    try {
      const s = await api.rafacall.status();
      setRafacallStatus(s);
      if (s.schedulingUnlocked) {
        await openScheduler();
        return;
      }
      openIntroModal();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível carregar o estado.';
      alert(msg);
    } finally {
      setStatusLoading(false);
    }
  }, [guestBooking, router, user, token, openIntroModal, openScheduler]);

  useEffect(() => {
    if (searchParams.get('openRafaCall') !== '1') return;

    // Evita reabrir ao voltar/recarregar.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('openRafaCall');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // noop
    }

    void handleAgendar();
  }, [searchParams, handleAgendar]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOpen = () => {
      void handleAgendar();
    };
    window.addEventListener(OPEN_RAFA_CALL_SCHEDULE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_RAFA_CALL_SCHEDULE_EVENT, onOpen);
  }, [handleAgendar]);

  const handleReagendar = useCallback(() => {
    void handleAgendar();
  }, [handleAgendar]);

  const closeSched = useCallback(() => {
    setSchedOpen(false);
    setSchedError('');
  }, []);

  const tz = useMemo(
    () => availability?.tz || booking?.timezone || resolvedUserTz(),
    [availability?.tz, booking?.timezone],
  );

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
      if (!availability) return;
      setSchedLoading(true);
      setSchedError('');
      try {
        const b = await api.rafacall.booking();
        if (b.booking) {
          const next = await api.rafacall.reschedule({
            bookingId: b.booking.id,
            newStartsAtUtcIso: startsAtUtcIso,
            tz,
          });
          setBooking(next);
        } else {
          const created = await api.rafacall.book({ startsAtUtcIso: startsAtUtcIso, tz });
          setBooking(created);
        }
        await refreshRafacallStatus();
        setSchedOpen(false);
      } catch (e) {
        setSchedError(e instanceof Error ? e.message : 'Não foi possível agendar.');
      } finally {
        setSchedLoading(false);
      }
    },
    [availability, tz, refreshRafacallStatus],
  );

  const doCancelBooking = useCallback(async () => {
    if (!booking) return;
    setSchedLoading(true);
    setSchedError('');
    try {
      await api.rafacall.cancel({ bookingId: booking.id, reason: 'user_cancel' });
      setBooking(null);
      await refreshRafacallStatus();
      setSchedOpen(false);
    } catch (e) {
      setSchedError(e instanceof Error ? e.message : 'Não foi possível cancelar.');
    } finally {
      setSchedLoading(false);
    }
  }, [booking, refreshRafacallStatus]);

  const hasGuestBooked = Boolean(guestBooking);
  const hasUserBookedSlot = Boolean(
    rafacallStatus &&
      rafacallStatus.schedulingUnlocked &&
      isActiveRafacallSlot(rafacallStatus.slotEndsAt),
  );
  const hasBookedSlot = hasGuestBooked || hasUserBookedSlot;
  const scheduleTz = useMemo(() => {
    if (guestBooking?.timezone) return guestBooking.timezone;
    if (booking?.timezone) return booking.timezone.trim() || resolvedUserTz();
    return resolvedUserTz();
  }, [guestBooking?.timezone, booking?.timezone]);
  const scheduleLines = hasBookedSlot
    ? formatRafacallScheduledPt(
        guestBooking?.startsAt ?? rafacallStatus?.slotStartsAt ?? null,
        guestBooking?.endsAt ?? rafacallStatus?.slotEndsAt ?? null,
        scheduleTz,
      )
    : null;
  const goToGuestManage = useCallback(() => {
    if (!guestBooking) return;
    router.push(rafacallGuestManageUrl(guestBooking.bookingId));
  }, [guestBooking, router]);
  const memberStatusLoading =
    Boolean(user && token && rafacallStatus === undefined);
  const inCarousel = Boolean(carouselImageSizes);
  const imageSizes =
    carouselImageSizes ?? '(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 25vw';
  const cardShellClass = inCarousel
    ? 'relative overflow-hidden'
    : 'relative overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 shadow-sm';
  const scheduleButtonClass = inCarousel
    ? 'group relative w-full cursor-pointer overflow-hidden rounded-lg border-0 bg-transparent p-0 text-left shadow-none transition hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-80'
    : 'group relative w-full cursor-pointer overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 text-left shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-80';

  return (
    <>
      <div className="h-full w-full min-w-0">
        {hasBookedSlot && scheduleLines ? (
          <div className={cardShellClass}>
            <Image
              src="/rafa_cards/chamada_agendada2.png"
              alt="Chamada de vídeo com a Rafa agendada"
              width={1250}
              height={1875}
              className="h-auto w-full object-contain"
              sizes={imageSizes}
              priority
            />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-white from-40% via-white/95 to-transparent px-4 pb-4 pt-12 sm:px-5 sm:pb-5">
              <div>
                <span
                  className="mb-1.5 inline-block rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold tracking-widest text-white shadow-sm ring-1 ring-emerald-500/40"
                  aria-label="Agendamento confirmado"
                >
                  CONFIRMADO
                </span>
                <h2 className="mb-2 text-base font-semibold tracking-tight text-zinc-900 sm:text-lg">
                  Meu agendamento com Rafa
                </h2>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                  Data e hora
                </p>
                <p className="mt-1 text-sm font-semibold capitalize leading-snug text-zinc-900">
                  {scheduleLines.main}
                </p>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs leading-snug">
                  {scheduleLines.sub ? (
                    <span className="shrink-0 font-medium text-zinc-600">{scheduleLines.sub}</span>
                  ) : null}
                  {scheduleLines.sub ? (
                    <span className="shrink-0 text-zinc-300" aria-hidden>
                      ·
                    </span>
                  ) : null}
                  <span className="min-w-0 text-zinc-500">
                    Fuso de referência:{' '}
                    <span className="font-medium text-zinc-700">
                      {prettyTimezoneCityLabel(scheduleTz)}
                    </span>
                    <span className="text-zinc-400"> ({scheduleTz})</span>
                  </span>
                </div>
              </div>
              <div className="flex w-full flex-row items-stretch gap-2">
                <CardButton
                  type="button"
                  onClick={hasGuestBooked ? goToGuestManage : () => void openScheduler()}
                  loading={statusLoading}
                  variant="secondary"
                  className="min-w-0 flex-1"
                >
                  {statusLoading ? 'A abrir…' : 'Reagendar'}
                </CardButton>
                <CardButton
                  type="button"
                  onClick={hasGuestBooked ? goToGuestManage : () => void openCancelModal()}
                  loading={statusLoading}
                  variant="tertiary"
                  className="min-w-0 flex-1"
                >
                  Cancelar
                </CardButton>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => void handleAgendar()}
              disabled={statusLoading || memberStatusLoading}
              className={scheduleButtonClass}
            >
              <Image
                src="/rafa_cards/agendar_chamada2.png"
                alt="Agendar chamada de vídeo com a Rafa"
                width={1250}
                height={1875}
                className="h-auto w-full object-contain"
                sizes={imageSizes}
                priority
              />
            </button>
            {memberStatusLoading && !inCarousel ? (
              <p className="mt-2 text-center text-xs text-zinc-500">A carregar o teu agendamento…</p>
            ) : null}
          </div>
        )}
      </div>

      {schedOpen ? (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-4"
            onClick={closeSched}
            role="presentation"
          >
            <div
              className="relative mb-0 w-full max-w-6xl max-h-[min(92dvh,100%)] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:my-8"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
            >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">
                  {schedMode === 'cancel'
                    ? 'Cancelar chamada'
                    : booking
                      ? 'Reagendar chamada'
                      : 'Agendar chamada'}
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Timezone: <span className="font-medium">{tz}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={closeSched}
                className="rounded-full px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
              >
                Fechar
              </button>
            </div>

            {schedError ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {schedError}
              </p>
            ) : null}

            {booking ? (
              <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-600">
                  Agendamento atual
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">
                  {new Date(booking.startsAt).toLocaleString('pt-PT', {
                    timeZone: booking.timezone,
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {schedMode === 'cancel' ? (
                  <>
                    <p className="mt-2 text-sm text-zinc-700">
                      Queres mesmo cancelar esta chamada? Vais poder reagendar depois.
                    </p>
                    <button
                      type="button"
                      onClick={() => void doCancelBooking()}
                      disabled={schedLoading}
                      className="mt-3 inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      {schedLoading ? 'A cancelar…' : 'Confirmar cancelamento'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void openScheduler()}
                      disabled={schedLoading}
                      className="mt-2 inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50"
                    >
                      Voltar para reagendar
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}

            {schedMode === 'schedule' ? (
              <div className="mt-6 grid gap-6 md:grid-cols-[260px_1fr]">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    Dias
                  </p>
                  {!availability ? (
                    <p className="mt-3 text-sm text-zinc-600">A carregar…</p>
                  ) : availability.days.length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-600">Sem dias disponíveis.</p>
                  ) : (
                    <div className="mt-3 max-h-[420px] space-y-2 overflow-auto pr-1">
                      {availability.days.filter(
                        (d) =>
                          d.slots.length > 0 || (d.adminBlockedSlots?.length ?? 0) > 0,
                      ).length === 0 ? (
                        <p className="text-sm text-zinc-600">
                          Sem dias com horários neste período.
                        </p>
                      ) : (
                        availability.days
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
                                disabled={schedLoading}
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
                          })
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                    Horários de {prettyTimezoneCityLabel(tz)}
                  </p>
                  {schedLoading ? (
                    <p className="mt-3 text-sm text-zinc-600">A carregar…</p>
                  ) : !availability ? (
                    <p className="mt-3 text-sm text-zinc-600">Não foi possível carregar os horários.</p>
                  ) : availability.days.every(
                      (d) =>
                        d.slots.length === 0 && (d.adminBlockedSlots?.length ?? 0) === 0,
                    ) ? (
                    <p className="mt-3 text-sm text-zinc-600">
                      Sem horários disponíveis nos próximos dias. Tenta novamente mais tarde.
                    </p>
                  ) : daySlotGrid.length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-600">
                      Escolhe um dia na lista ao lado.
                    </p>
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
                              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 hover:bg-emerald-50"
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
            ) : null}
            </div>
          </div>
        </ModalPortal>
      ) : null}

      {payOpen ? (
        <ModalPortal>
          <div
            className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-black/50 p-3 sm:items-center sm:p-4"
            onClick={closePayModal}
            role="presentation"
          >
            <div
              className="relative mb-0 w-full max-w-3xl max-h-[min(92dvh,100%)] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:my-8"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="rafacall-pay-modal-title"
            >
            <button
              type="button"
              onClick={closePayModal}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-zinc-200 text-zinc-700 shadow-sm transition-colors hover:bg-white hover:text-zinc-900"
              aria-label="Fechar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <div className="-mx-5 -mt-5 mb-4 overflow-hidden rounded-t-2xl">
              <div className="relative h-52 w-full sm:h-64">
                <Image
                  src="/rafa_cards/modal_novo_agendamento.png"
                  alt=""
                  fill
                  priority
                  className="object-cover object-center"
                  sizes="(max-width: 640px) 100vw, 560px"
                />
              </div>
              <div className="bg-white px-4 pb-4 pt-2 text-center">
                <h3
                  id="rafacall-pay-modal-title"
                  className="text-lg font-bold tracking-tight text-zinc-900"
                >
                  Converse com a Rafa sobre a sua imigração
                </h3>
                <p className="mt-1 text-sm font-medium text-zinc-600">
                  Chamada de vídeo com a Rafa (30 min)
                </p>
                <p className="mt-2 text-sm font-semibold text-zinc-900">
                  {amountsLoading || !amounts
                    ? 'Preço: a carregar…'
                    : `Preço: ${formatEur(amounts.eurCents)} ou ${formatBrl(amounts.pixCentavos)}`}
                </p>
                <p className="mt-4 whitespace-pre-line text-left text-sm leading-relaxed text-zinc-700">
                  {`Que tal conversar diretamente com quem já passou por todo o processo de imigração?

Nessa videochamada, vamos bater um papo leve e direto ao ponto. Vou te contar como foi a minha experiência saindo do Brasil e construindo uma vida em Portugal, compartilhar aprendizados reais (inclusive os erros que você pode evitar!) e esclarecer as dúvidas gerais que você tiver sobre o processo.

Importante: esta conversa não é uma consulta jurídica. A Rafa não tem formação/conhecimento jurídico para orientar casos específicos, interpretar documentos ou indicar qual decisão legal tomar. O objetivo é falar de processos e caminhos em termos gerais, com base em experiência prática.

Também vou te apresentar nossos parceiros de confiança e te orientar sobre quais caminhos fazem mais sentido para o seu perfil, para que você possa imigrar com mais segurança, planejamento e tranquilidade — sem perder tempo ou dinheiro com decisões erradas.

Se você quer dar esse passo com mais clareza e confiança, essa conversa é pra você 💛`}
                </p>
              </div>
            </div>
            <CardButton
              type="button"
              onClick={() => {
                closePayModal();
                router.push(RAFA_CALL_CHECKOUT_PATH);
              }}
              variant="primary"
              fullWidth
            >
              Continuar para pagamento
            </CardButton>
            <div className="mt-3">
              <CardButton type="button" onClick={closePayModal} variant="outline" fullWidth>
                Cancelar
              </CardButton>
            </div>
            </div>
          </div>
        </ModalPortal>
      ) : null}
    </>
  );
}
