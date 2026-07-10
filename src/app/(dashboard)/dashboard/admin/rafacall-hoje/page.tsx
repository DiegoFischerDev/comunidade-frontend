'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function WhatsAppLinkButton({ href }: { href: string }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
    >
      <WhatsAppIcon className="h-4 w-4 shrink-0" />
      WhatsApp
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
      className: 'bg-page text-muted',
      cardClassName: 'border-border bg-primary-1',
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
};

function buildKanbanDays(
  schedule: SchedulePayload | null,
  allBlocks: BlockItem[],
  timeZone: string,
): KanbanDay[] {
  const dates = new Set<string>();
  for (const day of schedule?.days ?? []) dates.add(day.date);
  for (const block of allBlocks) {
    dates.add(ymdInTz(new Date(block.startsAt), timeZone));
  }
  return Array.from(dates)
    .sort((a, b) => a.localeCompare(b))
    .map((date) => ({
      date,
      bookings: schedule?.days.find((d) => d.date === date)?.items ?? [],
      blockedSlots: blocksForYmd(allBlocks, date, timeZone),
    }));
}

function formatBlockSlot(block: BlockItem, timeZone: string): string {
  const start = new Date(block.startsAt);
  const end = new Date(block.endsAt);
  return `${start.toLocaleTimeString('pt-PT', { timeZone, hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString('pt-PT', { timeZone, hour: '2-digit', minute: '2-digit' })}`;
}

