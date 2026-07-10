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

  return (
    <section
      className={`flex h-full min-h-[200px] flex-col rounded-xl border border-border bg-card shadow-sm ${className}`.trim()}
      aria-label={`Agendamentos de ${formatDayKanbanTitle(kanbanDay.date, tz)}`}
    >
      <header className="border-b border-border bg-page px-3 py-2.5">
        <p className="text-sm font-semibold capitalize text-foreground">
          {formatDayKanbanTitle(kanbanDay.date, tz)}
        </p>
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
  date,
  startsAt,
  endsAt,
  tz,
  name,
  whatsapp,
  whatsappError,
  error,
  isLoading,
  onNameChange,
  onWhatsappChange,
  onConfirm,
  onClose,
}: {
  date: string;
  startsAt: string;
  endsAt: string;
  tz: string;
  name: string;
  whatsapp: string;
  whatsappError: string;
  error: string;
  isLoading: boolean;
  onNameChange: (value: string) => void;
  onWhatsappChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="free-slot-book-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="free-slot-book-modal-title" className="text-lg font-semibold text-foreground">
              Agendar horário livre
            </h2>
            <p className="mt-1 text-sm text-muted">
              Indica o cliente para confirmar este agendamento.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="cursor-pointer rounded-full px-2 py-1 text-sm text-muted hover:bg-page hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Horário selecionado</p>
          <p className="mt-1 text-sm font-semibold capitalize text-foreground">{prettyYmdPt(date, tz)}</p>
          <p className="mt-0.5 text-sm text-foreground/90">{formatSlotRange(startsAt, endsAt, tz)}</p>
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
              disabled={isLoading}
              className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-2.5 text-sm text-foreground outline-none focus:border-brand-primary disabled:opacity-50"
              placeholder="Nome"
              autoComplete="name"
            />
          </div>
          <LoginWhatsappFields
            key={startsAt}
            idPrefix="quick-book"
            label="WhatsApp"
            value={whatsapp}
            error={whatsappError}
            disabled={isLoading}
            rememberInStorage={false}
            onChange={onWhatsappChange}
          />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void onConfirm()}
            className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-[14px] bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'A agendar…' : 'Agendar'}
          </button>
          <button
            type="button"
            disabled={isLoading}
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
  const [quickBookSlot, setQuickBookSlot] = useState<{
    date: string;
    startsAt: string;
    endsAt: string;
  } | null>(null);
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
      const [res, blocksRes, avail] = await Promise.all([
        api.admin.rafacall.schedule(tz),
        api.admin.rafacall.blocks({ fromUtcIso, toUtcIso }),
        api.rafacall.guestAvailability({ from, to, tz }),
      ]);
      setData(res);
      setBlocks(blocksRes.blocks);
      setAvailability(avail);
    } catch (e) {
      setData(null);
      setBlocks([]);
      setAvailability(null);
      setError(e instanceof Error ? e.message : 'Erro ao carregar.');
    } finally {
      setLoading(false);
    }
  }, [tz]);

  const openReschedule = useCallback(async (item: ScheduleItem) => {
    setRescheduleTarget(item);
    setRescheduleError('');
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
    } catch (e) {
      setRescheduleError(e instanceof Error ? e.message : 'Erro ao carregar horários.');
    } finally {
      setRescheduleLoading(false);
    }
  }, [tz]);

  const closeReschedule = useCallback(() => {
    setRescheduleTarget(null);
    setRescheduleAvailability(null);
    setRescheduleDate('');
    setRescheduleError('');
  }, []);

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

  const openQuickBookSlot = useCallback((date: string, startsAt: string, endsAt: string) => {
    setQuickBookSlot({ date, startsAt, endsAt });
    setQuickBookName('');
    setQuickBookWhatsapp('');
    setQuickBookError('');
    setQuickBookWhatsappError('');
  }, []);

  const closeQuickBookSlot = useCallback(() => {
    if (quickBooking) return;
    setQuickBookSlot(null);
    setQuickBookName('');
    setQuickBookWhatsapp('');
    setQuickBookError('');
    setQuickBookWhatsappError('');
  }, [quickBooking]);

  const executeQuickBook = useCallback(async () => {
    if (!quickBookSlot) return;
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
    setQuickBookWhatsappError('');
    setQuickBooking(true);
    setQuickBookError('');
    try {
      await api.admin.rafacall.createBooking({
        name: trimmedName,
        whatsapp: trimmedWa,
        startsAtUtcIso: quickBookSlot.startsAt,
        tz,
      });
      setQuickBookSlot(null);
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
  }, [quickBookSlot, quickBookName, quickBookWhatsapp, tz, load]);

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
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Agendamentos de chamadas com clientes</h1>
        <p className="mt-1 text-sm text-muted">
          Agrupado por dia em <span className="font-medium">{tz}</span>.
        </p>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="reschedule-modal-title" className="text-lg font-semibold text-foreground">
                  Alterar agendamento
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {rescheduleTarget.userName || 'Lead'} · fuso {rescheduleTarget.bookingTimezone || tz}
                </p>
              </div>
              <button
                type="button"
                onClick={closeReschedule}
                className="cursor-pointer rounded-full px-2 py-1 text-sm text-muted hover:bg-page hover:text-foreground"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {rescheduleError ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {rescheduleError}
              </p>
            ) : null}

            {rescheduleLoading ? (
              <p className="mt-6 text-sm text-muted">A carregar horários…</p>
            ) : rescheduleAvailability ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Dia</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {rescheduleAvailability.days
                      .filter((d) => d.slots.length > 0)
                      .map((d) => (
                        <button
                          key={d.date}
                          type="button"
                          onClick={() => setRescheduleDate(d.date)}
                          className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            rescheduleDate === d.date
                              ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                              : 'border-border bg-card text-foreground hover:bg-page'
                          }`}
                        >
                          {prettyYmdPt(d.date, rescheduleTarget.bookingTimezone || tz)}
                        </button>
                      ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Horário</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(rescheduleAvailability.days.find((d) => d.date === rescheduleDate)?.slots ?? []).map(
                      (slot) => (
                        <button
                          key={slot.startsAt}
                          type="button"
                          disabled={reschedulingBookingId === rescheduleTarget.id}
                          onClick={async () => {
                            const leadTz = rescheduleTarget.bookingTimezone?.trim() || tz;
                            const label = formatSlotTimeInTz(slot.startsAt, leadTz);
                            const ok = window.confirm(
                              `Confirmar novo horário?\n\n${rescheduleTarget.userName}\n${prettyYmdPt(rescheduleDate, leadTz)} · ${label}`,
                            );
                            if (!ok) return;
                            setReschedulingBookingId(rescheduleTarget.id);
                            setRescheduleError('');
                            try {
                              await api.admin.rafacall.rescheduleBooking(rescheduleTarget.id, {
                                newStartsAtUtcIso: slot.startsAt,
                                tz: leadTz,
                              });
                              closeReschedule();
                              await load();
                            } catch (e) {
                              setRescheduleError(
                                e instanceof Error ? e.message : 'Não foi possível reagendar.',
                              );
                            } finally {
                              setReschedulingBookingId(null);
                            }
                          }}
                          className="cursor-pointer rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {formatSlotTimeInTz(slot.startsAt, rescheduleTarget.bookingTimezone || tz)}
                        </button>
                      ),
                    )}
                  </div>
                  {(rescheduleAvailability.days.find((d) => d.date === rescheduleDate)?.slots ?? [])
                    .length === 0 ? (
                    <p className="mt-2 text-sm text-muted">Sem horários neste dia.</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {quickBookSlot ? (
        <FreeSlotBookModal
          date={quickBookSlot.date}
          startsAt={quickBookSlot.startsAt}
          endsAt={quickBookSlot.endsAt}
          tz={tz}
          name={quickBookName}
          whatsapp={quickBookWhatsapp}
          whatsappError={quickBookWhatsappError}
          error={quickBookError}
          isLoading={quickBooking}
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
          onClose={closeQuickBookSlot}
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

