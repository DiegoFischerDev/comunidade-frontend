'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { LoginWhatsappFields } from '@/components/auth/LoginWhatsappFields';
import {
  CENTERED_PEEK_CAROUSEL_ITEM,
  CENTERED_PEEK_CAROUSEL_TRACK,
  HORIZONTAL_CAROUSEL_TRACK,
  HorizontalSnapCarousel,
} from '@/components/ui/horizontal-snap-carousel';

type SchedulePayload = Awaited<ReturnType<typeof api.admin.rafacall.schedule>>;
type BlocksPayload = Awaited<ReturnType<typeof api.admin.rafacall.blocks>>;
type AvailabilityPayload = Awaited<ReturnType<typeof api.rafacall.availability>>;

function ymdInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

function isTodayYmd(ymd: string, timeZone: string): boolean {
  return ymd === ymdInTz(new Date(), timeZone);
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

function blocksForYmd(blocks: BlocksPayload['blocks'], ymd: string, timeZone: string) {
  return blocks
    .filter((b) => ymdInTz(new Date(b.startsAt), timeZone) === ymd)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function formatWhatsappDigits(digits: string): string {
  const d = String(digits ?? '').replace(/\D/g, '');
  if (!d) return '—';
  if (d.length === 12 && d.startsWith('351')) {
    const r = d.slice(3);
    return `+351 ${r.slice(0, 3)} ${r.slice(3, 6)} ${r.slice(6)}`;
  }
  if (d.length === 13 && d.startsWith('55')) {
    const r = d.slice(2);
    return `+55 (${r.slice(0, 2)}) ${r.slice(2, 7)}-${r.slice(7)}`;
  }
  if (d.length === 9 && /^9\d{8}$/.test(d)) {
    return `+351 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  }
  return `+${d}`;
}

function waUrl(
  digits: string,
  leadName: string,
  startsAtIso: string,
  /** Texto da pré-mensagem: usar o fuso do lead para não contradizer o que ele vê no dashboard. */
  messageTz: string,
): string {
  const d = new Date(startsAtIso);
  const day = d.toLocaleDateString('pt-PT', {
    timeZone: messageTz,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  });
  const hour = d.toLocaleTimeString('pt-PT', {
    timeZone: messageTz,
    hour: '2-digit',
    minute: '2-digit',
  });
  const name = (leadName || '').trim() || '!';
  const text = `Oi ${name}, em relação ao nosso agendamento no ${day} às ${hour}.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function mapQuickBookError(message: string): {
  generalError: string;
  whatsappError: string;
  shouldRefresh: boolean;
} {
  const m = message.trim();
  if (/whatsapp.*agendamento|já tem um agendamento ativo/i.test(m)) {
    return { generalError: '', whatsappError: m, shouldRefresh: false };
  }
  if (/horário|disponível|bloqueado|ocupado/i.test(m)) {
    return {
      generalError: m,
      whatsappError: '',
      shouldRefresh: true,
    };
  }
  return {
    generalError: m || 'Não foi possível criar o agendamento.',
    whatsappError: '',
    shouldRefresh: false,
  };
}

/** Duração usada só para pré-visualização no admin (alinhada com RAFA_CALL_DURATION_MINUTES). */
const ADMIN_SLOT_DURATION_MINUTES = 40;

function tzOffsetMinutes(timeZone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  const asUtc = Date.UTC(
    Number(get('year')),
    Number(get('month')) - 1,
    Number(get('day')),
    Number(get('hour')),
    Number(get('minute')),
    Number(get('second')),
  );
  return Math.round((asUtc - at.getTime()) / 60000);
}

function hmInTz(utcIso: string, timeZone: string): string {
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function localDateTimeInTzToUtcIso(
  timeZone: string,
  ymd: string,
  hm: string,
): string | null {
  const dm = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const tm = hm.match(/^(\d{1,2}):(\d{2})$/);
  if (!dm || !tm) return null;
  const y = Number(dm[1]);
  const mo = Number(dm[2]);
  const d = Number(dm[3]);
  const h = Number(tm[1]);
  const mi = Number(tm[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (h < 0 || h > 23 || mi < 0 || mi > 59) return null;
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi, 0));
  const offset = tzOffsetMinutes(timeZone, guess);
  const utc = new Date(guess.getTime() - offset * 60000);
  if (Number.isNaN(utc.getTime())) return null;
  return utc.toISOString();
}

function previewSlotRangeFromManual(
  ymd: string,
  hm: string,
  timeZone: string,
): { startsAt: string; endsAt: string } | null {
  const startsAt = localDateTimeInTzToUtcIso(timeZone, ymd, hm);
  if (!startsAt) return null;
  const endsAt = new Date(
    new Date(startsAt).getTime() + ADMIN_SLOT_DURATION_MINUTES * 60000,
  ).toISOString();
  return { startsAt, endsAt };
}

function AdminManualSlotFields({
  idPrefix,
  date,
  time,
  timeZone,
  disabled,
  onDateChange,
  onTimeChange,
}: {
  idPrefix: string;
  date: string;
  time: string;
  timeZone: string;
  disabled?: boolean;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-dashed border-border bg-page/40 p-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Dia e hora manual
        </p>
        <p className="mt-1 text-xs text-muted">
          Fora da grelha habitual — qualquer dia ou horário ({timeZone}).
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-foreground" htmlFor={`${idPrefix}-date`}>
            Data
          </label>
          <input
            id={`${idPrefix}-date`}
            type="date"
            value={date}
            disabled={disabled}
            onChange={(e) => onDateChange(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-2.5 text-sm text-foreground outline-none focus:border-brand-primary disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground" htmlFor={`${idPrefix}-time`}>
            Hora
          </label>
          <input
            id={`${idPrefix}-time`}
            type="time"
            value={time}
            disabled={disabled}
            onChange={(e) => onTimeChange(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-2.5 text-sm text-foreground outline-none focus:border-brand-primary disabled:opacity-50"
          />
        </div>
      </div>
    </div>
  );
}

type RafacallAvailabilityPayload = Awaited<
  ReturnType<typeof api.rafacall.guestAvailability>
>;

function AvailabilityQuickPickSection({
  tz,
  availability,
  selectedDate,
  manualDate,
  manualTime,
  isBusy,
  onDateChange,
  onSlotSelect,
}: {
  tz: string;
  availability: RafacallAvailabilityPayload | null;
  selectedDate: string;
  manualDate: string;
  manualTime: string;
  isBusy: boolean;
  onDateChange: (date: string) => void;
  onSlotSelect: (slot: { startsAt: string; endsAt: string }) => void;
}) {
  const daySlots = availability?.days.find((d) => d.date === selectedDate)?.slots ?? [];

  if (!availability) return null;

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        Ou escolhe na grelha
      </p>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Dia</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {availability.days
            .filter((d) => d.slots.length > 0)
            .map((d) => (
              <button
                key={d.date}
                type="button"
                disabled={isBusy}
                onClick={() => onDateChange(d.date)}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  selectedDate === d.date
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                    : 'border-border bg-card text-foreground hover:bg-page'
                }`}
              >
                {prettyYmdPt(d.date, tz)}
              </button>
            ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Horário</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {daySlots.map((slot) => {
            const slotTime = hmInTz(slot.startsAt, tz);
            const isSelected = manualDate === selectedDate && manualTime === slotTime;
            return (
              <button
                key={slot.startsAt}
                type="button"
                disabled={isBusy}
                onClick={() => onSlotSelect(slot)}
                className={`cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                    : 'border-border bg-card text-foreground hover:bg-page'
                }`}
              >
                {formatSlotTimeInTz(slot.startsAt, tz)}
              </button>
            );
          })}
        </div>
        {daySlots.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Sem horários neste dia.</p>
        ) : null}
      </div>
    </div>
  );
}

function WhatsAppTextLink({
  href,
  children,
  className = '',
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`font-medium text-[#128C7E] underline-offset-2 transition hover:underline ${className}`.trim()}
    >
      {children}
    </a>
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

function CheckCircleIcon({ className }: { className?: string }) {
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
      <path d="m9 12 2 2 4-4" />
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

const BOOKING_ACTION_ICON_BTN =
  'inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-50';

function canManageBooking(status: string | undefined | null): boolean {
  return String(status ?? 'SCHEDULED').toUpperCase() !== 'COMPLETED';
}

function bookingStatusDisplay(status: string | undefined | null): {
  label: string;
  className: string;
  cardClassName: string;
} {
  if (String(status ?? '').toUpperCase() === 'COMPLETED') {
    return {
      label: 'Realizado',
      className: 'bg-neutral-200 text-neutral-700',
      cardClassName: 'border-neutral-200 bg-neutral-100',
    };
  }
  return {
    label: 'Agendado',
    className: 'bg-emerald-100 text-emerald-800',
    cardClassName: 'border-emerald-200 bg-emerald-50',
  };
}

type ScheduleItem = SchedulePayload['days'][number]['items'][number];
type BlockItem = BlocksPayload['blocks'][number];

type KanbanDay = {
  date: string;
  bookings: ScheduleItem[];
  blockedSlots: BlockItem[];
  freeSlots: { startsAt: string; endsAt: string }[];
};

type KanbanRowEntry =
  | { kind: 'booking'; startsAt: string; booking: ScheduleItem }
  | { kind: 'block'; startsAt: string; block: BlockItem }
  | { kind: 'free'; startsAt: string; endsAt: string };

function buildKanbanDays(
  schedule: SchedulePayload | null,
  allBlocks: BlockItem[],
  availability: AvailabilityPayload | null,
  timeZone: string,
): KanbanDay[] {
  const dates = new Set<string>();
  for (const day of schedule?.days ?? []) dates.add(day.date);
  for (const block of allBlocks) {
    dates.add(ymdInTz(new Date(block.startsAt), timeZone));
  }
  for (const day of availability?.days ?? []) {
    if (day.slots.length > 0) dates.add(day.date);
  }
  return Array.from(dates)
    .sort((a, b) => a.localeCompare(b))
    .map((date) => ({
      date,
      bookings: schedule?.days.find((d) => d.date === date)?.items ?? [],
      blockedSlots: blocksForYmd(allBlocks, date, timeZone),
      freeSlots: availability?.days.find((d) => d.date === date)?.slots ?? [],
    }));
}

function buildKanbanDayEntries(kanbanDay: KanbanDay): KanbanRowEntry[] {
  const byStart = new Map<string, KanbanRowEntry>();

  for (const slot of kanbanDay.freeSlots) {
    byStart.set(slot.startsAt, {
      kind: 'free',
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
    });
  }
  for (const block of kanbanDay.blockedSlots) {
    byStart.set(block.startsAt, { kind: 'block', startsAt: block.startsAt, block });
  }
  for (const booking of kanbanDay.bookings) {
    byStart.set(booking.startsAt, { kind: 'booking', startsAt: booking.startsAt, booking });
  }

  return Array.from(byStart.values()).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

function BookingActions({
  row,
  slot,
  reschedulingBookingId,
  completingBookingId,
  cancelingBookingId,
  onReschedule,
  onComplete,
  onCancel,
}: {
  row: ScheduleItem;
  slot: string;
  reschedulingBookingId: string | null;
  completingBookingId: string | null;
  cancelingBookingId: string | null;
  onReschedule: (row: ScheduleItem) => void;
  onComplete: (row: ScheduleItem, slot: string) => void;
  onCancel: (row: ScheduleItem, slot: string) => void;
}) {
  const editable = canManageBooking(row.status);

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-1">
      {editable ? (
        <>
          <button
            type="button"
            disabled={reschedulingBookingId === row.id}
            onClick={() => onReschedule(row)}
            title={reschedulingBookingId === row.id ? 'A alterar…' : 'Alterar horário'}
            aria-label={reschedulingBookingId === row.id ? 'A alterar horário' : 'Alterar horário'}
            className={`${BOOKING_ACTION_ICON_BTN} border-border bg-card text-foreground hover:bg-page`}
          >
            <CalendarRescheduleIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={completingBookingId === row.id}
            onClick={() => onComplete(row, slot)}
            title={completingBookingId === row.id ? 'A guardar…' : 'Marcar como realizado'}
            aria-label={completingBookingId === row.id ? 'A marcar como realizado' : 'Marcar como realizado'}
            className={`${BOOKING_ACTION_ICON_BTN} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}
          >
            <CheckCircleIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={cancelingBookingId === row.id}
            onClick={() => onCancel(row, slot)}
            title={cancelingBookingId === row.id ? 'A cancelar…' : 'Cancelar agendamento'}
            aria-label={cancelingBookingId === row.id ? 'A cancelar agendamento' : 'Cancelar agendamento'}
            className={`${BOOKING_ACTION_ICON_BTN} border-red-200 bg-red-50 text-red-800 hover:bg-red-100`}
          >
            <CancelCircleIcon className="h-4 w-4" />
          </button>
        </>
      ) : null}
    </div>
  );
}

function formatSlotRange(startsAt: string, endsAt: string, timeZone: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  return `${start.toLocaleTimeString('pt-PT', { timeZone, hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString('pt-PT', { timeZone, hour: '2-digit', minute: '2-digit' })}`;
}

function FreeKanbanRowContent({
  startsAt,
  endsAt,
  isBlocking,
  onBlock,
  onBook,
}: {
  startsAt: string;
  endsAt: string;
  isBlocking: boolean;
  onBlock: (startsAt: string, endsAt: string) => void;
  onBook: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onBook}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onBook();
        }
      }}
      className="flex min-h-[2.75rem] flex-1 cursor-pointer items-center justify-between gap-2 rounded-lg border border-dashed border-border bg-page/60 px-3 py-2 transition hover:bg-page/90"
      aria-label="Agendar horário livre"
    >
      <span className="text-xs font-medium text-muted">Livre</span>
      <button
        type="button"
        disabled={isBlocking}
        onClick={(e) => {
          e.stopPropagation();
          onBlock(startsAt, endsAt);
        }}
        className="shrink-0 cursor-pointer text-xs font-semibold text-foreground underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isBlocking ? '…' : 'Bloquear'}
      </button>
    </div>
  );
}

function BlockKanbanRowContent({
  block,
  unblockingId,
  onUnblock,
}: {
  block: BlockItem;
  unblockingId: string | null;
  onUnblock: (blockId: string) => void;
}) {
  const isUnblocking = unblockingId === block.id;

  return (
    <div className="flex min-h-[2.75rem] flex-1 items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
      <span className="text-xs font-semibold text-red-800">Ocupado</span>
      <button
        type="button"
        disabled={isUnblocking}
        onClick={() => onUnblock(block.id)}
        className="shrink-0 cursor-pointer text-xs font-semibold text-red-800 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUnblocking ? '…' : 'Desbloquear'}
      </button>
    </div>
  );
}

const KANBAN_MOBILE_COLUMN = `${CENTERED_PEEK_CAROUSEL_ITEM} w-[84vw] max-w-[320px]`;
const KANBAN_TABLET_SLIDE =
  'flex-none w-[calc(100vw-2rem)] max-w-3xl snap-center sm:w-[calc(100vw-3rem)]';

function chunkKanbanDays(days: KanbanDay[], chunkSize: number): KanbanDay[][] {
  if (chunkSize < 1) return [days];
  const chunks: KanbanDay[][] = [];
  for (let i = 0; i < days.length; i += chunkSize) {
    chunks.push(days.slice(i, i + chunkSize));
  }
  return chunks;
}

function formatDayKanbanTitle(ymd: string, timeZone: string): string {
  return new Date(`${ymd}T12:00:00.000Z`).toLocaleDateString('pt-PT', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function formatBookingSlot(row: ScheduleItem, tz: string): string {
  const start = new Date(row.startsAt);
  const end = new Date(row.endsAt);
  return `${start.toLocaleTimeString('pt-PT', { timeZone: tz, hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString('pt-PT', { timeZone: tz, hour: '2-digit', minute: '2-digit' })}`;
}

function bookingWaHref(row: ScheduleItem, adminTz: string): string {
  if (!row.whatsappDigits) return '';
  const messageTz = row.bookingTimezone?.trim() || adminTz;
  return waUrl(row.whatsappDigits, row.userName, row.startsAt, messageTz);
}

function KanbanTimeRow({ timeLabel, children }: { timeLabel: string; children: ReactNode }) {
  return (
    <div className="flex items-stretch gap-3 border-b border-border py-2.5 last:border-b-0">
      <time className="w-10 shrink-0 self-center text-xs font-semibold tabular-nums text-muted">
        {timeLabel}
      </time>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function BookingKanbanRowContent({
  row,
  tz,
  reschedulingBookingId,
  completingBookingId,
  cancelingBookingId,
  onReschedule,
  onComplete,
  onCancel,
}: {
  row: ScheduleItem;
  tz: string;
  reschedulingBookingId: string | null;
  completingBookingId: string | null;
  cancelingBookingId: string | null;
  onReschedule: (row: ScheduleItem) => void;
  onComplete: (row: ScheduleItem, slot: string) => void;
  onCancel: (row: ScheduleItem, slot: string) => void;
}) {
  const slot = formatBookingSlot(row, tz);
  const isCompleted = String(row.status ?? '').toUpperCase() === 'COMPLETED';
  const { cardClassName } = bookingStatusDisplay(row.status);
  const waHref = bookingWaHref(row, tz);

  return (
    <article
      className={`flex min-h-[2.75rem] flex-1 flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border px-3 py-2 shadow-sm sm:flex-nowrap ${cardClassName}`}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{row.userName || '—'}</p>
        {row.whatsappDigits ? (
          waHref ? (
            <WhatsAppTextLink href={waHref} className="mt-0.5 block truncate text-xs">
              {formatWhatsappDigits(row.whatsappDigits)}
            </WhatsAppTextLink>
          ) : (
            <p className="mt-0.5 truncate text-xs text-muted">{formatWhatsappDigits(row.whatsappDigits)}</p>
          )
        ) : null}
      </div>
      {isCompleted ? (
        <span className="inline-flex shrink-0 rounded-full bg-page px-2 py-0.5 text-[10px] font-semibold text-muted">
          Realizado
        </span>
      ) : null}
      <BookingActions
        row={row}
        slot={slot}
        reschedulingBookingId={reschedulingBookingId}
        completingBookingId={completingBookingId}
        cancelingBookingId={cancelingBookingId}
        onReschedule={onReschedule}
        onComplete={onComplete}
        onCancel={onCancel}
      />
    </article>
  );
}

function DayKanbanColumn({
  kanbanDay,
  tz,
  className = '',
  reschedulingBookingId,
  completingBookingId,
  cancelingBookingId,
  unblockingId,
  blockingSlotKey,
  onReschedule,
  onComplete,
  onCancel,
  onUnblock,
  onBlockSlot,
  onBookFreeSlot,
}: {
  kanbanDay: KanbanDay;
  tz: string;
  className?: string;
  reschedulingBookingId: string | null;
  completingBookingId: string | null;
  cancelingBookingId: string | null;
  unblockingId: string | null;
  blockingSlotKey: string | null;
  onReschedule: (row: ScheduleItem) => void;
  onComplete: (row: ScheduleItem, slot: string) => void;
  onCancel: (row: ScheduleItem, slot: string) => void;
  onUnblock: (blockId: string) => void;
  onBlockSlot: (startsAt: string, endsAt: string) => void;
  onBookFreeSlot: (startsAt: string, endsAt: string) => void;
}) {
  const entries = buildKanbanDayEntries(kanbanDay);
  const isToday = isTodayYmd(kanbanDay.date, tz);

  return (
    <section
      className={`flex h-full min-h-[200px] flex-col rounded-xl border shadow-sm ${
        isToday
          ? 'border-emerald-200/90 bg-emerald-50/90'
          : 'border-border bg-card'
      } ${className}`.trim()}
      aria-label={`Agendamentos de ${formatDayKanbanTitle(kanbanDay.date, tz)}`}
    >
      <header
        className={`border-b px-3 py-2.5 ${
          isToday ? 'border-emerald-200/80 bg-emerald-100/70' : 'border-border bg-page'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold capitalize text-foreground">
            {formatDayKanbanTitle(kanbanDay.date, tz)}
          </p>
          {isToday ? (
            <span className="shrink-0 rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              HOJE
            </span>
          ) : null}
        </div>
      </header>
      <div className="flex flex-1 flex-col px-3 py-1">
        {entries.length === 0 ? (
          <p className="py-3 text-xs text-muted">Sem itens neste dia.</p>
        ) : (
          entries.map((entry) => (
            <KanbanTimeRow
              key={
                entry.kind === 'booking'
                  ? `b:${entry.booking.id}`
                  : entry.kind === 'block'
                    ? `x:${entry.block.id}`
                    : `f:${entry.startsAt}`
              }
              timeLabel={formatSlotTimeInTz(entry.startsAt, tz)}
            >
              {entry.kind === 'booking' ? (
                <BookingKanbanRowContent
                  row={entry.booking}
                  tz={tz}
                  reschedulingBookingId={reschedulingBookingId}
                  completingBookingId={completingBookingId}
                  cancelingBookingId={cancelingBookingId}
                  onReschedule={onReschedule}
                  onComplete={onComplete}
                  onCancel={onCancel}
                />
              ) : entry.kind === 'block' ? (
                <BlockKanbanRowContent
                  block={entry.block}
                  unblockingId={unblockingId}
                  onUnblock={onUnblock}
                />
              ) : (
                <FreeKanbanRowContent
                  startsAt={entry.startsAt}
                  endsAt={entry.endsAt}
                  isBlocking={blockingSlotKey === `slot:${entry.startsAt}`}
                  onBlock={onBlockSlot}
                  onBook={() => onBookFreeSlot(entry.startsAt, entry.endsAt)}
                />
              )}
            </KanbanTimeRow>
          ))
        )}
      </div>
    </section>
  );
}

function FreeSlotBookModal({
  tz,
  availability,
  selectedDate,
  isLoadingAvailability,
  manualDate,
  manualTime,
  name,
  whatsapp,
  whatsappError,
  error,
  isLoading,
  onDateChange,
  onSlotSelect,
  onManualDateChange,
  onManualTimeChange,
  onNameChange,
  onWhatsappChange,
  onConfirm,
  onClose,
}: {
  tz: string;
  availability: RafacallAvailabilityPayload | null;
  selectedDate: string;
  isLoadingAvailability: boolean;
  manualDate: string;
  manualTime: string;
  name: string;
  whatsapp: string;
  whatsappError: string;
  error: string;
  isLoading: boolean;
  onDateChange: (date: string) => void;
  onSlotSelect: (slot: { startsAt: string; endsAt: string }) => void;
  onManualDateChange: (value: string) => void;
  onManualTimeChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onWhatsappChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const preview = previewSlotRangeFromManual(manualDate, manualTime, tz);
  const trimmedName = name.trim();
  const whatsappDigits = whatsapp.replace(/\D/g, '');
  const canSubmit =
    Boolean(preview) && trimmedName.length >= 2 && whatsappDigits.length >= 8;
  const isBusy = isLoadingAvailability || isLoading;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="free-slot-book-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="free-slot-book-modal-title" className="text-lg font-semibold text-foreground">
              Agendar horário livre
            </h2>
            <p className="mt-1 text-sm text-muted">
              Indica o cliente e escolhe o horário para confirmar o agendamento.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="cursor-pointer rounded-full px-2 py-1 text-sm text-muted hover:bg-page hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground" htmlFor="quick-book-name">
              Nome do cliente
            </label>
            <input
              id="quick-book-name"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              disabled={isBusy}
              className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-2.5 text-sm text-foreground outline-none focus:border-brand-primary disabled:opacity-50"
              placeholder="Nome"
              autoComplete="name"
            />
          </div>
          <LoginWhatsappFields
            key={`${manualDate}-${manualTime}`}
            idPrefix="quick-book"
            label="WhatsApp"
            value={whatsapp}
            error={whatsappError}
            disabled={isBusy}
            rememberInStorage={false}
            onChange={onWhatsappChange}
          />
        </div>

        <div className="mt-4">
          <AdminManualSlotFields
            idPrefix="quick-book"
            date={manualDate}
            time={manualTime}
            timeZone={tz}
            disabled={isBusy}
            onDateChange={onManualDateChange}
            onTimeChange={onManualTimeChange}
          />
        </div>

        {isLoadingAvailability ? (
          <p className="mt-6 text-sm text-muted">A carregar horários…</p>
        ) : (
          <div className="mt-4">
            <AvailabilityQuickPickSection
              tz={tz}
              availability={availability}
              selectedDate={selectedDate}
              manualDate={manualDate}
              manualTime={manualTime}
              isBusy={isBusy}
              onDateChange={onDateChange}
              onSlotSelect={onSlotSelect}
            />
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={isBusy || !canSubmit}
            onClick={() => void onConfirm()}
            className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-[14px] bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'A agendar…' : 'Agendar'}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onClose}
            className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-[14px] border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function RescheduleBookingModal({
  target,
  leadTz,
  availability,
  selectedDate,
  manualDate,
  manualTime,
  error,
  isLoadingAvailability,
  isSubmitting,
  onDateChange,
  onSlotSelect,
  onManualDateChange,
  onManualTimeChange,
  onConfirm,
  onClose,
}: {
  target: ScheduleItem;
  leadTz: string;
  availability: Awaited<ReturnType<typeof api.rafacall.guestAvailability>> | null;
  selectedDate: string;
  manualDate: string;
  manualTime: string;
  error: string;
  isLoadingAvailability: boolean;
  isSubmitting: boolean;
  onDateChange: (date: string) => void;
  onSlotSelect: (slot: { startsAt: string; endsAt: string }) => void;
  onManualDateChange: (value: string) => void;
  onManualTimeChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const clientName = (target.userName || '').trim() || '—';
  const isBusy = isLoadingAvailability || isSubmitting;
  const preview = previewSlotRangeFromManual(manualDate, manualTime, leadTz);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reschedule-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="reschedule-modal-title" className="text-lg font-semibold text-foreground">
              Alterar agendamento
            </h2>
            <p className="mt-1 text-sm text-muted">
              Escolhe o novo horário para confirmar a alteração.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="cursor-pointer rounded-full px-2 py-1 text-sm text-muted hover:bg-page hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-page/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Cliente</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{clientName}</p>
          {target.whatsappDigits ? (
            <p className="mt-0.5 text-sm text-foreground/90">
              {formatWhatsappDigits(target.whatsappDigits)}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted">Fuso {leadTz}</p>
        </div>

        {preview ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Horário selecionado</p>
            <p className="mt-1 text-sm font-semibold capitalize text-foreground">
              {prettyYmdPt(manualDate, leadTz)}
            </p>
            <p className="mt-0.5 text-sm text-foreground/90">
              {formatSlotRange(preview.startsAt, preview.endsAt, leadTz)}
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-4">
          <AdminManualSlotFields
            idPrefix="reschedule"
            date={manualDate}
            time={manualTime}
            timeZone={leadTz}
            disabled={isBusy}
            onDateChange={onManualDateChange}
            onTimeChange={onManualTimeChange}
          />
        </div>

        {isLoadingAvailability ? (
          <p className="mt-6 text-sm text-muted">A carregar horários…</p>
        ) : availability ? (
          <div className="mt-4">
            <AvailabilityQuickPickSection
              tz={leadTz}
              availability={availability}
              selectedDate={selectedDate}
              manualDate={manualDate}
              manualTime={manualTime}
              isBusy={isBusy}
              onDateChange={onDateChange}
              onSlotSelect={onSlotSelect}
            />
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={isBusy || !preview}
            onClick={() => void onConfirm()}
            className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-[14px] bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'A reagendar…' : 'Reagendar'}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={onClose}
            className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-[14px] border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function BookingActionConfirmModal({
  action,
  row,
  slot,
  isLoading,
  onConfirm,
  onClose,
}: {
  action: 'cancel' | 'complete';
  row: ScheduleItem;
  slot: string;
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const isCancel = action === 'cancel';
  const clientName = (row.userName || '').trim() || '—';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-action-confirm-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          {isCancel ? (
            <CancelCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
          ) : (
            <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          )}
          <div className="min-w-0">
            <h2 id="booking-action-confirm-title" className="text-base font-semibold text-foreground">
              {isCancel ? 'Cancelar agendamento?' : 'Marcar como realizado?'}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {isCancel
                ? 'Esta ação remove o agendamento. O cliente poderá marcar novamente quando quiser.'
                : 'Confirma que a videochamada com este cliente já foi realizada.'}
            </p>
          </div>
        </div>

        <div
          className={`mt-4 rounded-xl border px-4 py-3 ${
            isCancel ? 'border-red-200 bg-red-50/80' : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Agendamento</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{clientName}</p>
          <p className="mt-0.5 text-sm text-foreground/90">{slot}</p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void onConfirm()}
            className={`inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              isCancel ? 'bg-red-700 hover:bg-red-800' : 'bg-emerald-700 hover:bg-emerald-800'
            }`}
          >
            {isCancel ? <CancelCircleIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
            {isLoading
              ? isCancel
                ? 'A cancelar…'
                : 'A guardar…'
              : isCancel
                ? 'Confirmar cancelamento'
                : 'Confirmar realizado'}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-[14px] border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
          >
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminRafaCallHojePage() {
  const { user } = useAuth();
  const [data, setData] = useState<SchedulePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelingBookingId, setCancelingBookingId] = useState<string | null>(null);
  const [completingBookingId, setCompletingBookingId] = useState<string | null>(null);
  const [reschedulingBookingId, setReschedulingBookingId] = useState<string | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<ScheduleItem | null>(null);
  const [rescheduleAvailability, setRescheduleAvailability] = useState<
    Awaited<ReturnType<typeof api.rafacall.guestAvailability>> | null
  >(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleManualDate, setRescheduleManualDate] = useState('');
  const [rescheduleManualTime, setRescheduleManualTime] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  /** Tabela de agenda admin + bloqueios: sempre horário de Lisboa (agrupamento alinhado com API admin). */
  const ADMIN_SCHEDULE_TZ = 'Europe/Lisbon' as const;
  const tz = ADMIN_SCHEDULE_TZ;

  const [blocks, setBlocks] = useState<BlocksPayload['blocks']>([]);
  const [availability, setAvailability] = useState<
    Awaited<ReturnType<typeof api.rafacall.availability>> | null
  >(null);
  const [slotMutatingKey, setSlotMutatingKey] = useState<string | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [bookingConfirm, setBookingConfirm] = useState<{
    kind: 'cancel' | 'complete';
    row: ScheduleItem;
    slot: string;
  } | null>(null);
  const [quickBookOpen, setQuickBookOpen] = useState(false);
  const [quickBookSelectedDate, setQuickBookSelectedDate] = useState('');
  const [quickBookManualDate, setQuickBookManualDate] = useState('');
  const [quickBookManualTime, setQuickBookManualTime] = useState('');
  const [quickBookName, setQuickBookName] = useState('');
  const [quickBookWhatsapp, setQuickBookWhatsapp] = useState('');
  const [quickBookWhatsappError, setQuickBookWhatsappError] = useState('');
  const [quickBookError, setQuickBookError] = useState('');
  const [quickBooking, setQuickBooking] = useState(false);

  const kanbanDays = useMemo(
    () => buildKanbanDays(data, blocks, availability, tz),
    [data, blocks, availability, tz],
  );

  const tabletKanbanSlides = useMemo(
    () => chunkKanbanDays(kanbanDays, 2),
    [kanbanDays],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const from = ymdInTz(new Date(), tz);
      const to = ymdInTz(addDays(new Date(), 14), tz);
      const fromUtcIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const toUtcIso = addDays(new Date(), 14).toISOString();

      const [scheduleRes, blocksRes, availRes] = await Promise.allSettled([
        api.admin.rafacall.schedule(tz),
        api.admin.rafacall.blocks({ fromUtcIso, toUtcIso }),
        api.rafacall.guestAvailability({ from, to, tz }),
      ]);

      const errors: string[] = [];

      if (scheduleRes.status === 'fulfilled') {
        setData(scheduleRes.value);
      } else {
        setData(null);
        errors.push(
          scheduleRes.reason instanceof Error
            ? scheduleRes.reason.message
            : 'Erro ao carregar agendamentos.',
        );
      }

      if (blocksRes.status === 'fulfilled') {
        setBlocks(blocksRes.value.blocks);
      } else {
        setBlocks([]);
        errors.push(
          blocksRes.reason instanceof Error
            ? blocksRes.reason.message
            : 'Erro ao carregar bloqueios.',
        );
      }

      if (availRes.status === 'fulfilled') {
        setAvailability(availRes.value);
      } else {
        setAvailability(null);
        errors.push(
          availRes.reason instanceof Error
            ? availRes.reason.message
            : 'Erro ao carregar horários livres.',
        );
      }

      if (errors.length > 0) {
        setError(
          errors.length === 3
            ? errors[0] ?? 'Erro ao carregar.'
            : `Alguns dados não carregaram: ${errors.join(' ')}`,
        );
      }
    } finally {
      setLoading(false);
    }
  }, [tz]);

  const openReschedule = useCallback(async (item: ScheduleItem) => {
    setRescheduleTarget(item);
    setRescheduleError('');
    setRescheduleManualDate('');
    setRescheduleManualTime('');
    setRescheduleLoading(true);
    setRescheduleAvailability(null);
    try {
      const leadTz = item.bookingTimezone?.trim() || tz;
      const from = ymdInTz(new Date(), leadTz);
      const to = ymdInTz(addDays(new Date(), 14), leadTz);
      const avail = await api.rafacall.guestAvailability({
        from,
        to,
        tz: leadTz,
        excludeBookingId: item.id,
      });
      setRescheduleAvailability(avail);
      const firstDay =
        avail.days.find((d) => d.slots.length > 0)?.date ?? avail.days[0]?.date ?? '';
      setRescheduleDate(firstDay);
      if (item.startsAt) {
        setRescheduleManualDate(ymdInTz(new Date(item.startsAt), leadTz));
        setRescheduleManualTime(hmInTz(item.startsAt, leadTz));
      }
    } catch (e) {
      setRescheduleError(e instanceof Error ? e.message : 'Erro ao carregar horários.');
    } finally {
      setRescheduleLoading(false);
    }
  }, [tz]);

  const resetReschedule = useCallback(() => {
    setRescheduleTarget(null);
    setRescheduleAvailability(null);
    setRescheduleDate('');
    setRescheduleManualDate('');
    setRescheduleManualTime('');
    setRescheduleError('');
  }, []);

  const closeReschedule = useCallback(() => {
    if (reschedulingBookingId) return;
    resetReschedule();
  }, [reschedulingBookingId, resetReschedule]);

  const reloadRescheduleAvailability = useCallback(async (item: ScheduleItem) => {
    const leadTz = item.bookingTimezone?.trim() || tz;
    const from = ymdInTz(new Date(), leadTz);
    const to = ymdInTz(addDays(new Date(), 14), leadTz);
    const avail = await api.rafacall.guestAvailability({
      from,
      to,
      tz: leadTz,
      excludeBookingId: item.id,
    });
    setRescheduleAvailability(avail);
    return avail;
  }, [tz]);

  const executeReschedule = useCallback(async () => {
    if (!rescheduleTarget) return;
    const leadTz = rescheduleTarget.bookingTimezone?.trim() || tz;
    const startsAtUtc = localDateTimeInTzToUtcIso(
      leadTz,
      rescheduleManualDate,
      rescheduleManualTime,
    );
    if (!startsAtUtc) {
      setRescheduleError('Indica data e hora válidas.');
      return;
    }
    setReschedulingBookingId(rescheduleTarget.id);
    setRescheduleError('');
    try {
      await api.admin.rafacall.rescheduleBooking(rescheduleTarget.id, {
        newStartsAtUtcIso: startsAtUtc,
        tz: leadTz,
      });
      resetReschedule();
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Não foi possível reagendar.';
      setRescheduleError(message);
      if (/horário|disponível|bloqueado|ocupado/i.test(message)) {
        try {
          const avail = await reloadRescheduleAvailability(rescheduleTarget);
          const stillHasDay = avail.days.some(
            (d) => d.date === rescheduleDate && d.slots.length > 0,
          );
          if (!stillHasDay) {
            const firstDay =
              avail.days.find((d) => d.slots.length > 0)?.date ?? avail.days[0]?.date ?? '';
            setRescheduleDate(firstDay);
          }
        } catch {
          // Mantém erro principal visível.
        }
      }
    } finally {
      setReschedulingBookingId(null);
    }
  }, [
    rescheduleTarget,
    rescheduleManualDate,
    rescheduleManualTime,
    rescheduleDate,
    tz,
    resetReschedule,
    load,
    reloadRescheduleAvailability,
  ]);

  const closeBookingConfirm = useCallback(() => {
    if (cancelingBookingId || completingBookingId) return;
    setBookingConfirm(null);
  }, [cancelingBookingId, completingBookingId]);

  const requestCancelBooking = useCallback((row: ScheduleItem, slot: string) => {
    setBookingConfirm({ kind: 'cancel', row, slot });
  }, []);

  const requestCompleteBooking = useCallback((row: ScheduleItem, slot: string) => {
    setBookingConfirm({ kind: 'complete', row, slot });
  }, []);

  const executeBookingConfirm = useCallback(async () => {
    if (!bookingConfirm) return;
    const { kind, row } = bookingConfirm;

    if (kind === 'cancel') {
      setCancelingBookingId(row.id);
      try {
        await api.admin.rafacall.cancelBooking(row.id, 'admin_cancel');
        setBookingConfirm(null);
        await load();
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Não foi possível cancelar.';
        setError(message);
        if (/não encontrado|removido|realizado/i.test(message)) {
          setBookingConfirm(null);
          await load();
        }
      } finally {
        setCancelingBookingId(null);
      }
      return;
    }

    setCompletingBookingId(row.id);
    try {
      await api.admin.rafacall.completeBooking(row.id);
      setBookingConfirm(null);
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Não foi possível marcar como realizado.';
      setError(message);
      if (/não encontrado|removido/i.test(message)) {
        setBookingConfirm(null);
        await load();
      }
    } finally {
      setCompletingBookingId(null);
    }
  }, [bookingConfirm, load]);

  const handleUnblock = useCallback(async (blockId: string) => {
    const ok = window.confirm('Desbloquear este horário?');
    if (!ok) return;
    setUnblockingId(blockId);
    try {
      await api.admin.rafacall.deleteBlock(blockId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível desbloquear.');
    } finally {
      setUnblockingId(null);
    }
  }, [load]);

  const handleBlockSlot = useCallback(
    async (startsAt: string, endsAt: string) => {
      setSlotMutatingKey(`slot:${startsAt}`);
      try {
        await api.admin.rafacall.createBlock({
          startsAtUtcIso: startsAt,
          endsAtUtcIso: endsAt,
          reason: 'admin_block',
        });
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Não foi possível bloquear.');
      } finally {
        setSlotMutatingKey(null);
      }
    },
    [load],
  );

  const openQuickBookSlot = useCallback((date: string, startsAt: string, _endsAt: string) => {
    setQuickBookOpen(true);
    setQuickBookSelectedDate(date);
    setQuickBookManualDate(date);
    setQuickBookManualTime(hmInTz(startsAt, tz));
    setQuickBookName('');
    setQuickBookWhatsapp('');
    setQuickBookError('');
    setQuickBookWhatsappError('');
  }, [tz]);

  const openNewQuickBook = useCallback(() => {
    const firstDay =
      availability?.days.find((d) => d.slots.length > 0)?.date ?? '';
    setQuickBookOpen(true);
    setQuickBookSelectedDate(firstDay);
    setQuickBookManualDate('');
    setQuickBookManualTime('');
    setQuickBookName('');
    setQuickBookWhatsapp('');
    setQuickBookError('');
    setQuickBookWhatsappError('');
  }, [availability]);

  const closeQuickBook = useCallback(() => {
    if (quickBooking) return;
    setQuickBookOpen(false);
    setQuickBookSelectedDate('');
    setQuickBookManualDate('');
    setQuickBookManualTime('');
    setQuickBookName('');
    setQuickBookWhatsapp('');
    setQuickBookError('');
    setQuickBookWhatsappError('');
  }, [quickBooking]);

  const executeQuickBook = useCallback(async () => {
    if (!quickBookOpen) return;
    const trimmedName = quickBookName.trim();
    const trimmedWa = quickBookWhatsapp.replace(/\D/g, '');
    if (trimmedName.length < 2) {
      setQuickBookError('Indica o nome do cliente.');
      return;
    }
    if (trimmedWa.length < 8) {
      setQuickBookWhatsappError('Indica um WhatsApp válido com indicativo.');
      return;
    }
    const startsAtUtc = localDateTimeInTzToUtcIso(tz, quickBookManualDate, quickBookManualTime);
    if (!startsAtUtc) {
      setQuickBookError('Indica data e hora válidas.');
      return;
    }
    setQuickBookWhatsappError('');
    setQuickBooking(true);
    setQuickBookError('');
    try {
      await api.admin.rafacall.createBooking({
        name: trimmedName,
        whatsapp: trimmedWa,
        startsAtUtcIso: startsAtUtc,
        tz,
      });
      setQuickBookOpen(false);
      setQuickBookManualDate('');
      setQuickBookManualTime('');
      setQuickBookName('');
      setQuickBookWhatsapp('');
      await load();
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Não foi possível criar o agendamento.';
      const { generalError, whatsappError, shouldRefresh } = mapQuickBookError(message);
      setQuickBookError(generalError);
      setQuickBookWhatsappError(whatsappError);
      if (shouldRefresh) void load();
    } finally {
      setQuickBooking(false);
    }
  }, [quickBookOpen, quickBookName, quickBookWhatsapp, quickBookManualDate, quickBookManualTime, tz, load]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    void load();
  }, [user, load]);

  if (!user) return null;

  if (user.role !== 'ADMIN') {
    return (
      <div className="pt-6 md:pt-8">
        <h1 className="text-2xl font-semibold text-foreground">Agendamentos de chamadas com clientes</h1>
        <p className="mt-2 text-sm text-muted">Sem permissão para esta página.</p>
      </div>
    );
  }

  return (
    <div className="pt-6 md:pt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Agendamentos de chamadas com clientes</h1>
          <p className="mt-1 text-sm text-muted">
            Agrupado por dia em <span className="font-medium">{tz}</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewQuickBook}
          disabled={quickBooking}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-[14px] bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Novo agendamento
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {loading && kanbanDays.length === 0 ? (
        <p className="mt-6 text-sm text-muted">A carregar agenda…</p>
      ) : null}

      {kanbanDays.length === 0 && !loading ? (
        <p className="mt-6 text-sm text-muted">Nenhum agendamento ou horário disponível.</p>
      ) : null}

      {kanbanDays.length > 0 ? (
        <div className="mt-6">
          <div className="hidden gap-4 pb-2 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(18.75rem,1fr))]">
            {kanbanDays.map((kanbanDay) => (
              <DayKanbanColumn
                key={kanbanDay.date}
                kanbanDay={kanbanDay}
                tz={tz}
                className="min-w-0 w-full"
                reschedulingBookingId={reschedulingBookingId}
                completingBookingId={completingBookingId}
                cancelingBookingId={cancelingBookingId}
                unblockingId={unblockingId}
                blockingSlotKey={slotMutatingKey}
                onReschedule={(item) => void openReschedule(item)}
                onComplete={(item, slotLabel) => requestCompleteBooking(item, slotLabel)}
                onCancel={(item, slotLabel) => requestCancelBooking(item, slotLabel)}
                onUnblock={(blockId) => void handleUnblock(blockId)}
                onBlockSlot={(startsAt, endsAt) => void handleBlockSlot(startsAt, endsAt)}
                onBookFreeSlot={(startsAt, endsAt) => openQuickBookSlot(kanbanDay.date, startsAt, endsAt)}
              />
            ))}
          </div>

          <div className="hidden md:block lg:hidden">
            <HorizontalSnapCarousel
              slideCount={tabletKanbanSlides.length}
              ariaLabel="Dias com agendamentos — deslize ou use as setas"
              navStyle="visible"
              hideNavWhenSingle={false}
              prevAriaLabel="Dias anteriores"
              nextAriaLabel="Dias seguintes"
              trackClassName={`items-stretch ${HORIZONTAL_CAROUSEL_TRACK} gap-4 px-2 pb-2`}
            >
              {tabletKanbanSlides.map((pair, index) => (
                <div key={`tablet-slide:${index}`} className={KANBAN_TABLET_SLIDE}>
                  <div
                    className={`grid h-full gap-3 ${pair.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}
                  >
                    {pair.map((kanbanDay) => (
                      <DayKanbanColumn
                        key={kanbanDay.date}
                        kanbanDay={kanbanDay}
                        tz={tz}
                        className="min-w-0 h-full"
                        reschedulingBookingId={reschedulingBookingId}
                        completingBookingId={completingBookingId}
                        cancelingBookingId={cancelingBookingId}
                        unblockingId={unblockingId}
                        blockingSlotKey={slotMutatingKey}
                        onReschedule={(item) => void openReschedule(item)}
                        onComplete={(item, slotLabel) => requestCompleteBooking(item, slotLabel)}
                        onCancel={(item, slotLabel) => requestCancelBooking(item, slotLabel)}
                        onUnblock={(blockId) => void handleUnblock(blockId)}
                        onBlockSlot={(startsAt, endsAt) => void handleBlockSlot(startsAt, endsAt)}
                        onBookFreeSlot={(startsAt, endsAt) =>
                          openQuickBookSlot(kanbanDay.date, startsAt, endsAt)
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </HorizontalSnapCarousel>
          </div>

          <div className="md:hidden">
            <HorizontalSnapCarousel
              slideCount={kanbanDays.length}
              ariaLabel="Dias com agendamentos — deslize ou use as setas"
              navStyle="visible"
              centeredPeek
              hideNavWhenSingle={false}
              prevAriaLabel="Dia anterior"
              nextAriaLabel="Dia seguinte"
              trackClassName={`items-stretch ${CENTERED_PEEK_CAROUSEL_TRACK} pb-2`}
            >
              {kanbanDays.map((kanbanDay) => (
                <div key={kanbanDay.date} className={KANBAN_MOBILE_COLUMN}>
                  <DayKanbanColumn
                    kanbanDay={kanbanDay}
                    tz={tz}
                    className="h-full"
                    reschedulingBookingId={reschedulingBookingId}
                    completingBookingId={completingBookingId}
                    cancelingBookingId={cancelingBookingId}
                    unblockingId={unblockingId}
                    blockingSlotKey={slotMutatingKey}
                    onReschedule={(item) => void openReschedule(item)}
                    onComplete={(item, slotLabel) => requestCompleteBooking(item, slotLabel)}
                    onCancel={(item, slotLabel) => requestCancelBooking(item, slotLabel)}
                    onUnblock={(blockId) => void handleUnblock(blockId)}
                    onBlockSlot={(startsAt, endsAt) => void handleBlockSlot(startsAt, endsAt)}
                    onBookFreeSlot={(startsAt, endsAt) =>
                      openQuickBookSlot(kanbanDay.date, startsAt, endsAt)
                    }
                  />
                </div>
              ))}
            </HorizontalSnapCarousel>
          </div>
        </div>
      ) : null}


      {rescheduleTarget ? (
        <RescheduleBookingModal
          target={rescheduleTarget}
          leadTz={rescheduleTarget.bookingTimezone?.trim() || tz}
          availability={rescheduleAvailability}
          selectedDate={rescheduleDate}
          manualDate={rescheduleManualDate}
          manualTime={rescheduleManualTime}
          error={rescheduleError}
          isLoadingAvailability={rescheduleLoading}
          isSubmitting={reschedulingBookingId === rescheduleTarget.id}
          onDateChange={(date) => {
            setRescheduleDate(date);
            if (rescheduleError) setRescheduleError('');
          }}
          onSlotSelect={(slot) => {
            const leadTz = rescheduleTarget.bookingTimezone?.trim() || tz;
            setRescheduleManualDate(ymdInTz(new Date(slot.startsAt), leadTz));
            setRescheduleManualTime(hmInTz(slot.startsAt, leadTz));
            if (rescheduleError) setRescheduleError('');
          }}
          onManualDateChange={(value) => {
            setRescheduleManualDate(value);
            if (rescheduleError) setRescheduleError('');
          }}
          onManualTimeChange={(value) => {
            setRescheduleManualTime(value);
            if (rescheduleError) setRescheduleError('');
          }}
          onConfirm={() => void executeReschedule()}
          onClose={closeReschedule}
        />
      ) : null}

      {quickBookOpen ? (
        <FreeSlotBookModal
          tz={tz}
          availability={availability}
          selectedDate={quickBookSelectedDate}
          isLoadingAvailability={loading && !availability}
          manualDate={quickBookManualDate}
          manualTime={quickBookManualTime}
          name={quickBookName}
          whatsapp={quickBookWhatsapp}
          whatsappError={quickBookWhatsappError}
          error={quickBookError}
          isLoading={quickBooking}
          onDateChange={(date) => {
            setQuickBookSelectedDate(date);
            setQuickBookManualDate(date);
            if (quickBookError) setQuickBookError('');
          }}
          onSlotSelect={(slot) => {
            setQuickBookManualDate(ymdInTz(new Date(slot.startsAt), tz));
            setQuickBookManualTime(hmInTz(slot.startsAt, tz));
            setQuickBookSelectedDate(ymdInTz(new Date(slot.startsAt), tz));
            if (quickBookError) setQuickBookError('');
          }}
          onManualDateChange={(value) => {
            setQuickBookManualDate(value);
            setQuickBookSelectedDate(value);
            if (quickBookError) setQuickBookError('');
          }}
          onManualTimeChange={(value) => {
            setQuickBookManualTime(value);
            if (quickBookError) setQuickBookError('');
          }}
          onNameChange={(value) => {
            setQuickBookName(value);
            if (quickBookError) setQuickBookError('');
          }}
          onWhatsappChange={(value) => {
            setQuickBookWhatsapp(value);
            if (quickBookWhatsappError) setQuickBookWhatsappError('');
            if (quickBookError) setQuickBookError('');
          }}
          onConfirm={() => void executeQuickBook()}
          onClose={closeQuickBook}
        />
      ) : null}

      {bookingConfirm ? (
        <BookingActionConfirmModal
          action={bookingConfirm.kind}
          row={bookingConfirm.row}
          slot={bookingConfirm.slot}
          isLoading={
            bookingConfirm.kind === 'cancel'
              ? cancelingBookingId === bookingConfirm.row.id
              : completingBookingId === bookingConfirm.row.id
          }
          onConfirm={() => void executeBookingConfirm()}
          onClose={closeBookingConfirm}
        />
      ) : null}
    </div>
  );
}