function BookingActions({
  row,
  slot,
  waHref,
  reschedulingBookingId,
  completingBookingId,
  cancelingBookingId,
  onReschedule,
  onComplete,
  onCancel,
}: {
  row: ScheduleItem;
  slot: string;
  waHref: string;
  reschedulingBookingId: string | null;
  completingBookingId: string | null;
  cancelingBookingId: string | null;
  onReschedule: (row: ScheduleItem) => void;
  onComplete: (row: ScheduleItem, slot: string) => void;
  onCancel: (row: ScheduleItem, slot: string) => void;
}) {
  const editable = canManageBooking(row.status);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {waHref ? <WhatsAppLinkButton href={waHref} /> : null}
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

function BlockKanbanCard({
  block,
  tz,
  unblockingId,
  onUnblock,
}: {
  block: BlockItem;
  tz: string;
  unblockingId: string | null;
  onUnblock: (blockId: string) => void;
}) {
  const slot = formatBlockSlot(block, tz);
  const isUnblocking = unblockingId === block.id;

  return (
    <article className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs">
      <span className="min-w-0 shrink font-semibold tabular-nums text-red-900">{slot}</span>
      <span className="shrink-0 font-medium text-red-700">Ocupado</span>
      <button
        type="button"
        disabled={isUnblocking}
        onClick={() => onUnblock(block.id)}
        className="ml-auto shrink-0 cursor-pointer font-semibold text-red-800 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isUnblocking ? '…' : 'Desbloquear'}
      </button>
    </article>
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

function BookingKanbanCard({
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
  const { label: statusLabel, className: statusClass, cardClassName } = bookingStatusDisplay(row.status);
  const messageTz = row.bookingTimezone?.trim() || tz;
  const waHref = row.whatsappDigits
    ? waUrl(row.whatsappDigits, row.userName, row.startsAt, messageTz)
    : '';

  return (
    <article className={`rounded-xl border p-3 shadow-sm ${cardClassName}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{slot}</p>
        <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusClass}`}>
          {statusLabel}
        </span>
      </div>
      <p className="mt-2 font-medium text-foreground">{row.userName || '—'}</p>
      {row.whatsappDigits ? (
        <p className="mt-0.5 text-xs text-muted">{formatWhatsappDigits(row.whatsappDigits)}</p>
      ) : null}
      <div className="mt-3 border-t border-border pt-3">
        <BookingActions
          row={row}
          slot={slot}
          waHref={waHref}
          reschedulingBookingId={reschedulingBookingId}
          completingBookingId={completingBookingId}
          cancelingBookingId={cancelingBookingId}
          onReschedule={onReschedule}
          onComplete={onComplete}
          onCancel={onCancel}
        />
      </div>
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
  onReschedule,
  onComplete,
  onCancel,
  onUnblock,
}: {
  kanbanDay: KanbanDay;
  tz: string;
  className?: string;
  reschedulingBookingId: string | null;
  completingBookingId: string | null;
  cancelingBookingId: string | null;
  unblockingId: string | null;
  onReschedule: (row: ScheduleItem) => void;
  onComplete: (row: ScheduleItem, slot: string) => void;
  onCancel: (row: ScheduleItem, slot: string) => void;
  onUnblock: (blockId: string) => void;
}) {
  const bookings = [...kanbanDay.bookings].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const blockedSlots = [...kanbanDay.blockedSlots].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const totalItems = bookings.length + blockedSlots.length;

  type KanbanEntry =
    | { kind: 'booking'; startsAt: string; booking: ScheduleItem }
    | { kind: 'block'; startsAt: string; block: BlockItem };

  const entries: KanbanEntry[] = [
    ...bookings.map((booking) => ({ kind: 'booking' as const, startsAt: booking.startsAt, booking })),
    ...blockedSlots.map((block) => ({ kind: 'block' as const, startsAt: block.startsAt, block })),
  ].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return (
    <section
      className={`flex h-full min-h-[200px] flex-col rounded-xl border border-border bg-card shadow-sm ${className}`.trim()}
      aria-label={`Agendamentos de ${formatDayKanbanTitle(kanbanDay.date, tz)}`}
    >
      <header className="border-b border-border bg-page px-3 py-2.5">
        <p className="text-sm font-semibold capitalize text-foreground">
          {formatDayKanbanTitle(kanbanDay.date, tz)}
        </p>
        <p className="text-xs text-muted">
          {totalItems} {totalItems === 1 ? 'item' : 'itens'}
          {blockedSlots.length > 0 ? (
            <span className="text-red-700"> · {blockedSlots.length} ocupado(s)</span>
          ) : null}
        </p>
      </header>
      <div className="flex flex-1 flex-col gap-3 p-3">
        {entries.length === 0 ? (
          <p className="text-xs text-muted">Sem itens neste dia.</p>
        ) : null}
        {entries.map((entry) =>
          entry.kind === 'booking' ? (
            <BookingKanbanCard
              key={`b:${entry.booking.id}`}
              row={entry.booking}
              tz={tz}
              reschedulingBookingId={reschedulingBookingId}
              completingBookingId={completingBookingId}
              cancelingBookingId={cancelingBookingId}
              onReschedule={onReschedule}
              onComplete={onComplete}
              onCancel={onCancel}
            />
          ) : (
            <BlockKanbanCard
              key={`x:${entry.block.id}`}
              block={entry.block}
              tz={tz}
              unblockingId={unblockingId}
              onUnblock={onUnblock}
            />
          ),
        )}
      </div>
    </section>
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
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [blocksError, setBlocksError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availability, setAvailability] = useState<
    Awaited<ReturnType<typeof api.rafacall.availability>> | null
  >(null);
  const [schedLoading, setSchedLoading] = useState(false);
  const [slotMutatingKey, setSlotMutatingKey] = useState<string | null>(null);
  const [blocksModalOpen, setBlocksModalOpen] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createWhatsapp, setCreateWhatsapp] = useState('');
  const [createWhatsappError, setCreateWhatsappError] = useState('');
  const [createAvailability, setCreateAvailability] = useState<
    Awaited<ReturnType<typeof api.rafacall.guestAvailability>> | null
  >(null);
  const [createDate, setCreateDate] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [creatingBooking, setCreatingBooking] = useState(false);

  const kanbanDays = useMemo(
    () => buildKanbanDays(data, blocks, tz),
    [data, blocks, tz],
  );

  const tabletKanbanSlides = useMemo(
    () => chunkKanbanDays(kanbanDays, 2),
    [kanbanDays],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const fromUtcIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const toUtcIso = addDays(new Date(), 14).toISOString();
      const [res, blocksRes] = await Promise.all([
        api.admin.rafacall.schedule(tz),
        api.admin.rafacall.blocks({ fromUtcIso, toUtcIso }),
      ]);
      setData(res);
      setBlocks(blocksRes.blocks);
    } catch (e) {
      setData(null);
      setBlocks([]);
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
      setSelectedDate((prev) => {
        // Mantém seleção atual se ainda existir na janela.
        if (prev && avail.days.some((d) => d.date === prev)) return prev;
        const firstDayWithSlots = avail.days.find((d) => d.slots.length > 0)?.date ?? '';
        const firstAnyDay = avail.days[0]?.date ?? '';
        return firstDayWithSlots || firstAnyDay;
      });
    } catch (e) {
      setBlocks([]);
      setAvailability(null);
      setBlocksError(e instanceof Error ? e.message : 'Erro ao carregar bloqueios/horários.');
    } finally {
      setBlocksLoading(false);
      setSchedLoading(false);
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

  const handleCancelBooking = useCallback(async (row: ScheduleItem, slot: string) => {
    const ok = window.confirm(
      `Cancelar este agendamento?\n\nCliente: ${row.userName}\nHorário: ${slot}`,
    );
    if (!ok) return;
    setCancelingBookingId(row.id);
    try {
      await api.admin.rafacall.cancelBooking(row.id, 'admin_cancel');
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Não foi possível cancelar.';
      setError(message);
      if (/não encontrado|removido|realizado/i.test(message)) {
        await load();
      }
    } finally {
      setCancelingBookingId(null);
    }
  }, [load]);

  const handleCompleteBooking = useCallback(async (row: ScheduleItem, slot: string) => {
    const ok = window.confirm(
      `Marcar como realizado?\n\nCliente: ${row.userName}\nHorário: ${slot}`,
    );
    if (!ok) return;
    setCompletingBookingId(row.id);
    try {
      await api.admin.rafacall.completeBooking(row.id);
      await load();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Não foi possível marcar como realizado.';
      setError(message);
      if (/não encontrado|removido/i.test(message)) {
        await load();
      }
    } finally {
      setCompletingBookingId(null);
    }
  }, [load]);

  const handleUnblock = useCallback(async (blockId: string) => {
    const ok = window.confirm('Desbloquear este horário?');
    if (!ok) return;
    setUnblockingId(blockId);
    try {
      await api.admin.rafacall.deleteBlock(blockId);
      await load();
      if (blocksModalOpen) void loadBlocksAndAvailability();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível desbloquear.');
    } finally {
      setUnblockingId(null);
    }
  }, [load, blocksModalOpen, loadBlocksAndAvailability]);

  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    setCreateAvailability(null);
    setCreateDate('');
    setCreateError('');
    setCreateWhatsappError('');
  }, []);

  const openCreateModal = useCallback(async () => {
    setCreateModalOpen(true);
    setCreateError('');
    setCreateLoading(true);
    setCreateAvailability(null);
    try {
      const from = ymdInTz(new Date(), tz);
      const to = ymdInTz(addDays(new Date(), 14), tz);
      const avail = await api.rafacall.guestAvailability({ from, to, tz });
      setCreateAvailability(avail);
      const firstDay = avail.days.find((d) => d.slots.length > 0)?.date ?? avail.days[0]?.date ?? '';
      setCreateDate(firstDay);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Erro ao carregar horários.');
    } finally {
      setCreateLoading(false);
    }
  }, [tz]);

  const closeBlocksModal = useCallback(() => {
    setBlocksModalOpen(false);
    setBlocksError('');
  }, []);

  const openBlocksModal = useCallback(() => {
    setBlocksModalOpen(true);
    void loadBlocksAndAvailability();
  }, [loadBlocksAndAvailability]);

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Agendamentos de chamadas com clientes</h1>
          <p className="mt-1 text-sm text-muted">
            Agrupado por dia em <span className="font-medium">{tz}</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openBlocksModal}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-page"
          >
            Bloquear horários
          </button>
          <button
            type="button"
            onClick={() => void openCreateModal()}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-brand-primary bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Adicionar agendamento
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {kanbanDays.length === 0 && !loading ? (
        <p className="mt-6 text-sm text-muted">Nenhum agendamento ou horário bloqueado.</p>
      ) : null}

      {kanbanDays.length > 0 ? (
        <div className="mt-6">
          <div className="hidden items-start gap-4 overflow-x-auto pb-2 lg:flex">
            {kanbanDays.map((kanbanDay) => (
              <DayKanbanColumn
                key={kanbanDay.date}
                kanbanDay={kanbanDay}
                tz={tz}
                className="w-[300px] shrink-0"
                reschedulingBookingId={reschedulingBookingId}
                completingBookingId={completingBookingId}
                cancelingBookingId={cancelingBookingId}
                unblockingId={unblockingId}
                onReschedule={(item) => void openReschedule(item)}
                onComplete={(item, slotLabel) => void handleCompleteBooking(item, slotLabel)}
                onCancel={(item, slotLabel) => void handleCancelBooking(item, slotLabel)}
                onUnblock={(blockId) => void handleUnblock(blockId)}
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
                        onReschedule={(item) => void openReschedule(item)}
                        onComplete={(item, slotLabel) => void handleCompleteBooking(item, slotLabel)}
                        onCancel={(item, slotLabel) => void handleCancelBooking(item, slotLabel)}
                        onUnblock={(blockId) => void handleUnblock(blockId)}
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
                    onReschedule={(item) => void openReschedule(item)}
                    onComplete={(item, slotLabel) => void handleCompleteBooking(item, slotLabel)}
                    onCancel={(item, slotLabel) => void handleCancelBooking(item, slotLabel)}
                    onUnblock={(blockId) => void handleUnblock(blockId)}
                  />
                </div>
              ))}
            </HorizontalSnapCarousel>
          </div>
        </div>
      ) : null}

      {blocksModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="blocks-modal-title"
          onClick={closeBlocksModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="blocks-modal-title" className="text-lg font-semibold text-foreground">
                  Bloquear horários
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Marca slots como ocupados para eles não aparecerem para o cliente.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void loadBlocksAndAvailability()}
                  disabled={blocksLoading || schedLoading}
                  className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-page disabled:opacity-50"
                >
                  {blocksLoading || schedLoading ? 'A carregar…' : 'Atualizar'}
                </button>
                <button
                  type="button"
                  onClick={closeBlocksModal}
                  className="cursor-pointer rounded-full px-2 py-1 text-sm text-muted hover:bg-page hover:text-foreground"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>
            </div>

            {blocksError ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {blocksError}
              </p>
            ) : null}

            <div className="mt-4 grid gap-6 md:grid-cols-[260px_1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Dias</p>
                {blocksLoading || schedLoading ? (
                  <p className="mt-3 text-sm text-muted">A carregar…</p>
                ) : !availability ? (
                  <p className="mt-3 text-sm text-muted">Não foi possível carregar horários.</p>
                ) : availability.days.length === 0 ? (
                  <p className="mt-3 text-sm text-muted">Sem dias disponíveis.</p>
                ) : (
                  <div className="mt-3 max-h-[360px] space-y-2 overflow-auto pr-1">
                    {availability.days
                      .filter((d) => {
                        if (d.slots.length > 0) return true;
                        return blocks.some((b) => ymdInTz(new Date(b.startsAt), tz) === d.date);
                      })
                      .map((d) => {
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
                                : 'border-border bg-card hover:bg-page'
                            } ${!hasSlots ? 'opacity-70' : ''}`}
                          >
                            <span className="font-medium text-foreground">{prettyYmdPt(d.date, tz)}</span>
                            <span className="text-xs text-muted">{d.slots.length} horários</span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Horários</p>
                {blocksLoading || schedLoading ? (
                  <p className="mt-3 text-sm text-muted">A carregar…</p>
                ) : !availability ? (
                  <p className="mt-3 text-sm text-muted">Não foi possível carregar horários.</p>
                ) : (
                  (() => {
                    const day = availability.days.find((d) => d.date === selectedDate);
                    const slots = day?.slots ?? [];
                    const blockedToday = selectedDate ? blocksForYmd(blocks, selectedDate, tz) : [];
                    if (!day) {
                      return <p className="mt-3 text-sm text-muted">Escolhe um dia.</p>;
                    }
                    if (slots.length === 0 && blockedToday.length === 0) {
                      return (
                        <p className="mt-3 text-sm text-muted">
                          Este dia não tem horários disponíveis (talvez já estejam todos ocupados).
                        </p>
                      );
                    }

                    const blockedByStart = new Map(blocks.map((b) => [b.startsAt, b]));
                    const blockedItems = blockedToday.map((b) => ({
                      startsAt: b.startsAt,
                      endsAt: b.endsAt,
                      kind: 'blocked' as const,
                      blockId: b.id,
                    }));
                    const freeItems = slots.map((s) => ({
                      startsAt: s.startsAt,
                      endsAt: s.endsAt,
                      kind: 'free' as const,
                    }));
                    const items = [...freeItems, ...blockedItems].sort((a, b) =>
                      a.startsAt.localeCompare(b.startsAt),
                    );

                    return (
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {items.map((s) => {
                          const isBlocked =
                            s.kind === 'blocked' ? true : blockedByStart.has(s.startsAt);
                          const mutKey =
                            s.kind === 'blocked' ? `blocked:${s.blockId}` : `slot:${s.startsAt}`;
                          const isMutating = slotMutatingKey === mutKey;
                          return (
                            <button
                              key={s.startsAt}
                              type="button"
                              disabled={isMutating}
                              onClick={async () => {
                                setSlotMutatingKey(mutKey);
                                setBlocksError('');
                                try {
                                  if (isBlocked) {
                                    if (s.kind === 'blocked') {
                                      await api.admin.rafacall.deleteBlock(s.blockId);
                                    } else {
                                      const b = blockedByStart.get(s.startsAt);
                                      if (b) await api.admin.rafacall.deleteBlock(b.id);
                                    }
                                  } else {
                                    await api.admin.rafacall.createBlock({
                                      startsAtUtcIso: s.startsAt,
                                      endsAtUtcIso: s.endsAt,
                                      reason: 'admin_block',
                                    });
                                  }
                                  void loadBlocksAndAvailability();
                                  void load();
                                } catch (e) {
                                  setBlocksError(
                                    e instanceof Error ? e.message : 'Erro ao atualizar bloqueio.',
                                  );
                                } finally {
                                  setSlotMutatingKey(null);
                                }
                              }}
                              className={`cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                                isBlocked
                                  ? 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100'
                                  : 'border-border bg-card text-foreground hover:bg-page'
                              }`}
                              title={s.startsAt}
                            >
                              {formatSlotTimeInTz(s.startsAt, tz)}
                              <span className="mt-0.5 block text-[11px] font-medium">
                                {isMutating ? 'Alterando…' : isBlocked ? 'Ocupado' : 'Livre'}
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
        </div>
      ) : null}

      {createModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-booking-modal-title"
          onClick={closeCreateModal}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="create-booking-modal-title" className="text-lg font-semibold text-foreground">
                  Adicionar agendamento
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Cria um agendamento manualmente e envia confirmação por WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="cursor-pointer rounded-full px-2 py-1 text-sm text-muted hover:bg-page hover:text-foreground"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {createError ? (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {createError}
              </p>
            ) : null}

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground" htmlFor="admin-create-name">
                  Nome do cliente
                </label>
                <input
                  id="admin-create-name"
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-border bg-page px-4 py-2.5 text-sm text-foreground outline-none focus:border-brand-primary"
                  placeholder="Nome"
                />
              </div>
              <LoginWhatsappFields
                idPrefix="admin-create-booking"
                label="WhatsApp"
                value={createWhatsapp}
                error={createWhatsappError}
                disabled={creatingBooking}
                onChange={(v) => {
                  setCreateWhatsapp(v);
                  if (createWhatsappError) setCreateWhatsappError('');
                  if (createError) setCreateError('');
                }}
              />
            </div>

            {createLoading ? (
              <p className="mt-6 text-sm text-muted">A carregar horários…</p>
            ) : createAvailability ? (
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">Dia</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {createAvailability.days
                      .filter((d) => d.slots.length > 0)
                      .map((d) => (
                        <button
                          key={d.date}
                          type="button"
                          onClick={() => setCreateDate(d.date)}
                          className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            createDate === d.date
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
                    {(createAvailability.days.find((d) => d.date === createDate)?.slots ?? []).map(
                      (slot) => (
                        <button
                          key={slot.startsAt}
                          type="button"
                          disabled={creatingBooking}
                          onClick={async () => {
                            const trimmedName = createName.trim();
                            const trimmedWa = createWhatsapp.replace(/\D/g, '');
                            if (trimmedName.length < 2) {
                              setCreateError('Indica o nome do cliente.');
                              return;
                            }
                            if (trimmedWa.length < 8) {
                              setCreateWhatsappError('Indica um WhatsApp válido com indicativo.');
                              return;
                            }
                            setCreateWhatsappError('');
                            const label = formatSlotTimeInTz(slot.startsAt, tz);
                            const ok = window.confirm(
                              `Confirmar agendamento?\n\n${trimmedName}\n${prettyYmdPt(createDate, tz)} · ${label}`,
                            );
                            if (!ok) return;
                            setCreatingBooking(true);
                            setCreateError('');
                            try {
                              await api.admin.rafacall.createBooking({
                                name: trimmedName,
                                whatsapp: trimmedWa,
                                startsAtUtcIso: slot.startsAt,
                                tz,
                              });
                              closeCreateModal();
                              setCreateName('');
                              setCreateWhatsapp('');
                              await load();
                            } catch (e) {
                              setCreateError(
                                e instanceof Error ? e.message : 'Não foi possível criar o agendamento.',
                              );
                            } finally {
                              setCreatingBooking(false);
                            }
                          }}
                          className="cursor-pointer rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {formatSlotTimeInTz(slot.startsAt, tz)}
                        </button>
                      ),
                    )}
                  </div>
                  {(createAvailability.days.find((d) => d.date === createDate)?.slots ?? []).length ===
                  0 ? (
                    <p className="mt-2 text-sm text-muted">Sem horários neste dia.</p>
                  ) : null}
                </div>
              </div>
            ) : null}
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
    </div>
  );
}

