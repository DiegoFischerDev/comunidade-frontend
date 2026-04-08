'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { OPEN_AUTH_LOGIN_EVENT } from '@/lib/auth-ui-events';
import { OPEN_MEMBERSHIP_MODAL_EVENT } from '@/components/FloatingWhatsAppButton';
import { CardButton } from '@/components/ui/CardButton';

type RafacallStatusPayload = Awaited<ReturnType<typeof api.rafacall.status>>;
type RafacallBookingPayload = Awaited<ReturnType<typeof api.rafacall.booking>>['booking'];
type AvailabilityPayload = Awaited<ReturnType<typeof api.rafacall.availability>>;

function formatRafacallScheduledPt(
  slotStartsAt: string | null,
  slotEndsAt: string | null,
): { main: string; sub?: string } {
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
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  let sub: string | undefined;
  if (end && !Number.isNaN(end.getTime())) {
    sub = `Até às ${end.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
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

/** Botões de método de pagamento — mesmo padrão visual do modal da anuidade (FloatingWhatsAppButton). */
function PaymentMethodRow({
  disabled,
  loading,
  onPick,
  amounts,
}: {
  disabled: boolean;
  loading: boolean;
  onPick: (m: 'card' | 'mbway' | 'pix') => void;
  amounts: { eurCents: number; pixCentavos: number };
}) {
  return (
    <div className="mt-4 flex flex-col gap-3">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => onPick('card')}
        className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
          <svg
            aria-hidden
            width="32"
            height="32"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10"
          >
            <path fill="#D8DEE4" d="M0 0h32v32H0z" />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M6 10.375C6 9.339 6.84 8.5 7.875 8.5h16.25C25.16 8.5 26 9.34 26 10.375v11.25c0 1.035-.84 1.875-1.875 1.875H7.875A1.875 1.875 0 0 1 6 21.625v-11.25Zm1.875 0h16.25v1.875H7.875v-1.875Zm16.25 3.75v7.5H7.875v-7.5h16.25Z"
              fill="#474E5A"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M14.75 18.813c0-.518.42-.938.938-.938h5.624a.937.937 0 1 1 0 1.875h-5.625a.937.937 0 0 1-.937-.938Z"
              fill="#474E5A"
            />
          </svg>
        </span>
        <span className="flex-1 font-medium text-zinc-800">Cartão</span>
        <span className="text-sm font-semibold text-emerald-700">
          {formatEur(amounts.eurCents)}
        </span>
      </button>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => onPick('mbway')}
        className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
          <svg
            aria-hidden
            width="32"
            height="32"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10"
          >
            <path fill="#2E333A" d="M0 0h32v32H0z" />
            <path
              fill="red"
              d="M7.792 26.001h16.417c1.885 0 1.904-1.729 1.712-2.759-.105-.694-1.235-.687-1.36 0v.804a.657.657 0 0 1-.642.669H8.079c-.352 0-.64-.301-.64-.67v-.803c-.125-.687-1.256-.694-1.36 0-.192 1.03-.175 2.759 1.713 2.759Zm15.052-20H9.216c-.895 0-1.628.407-1.627 1.393v.881c0 1.172 1.503 1.18 1.503-.025v-.458a.532.532 0 0 1 .52-.542h12.763a.533.533 0 0 1 .372.163.532.532 0 0 1 .15.379v.468c0 1.2 1.574 1.204 1.574-.008v-.858c0-.986-.732-1.394-1.627-1.394Z"
            />
            <path
              fill="#fff"
              fillRule="evenodd"
              d="M24.15 15.853a2.629 2.629 0 0 1 1.492 2.349c0 1.444-1.212 2.625-2.692 2.625h-4.147a.7.7 0 0 1-.706-.687v-8.22c0-.397.312-.722.693-.722h3.455c1.454 0 2.644 1.238 2.644 2.751a2.8 2.8 0 0 1-.739 1.904Zm-3.096-.67h1.318v-.015c.6-.096 1.062-.639 1.062-1.29 0-.717-.562-1.304-1.252-1.304h-2.653v6.822h3.364c.712 0 1.294-.607 1.294-1.348 0-.741-.583-1.347-1.294-1.347h-.521l-1.318-.003a.745.745 0 0 1-.727-.757c0-.417.327-.758.727-.758Zm-3.616 4.824a.858.858 0 0 1-.74.954.841.841 0 0 1-.915-.771l-.683-6.538-2.416 6.393-.003.006-.006.017-.006.013v.004l-.006.013-.01.02-.003.007-.006.012a.868.868 0 0 1-.171.234l-.015.015a.822.822 0 0 1-.144.106l-.004.001-.016.01-.015.008-.006.004-.02.008-.01.005-.01.004-.008.005-.016.006-.013.005-.01.004a.813.813 0 0 1-.25.05h-.061a.802.802 0 0 1-.272-.059l-.012-.005-.013-.005-.012-.005-.008-.005-.01-.003-.015-.01-.015-.007-.014-.008-.008-.004a.839.839 0 0 1-.127-.093l-.004-.002-.027-.025a.856.856 0 0 1-.022-.021l-.02-.023a.992.992 0 0 1-.025-.029l-.002-.003a.858.858 0 0 1-.088-.133l-.005-.007-.006-.013-.009-.019-.002-.005-.005-.01-.005-.01-.004-.01-.005-.01-.004-.012-.006-.015-2.418-6.398-.682 6.538a.84.84 0 0 1-.09.317.841.841 0 0 1-.207.259.84.84 0 0 1-.29.159.842.842 0 0 1-.328.035.859.859 0 0 1-.74-.954l.804-7.708v-.005a1.459 1.459 0 0 1 .689-1.088c.229-.135.491-.201.757-.19h.002c.09.004.175.016.253.034.43.105.795.417.967.872l2.06 5.446 2.056-5.446c.172-.455.537-.767.967-.872a1.378 1.378 0 0 1 1.546.726c.083.162.136.338.155.518v.004l.807 7.71Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <span className="flex-1 font-medium text-zinc-800">MB WAY</span>
        <span className="text-sm font-semibold text-emerald-700">
          {formatEur(amounts.eurCents)}
        </span>
      </button>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => onPick('pix')}
        className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
          <svg
            aria-hidden
            width="32"
            height="32"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10"
          >
            <path fill="#32BCAD" d="M0 0h32v32H0z" />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M9.572 9.627c.942 0 1.827.366 2.493 1.032l3.613 3.614a.67.67 0 0 0 .946 0l3.6-3.6a3.504 3.504 0 0 1 2.493-1.033h.433l-4.571-4.572a3.645 3.645 0 0 0-5.157 0l-4.56 4.559h.71ZM22.717 22.36a3.503 3.503 0 0 1-2.493-1.032l-3.6-3.6a.684.684 0 0 0-.946 0l-3.613 3.613a3.503 3.503 0 0 1-2.493 1.032h-.709l4.559 4.56a3.646 3.646 0 0 0 5.156 0l4.573-4.573h-.434Z"
              fill="#fff"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="m24.169 10.659 2.763 2.763a3.646 3.646 0 0 1 0 5.156L24.17 21.34a.525.525 0 0 0-.196-.039h-1.256a2.483 2.483 0 0 1-1.744-.723l-3.6-3.6c-.653-.653-1.79-.653-2.444 0l-3.613 3.613a2.483 2.483 0 0 1-1.745.723H8.028a.526.526 0 0 0-.185.037l-2.774-2.774a3.646 3.646 0 0 1 0-5.156l2.774-2.774c.058.022.12.037.185.037h1.545c.65 0 1.285.264 1.745.723l3.613 3.613a1.723 1.723 0 0 0 1.883.374c.21-.087.4-.214.56-.375l3.6-3.6c.464-.46 1.09-.72 1.744-.722h1.256a.52.52 0 0 0 .195-.04Z"
              fill="#fff"
            />
          </svg>
        </span>
        <span className="flex-1 font-medium text-zinc-800">Pix</span>
        <span className="text-sm font-semibold text-emerald-700">
          {formatBrl(amounts.pixCentavos)}
        </span>
      </button>
    </div>
  );
}

export function RafaCallCard() {
  const { user, token } = useAuth();
  const [payOpen, setPayOpen] = useState(false);
  const [payOptions, setPayOptions] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [rafacallStatus, setRafacallStatus] = useState<
    RafacallStatusPayload | null | undefined
  >(undefined);
  const [booking, setBooking] = useState<RafacallBookingPayload | null | undefined>(undefined);
  const [payLoading, setPayLoading] = useState(false);
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
    void refreshRafacallStatus();
  }, [refreshRafacallStatus]);

  useEffect(() => {
    if (!user || !token) return;
    const onFocus = () => {
      void refreshRafacallStatus();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user, token, refreshRafacallStatus]);

  const openLogin = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(OPEN_AUTH_LOGIN_EVENT));
  }, []);

  const openMembership = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(OPEN_MEMBERSHIP_MODAL_EVENT));
  }, []);

  const closePayModal = useCallback(() => {
    setPayOpen(false);
    setPayOptions(false);
  }, []);

  const openScheduler = useCallback(async () => {
    if (!user || !token) {
      openLogin();
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
      const firstDayWithSlots = avail.days.find((d) => d.slots.length > 0)?.date ?? '';
      const firstAnyDay = avail.days[0]?.date ?? '';
      setSelectedDate(firstDayWithSlots || firstAnyDay);
    } catch (e) {
      setAvailability(null);
      setSchedError(e instanceof Error ? e.message : 'Erro ao carregar horários.');
    } finally {
      setSchedLoading(false);
    }
  }, [user, token, openLogin, openMembership]);

  const openCancelModal = useCallback(async () => {
    if (!user || !token) {
      openLogin();
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
  }, [user, token, openLogin, openMembership]);

  const handleAgendar = useCallback(async () => {
    if (!user || !token) {
      openLogin();
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
      setPayOpen(true);
      setPayOptions(false);
      if (!amounts && !amountsLoading) {
        setAmountsLoading(true);
        try {
          const a = await api.stripe.getRafaCallAmounts();
          setAmounts(a);
        } catch {
          setAmounts(null);
        } finally {
          setAmountsLoading(false);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível carregar o estado.';
      alert(msg);
    } finally {
      setStatusLoading(false);
    }
  }, [
    user,
    token,
    openLogin,
    amounts,
    amountsLoading,
    openScheduler,
  ]);

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

  const successUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/dashboard/rafacall/success`
      : '';
  const cancelUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : '';

  type PayMethod = 'card' | 'mbway' | 'pix';
  const startPay = async (method: PayMethod) => {
    if (payLoading || !successUrl) return;
    setPayLoading(true);
    try {
      const { url } =
        method === 'pix'
          ? await api.stripe.createRafaCallUnlockPixSession({ successUrl, cancelUrl })
          : method === 'mbway'
            ? await api.stripe.createRafaCallUnlockMbWaySession({ successUrl, cancelUrl })
            : await api.stripe.createRafaCallUnlockSession({ successUrl, cancelUrl });
      window.open(url, '_blank', 'noopener,noreferrer');
      closePayModal();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao iniciar o pagamento.';
      alert(msg);
    } finally {
      setPayLoading(false);
    }
  };

  const ensureAmountsForPaymentStep = useCallback(() => {
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

  const hasBookedSlot = Boolean(
    rafacallStatus &&
      rafacallStatus.schedulingUnlocked &&
      isActiveRafacallSlot(rafacallStatus.slotEndsAt),
  );
  const scheduleLines =
    hasBookedSlot && rafacallStatus
      ? formatRafacallScheduledPt(
          rafacallStatus.slotStartsAt,
          rafacallStatus.slotEndsAt,
        )
      : null;
  const memberStatusLoading =
    Boolean(user && token && rafacallStatus === undefined);

  return (
    <>
      <div className="mb-6 flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative h-20 w-20 flex-shrink-0">
            <Image
              src="/videocall.png"
              alt=""
              fill
              className="object-contain"
              sizes="80px"
            />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-zinc-900">
              {hasBookedSlot
                ? 'A tua chamada de vídeo com a Rafa está agendada'
                : 'Quero agendar uma chamada de video com a Rafa'}
            </p>
            {hasBookedSlot && scheduleLines ? (
              <div className="mt-2 rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-2.5 text-left">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-800/80">
                  Data e hora
                </p>
                <p className="mt-1 text-sm font-semibold capitalize text-emerald-950">
                  {scheduleLines.main}
                </p>
                {scheduleLines.sub ? (
                  <p className="mt-0.5 text-xs text-emerald-900/80">{scheduleLines.sub}</p>
                ) : null}
              </div>
            ) : null}
            {memberStatusLoading ? (
              <p className="text-xs text-zinc-500">A carregar o teu agendamento…</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          {hasBookedSlot ? (
            <>
              <CardButton
                type="button"
                onClick={() => void openScheduler()}
                loading={statusLoading}
                variant="primary"
                className="w-full max-w-[220px]"
              >
                {statusLoading ? 'A abrir…' : 'Reagendar'}
              </CardButton>
              <CardButton
                type="button"
                onClick={() => void openCancelModal()}
                loading={statusLoading}
                variant="secondary"
                className="w-full max-w-[220px]"
              >
                Cancelar
              </CardButton>
            </>
          ) : (
            <CardButton
              type="button"
              onClick={() => void handleAgendar()}
              loading={statusLoading || memberStatusLoading}
              variant="primary"
            >
              {statusLoading ? 'A verificar…' : 'Agendar'}
            </CardButton>
          )}
        </div>
      </div>

      {schedOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={closeSched}
          role="presentation"
        >
          <div
            className="relative w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
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
                      {availability.days.filter((d) => d.slots.length > 0).map((d) => {
                        const isActive = d.date === selectedDate;
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
                            <span className="text-xs text-zinc-600">{d.slots.length} horários</span>
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
                  {schedLoading ? (
                    <p className="mt-3 text-sm text-zinc-600">A carregar…</p>
                  ) : !availability ? (
                    <p className="mt-3 text-sm text-zinc-600">Não foi possível carregar os horários.</p>
                  ) : availability.days.every((d) => d.slots.length === 0) ? (
                    <p className="mt-3 text-sm text-zinc-600">
                      Sem horários disponíveis nos próximos dias. Tenta novamente mais tarde.
                    </p>
                  ) : daySlots.length === 0 ? (
                    <p className="mt-3 text-sm text-zinc-600">
                      Escolhe um dia com horários disponíveis.
                    </p>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {daySlots.map((s) => (
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
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {payOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={closePayModal}
          role="presentation"
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-5 pt-10 shadow-xl"
            onClick={(e) => e.stopPropagation()}
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

            {!payOptions ? (
              <>
                <div className="-mx-5 -mt-5 mb-4 overflow-hidden rounded-t-2xl bg-zinc-50">
                  <div className="relative mx-auto flex h-40 w-full max-w-[200px] items-center justify-center pt-4">
                    <Image
                      src="/videocall.png"
                      alt=""
                      width={160}
                      height={160}
                      className="object-contain"
                    />
                  </div>
                  <div className="bg-white px-4 pb-4 pt-2 text-center">
                    <h3 className="text-lg font-bold tracking-tight text-zinc-900">
                      Novo agendamento
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

Também vou te apresentar nossos parceiros de confiança e te orientar sobre quais caminhos fazem mais sentido para o seu perfil, para que você possa imigrar com mais segurança, planejamento e tranquilidade — sem perder tempo ou dinheiro com decisões erradas.

Se você quer dar esse passo com mais clareza e confiança, essa conversa é pra você 💛`}
                    </p>
                  </div>
                </div>
                <CardButton
                  type="button"
                  onClick={() => {
                    if (!user || !token) {
                      closePayModal();
                      openLogin();
                      return;
                    }
                    ensureAmountsForPaymentStep();
                    setPayOptions(true);
                  }}
                  variant="primary"
                  fullWidth
                >
                  Continuar para pagamento
                </CardButton>
                <div className="mt-3">
                  <CardButton
                    type="button"
                    onClick={closePayModal}
                    variant="secondary"
                    fullWidth
                  >
                  Cancelar
                  </CardButton>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold tracking-tight text-zinc-900">
                  Novo agendamento
                </h3>
                <p className="mt-1 text-sm text-zinc-600">
                  Chamada de vídeo com a Rafa (30 min)
                </p>
                {amountsLoading || !amounts ? (
                  <p className="mt-4 text-sm text-zinc-500">A carregar valores…</p>
                ) : (
                  <>
                    <p className="mt-4 text-sm font-medium text-zinc-800">
                      {formatEur(amounts.eurCents)} ou {formatBrl(amounts.pixCentavos)}
                    </p>
                    <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Escolha a forma de pagamento
                    </p>
                    <PaymentMethodRow
                      disabled={!amounts}
                      loading={payLoading}
                      onPick={(m) => void startPay(m)}
                      amounts={amounts}
                    />
                  </>
                )}
                <div className="mt-4">
                  <CardButton
                    type="button"
                    onClick={() => setPayOptions(false)}
                    variant="secondary"
                    fullWidth
                  >
                    Voltar
                  </CardButton>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
