'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, getUserFacingApiError, type RafacallCrmItem, type RafacallCrmStatus } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { LoginWhatsappFields } from '@/components/auth/LoginWhatsappFields';
import { AdminVideoCallSlotPicker } from '@/components/rafacall/AdminVideoCallSlotPicker';
import { showRafacallAdminBookingErrorToast } from '@/lib/rafacall-admin-booking-errors';
import { toast } from '@/lib/toast';
import { CRM_IMMIGRATION_IMMEDIATE_VALUE, RAFA_CALL_CRM_PROPERTY_TYPOLOGY_LABELS, RAFA_CALL_CRM_PROPERTY_TYPOLOGY_ORDER, RAFA_CALL_CRM_STATUS_LABELS, RAFA_CALL_CRM_STATUS_ORDER, formatCrmPetLabel, formatCrmPropertyTypologyLabel, getCrmColumnTone, formatImmigrationDateLabel, formatImmigrationMonthYear, isCrmImmigrationImmediate, normalizeCrmBoardColumns, sortCrmBoardColumns, toImmigrationDateInputValue } from '@/lib/rafacall-crm';
import type { RafacallCrmPropertyTypology } from '@/lib/rafacall-crm';
import {
  CENTERED_PEEK_CAROUSEL_ITEM,
  CENTERED_PEEK_CAROUSEL_TRACK,
  HORIZONTAL_CAROUSEL_TRACK,
  HorizontalSnapCarousel,
} from '@/components/ui/horizontal-snap-carousel';

type CrmBoardPayload = Awaited<ReturnType<typeof api.admin.rafacall.crmBoard>>;
type CrmColumn = CrmBoardPayload['columns'][number];
type RafacallAvailabilityPayload = Awaited<
  ReturnType<typeof api.rafacall.guestAvailability>
>;

const CRM_COLUMN_WIDTH_REM = 17.5;
const CRM_COLUMN_GAP_REM = 1;
const CRM_COLUMN_MAX_WIDTH_CLASS = 'max-w-[17.5rem] max-md:max-w-none';
const CRM_MOBILE_MEDIA_QUERY = '(max-width: 767px)';

function isCrmMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(CRM_MOBILE_MEDIA_QUERY).matches;
}

function getColumnsPerSlide(containerWidthPx: number, totalColumns: number): number {
  if (isCrmMobileViewport()) return 1;
  return getColumnsThatFit(containerWidthPx, totalColumns);
}

function crmColumnGridTemplate(columnCount: number): string {
  return `repeat(${columnCount}, minmax(0, ${CRM_COLUMN_WIDTH_REM}rem))`;
}

function getColumnsThatFit(containerWidthPx: number, totalColumns: number): number {
  if (containerWidthPx <= 0 || totalColumns === 0) return 1;

  const rootFontSize =
    typeof window !== 'undefined'
      ? Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
      : 16;
  const columnWidthPx = CRM_COLUMN_WIDTH_REM * rootFontSize;
  const gapPx = CRM_COLUMN_GAP_REM * rootFontSize;
  const perSlide = Math.floor((containerWidthPx + gapPx) / (columnWidthPx + gapPx));

  return Math.max(1, Math.min(totalColumns, perSlide || 1));
}

type CrmKanbanColumnProps = {
  draggingItemId: string | null;
  savingItemId: string | null;
  onDropItem: (itemId: string, targetStatus: RafacallCrmStatus) => void;
  onOpenDetails: (item: RafacallCrmItem) => void;
  onRequestDelete: (item: RafacallCrmItem) => void;
  onDragStart: (itemId: string) => void;
  onDragEnd: () => void;
};

function CrmKanbanBoard({
  columns,
  columnProps,
}: {
  columns: CrmColumn[];
  columnProps: CrmKanbanColumnProps;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [columnsPerSlide, setColumnsPerSlide] = useState(1);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const mobile = isCrmMobileViewport();
      setIsMobileViewport(mobile);
      setColumnsPerSlide(getColumnsPerSlide(container.clientWidth, columns.length));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(container);
    const mobileMedia = window.matchMedia(CRM_MOBILE_MEDIA_QUERY);
    const onMobileMediaChange = () => update();
    mobileMedia.addEventListener('change', onMobileMediaChange);

    return () => {
      observer.disconnect();
      mobileMedia.removeEventListener('change', onMobileMediaChange);
    };
  }, [columns.length]);

  const fitsAllColumns = columnsPerSlide >= columns.length;

  if (fitsAllColumns) {
    return (
      <div
        ref={containerRef}
        className="grid justify-start gap-4"
        style={{ gridTemplateColumns: crmColumnGridTemplate(columns.length) }}
      >
        {columns.map((column) => (
          <CrmKanbanColumn
            key={column.status}
            column={column}
            {...columnProps}
            className="min-w-0 w-full"
          />
        ))}
      </div>
    );
  }

  const slides = chunkColumns(columns, columnsPerSlide);
  const useMobilePeekCarousel = isMobileViewport && columnsPerSlide === 1;

  if (useMobilePeekCarousel) {
    return (
      <div ref={containerRef} className="min-w-0">
        <HorizontalSnapCarousel
          slideCount={columns.length}
          ariaLabel="Colunas do CRM — deslize para ver mais colunas"
          className="sm:px-12"
          navStyle="prominent"
          hideNavWhenSingle={false}
          hideNavOnMobile
          centeredPeek
          navPlacement="inset"
          prevAriaLabel="Coluna anterior"
          nextAriaLabel="Coluna seguinte"
          trackClassName={`items-stretch ${HORIZONTAL_CAROUSEL_TRACK} ${CENTERED_PEEK_CAROUSEL_TRACK} max-md:gap-3 md:gap-4 md:px-0 pb-2`}
        >
          {columns.map((column) => (
            <div
              key={column.status}
              className={`${CENTERED_PEEK_CAROUSEL_ITEM} md:flex md:w-full md:max-w-none md:shrink-0 md:grow-0 md:basis-full md:snap-center`}
            >
              <CrmKanbanColumn
                column={column}
                {...columnProps}
                className="h-full min-w-0 w-full"
              />
            </div>
          ))}
        </HorizontalSnapCarousel>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-w-0">
      <HorizontalSnapCarousel
        slideCount={slides.length}
        ariaLabel="Colunas do CRM — deslize para ver mais colunas"
        className="sm:px-12"
        navStyle="prominent"
        hideNavWhenSingle={false}
        hideNavOnMobile
        navPlacement="inset"
        prevAriaLabel="Colunas anteriores"
        nextAriaLabel="Colunas seguintes"
        trackClassName={`items-stretch ${HORIZONTAL_CAROUSEL_TRACK} gap-4 pb-2`}
      >
        {slides.map((group, index) => (
          <div
            key={`crm-slide:${index}`}
            className="flex w-full shrink-0 grow-0 basis-full snap-center"
          >
            <div
              className="grid h-full w-full justify-start gap-4"
              style={{ gridTemplateColumns: crmColumnGridTemplate(group.length) }}
            >
              {group.map((column) => (
                <CrmKanbanColumn
                  key={column.status}
                  column={column}
                  {...columnProps}
                  className="min-w-0 w-full"
                />
              ))}
            </div>
          </div>
        ))}
      </HorizontalSnapCarousel>
    </div>
  );
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

function formatVideoCallSummary(item: Pick<
  RafacallCrmItem,
  'bookingStatus' | 'hasVideoCall' | 'startsAt' | 'bookingTimezone'
>): string {
  return formatVideoCallDetail(item).detail;
}

function formatVideoCallDetail(
  item: Pick<
    RafacallCrmItem,
    'bookingStatus' | 'hasVideoCall' | 'startsAt' | 'bookingTimezone'
  >,
): {
  title: string;
  detail: string;
  tone: 'scheduled' | 'completed' | 'cancelled' | 'none';
} {
  if (!item.hasVideoCall) {
    return {
      title: 'Vídeo chamada',
      detail: 'Sem agendamento',
      tone: 'none',
    };
  }

  const { bookingStatus: status, startsAt, bookingTimezone: timeZone } = item;

  if (status === 'CANCELLED') {
    return { title: 'Vídeo chamada', detail: 'Cancelada', tone: 'cancelled' };
  }

  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) {
    return { title: 'Vídeo chamada', detail: '—', tone: 'scheduled' };
  }

  const weekday = d
    .toLocaleDateString('pt-PT', { timeZone, weekday: 'long' })
    .replace(/-feira$/, '');
  const datePart = d.toLocaleDateString('pt-PT', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
  });
  const timePart = d.toLocaleTimeString('pt-PT', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  if (status === 'COMPLETED') {
    return {
      title: 'Vídeo chamada',
      detail: `Realizada em ${weekday}, ${datePart} · ${timePart}`,
      tone: 'completed',
    };
  }

  return {
    title: 'Vídeo chamada',
    detail: `Agendado para ${weekday}, ${datePart} · ${timePart}`,
    tone: 'scheduled',
  };
}

function formatVideoCallBadgeLabel(
  item: Pick<
    RafacallCrmItem,
    'bookingStatus' | 'hasVideoCall' | 'startsAt' | 'bookingTimezone'
  >,
): { label: string; tone: 'scheduled' | 'completed' } | null {
  if (!item.hasVideoCall) return null;
  if (item.bookingStatus === 'CANCELLED') return null;

  const d = new Date(item.startsAt);
  if (Number.isNaN(d.getTime())) return null;

  const timeZone = item.bookingTimezone?.trim() || 'Europe/Lisbon';
  const datePart = d.toLocaleDateString('pt-PT', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
  });
  const timePart = d.toLocaleTimeString('pt-PT', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return {
    label: `${datePart} · ${timePart}`,
    tone: item.bookingStatus === 'COMPLETED' ? 'completed' : 'scheduled',
  };
}

function getLeadInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" />
      <rect x="2" y="6" width="14" height="12" rx="2" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 8h.01" />
    </svg>
  );
}

function normalizeCrmComments(value: string | null | undefined): string {
  return (value ?? '').trim();
}

const CRM_COMMENT_POPUP_MAX_WIDTH_PX = 320;
const CRM_COMMENT_POPUP_MAX_HEIGHT_PX = 192;
const CRM_COMMENT_POPUP_GAP_PX = 6;

function CrmCommentInfoBadge({ comments }: { comments: string }) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout>>();
  const [open, setOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState<{
    top: number;
    left: number;
    maxWidth: number;
    transform?: string;
  } | null>(null);

  const show = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setOpen(true);
  }, []);

  const scheduleHide = useCallback(() => {
    hideTimeoutRef.current = globalThis.setTimeout(() => setOpen(false), 120);
  }, []);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const margin = 8;
      const maxWidth = Math.min(
        CRM_COMMENT_POPUP_MAX_WIDTH_PX,
        window.innerWidth - margin * 2,
      );
      let left = rect.left;
      if (left + maxWidth > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - margin - maxWidth);
      }
      if (left < margin) left = margin;

      const estimatedHeight = CRM_COMMENT_POPUP_MAX_HEIGHT_PX + 48;
      const spaceBelow = window.innerHeight - rect.bottom - CRM_COMMENT_POPUP_GAP_PX;
      const spaceAbove = rect.top - CRM_COMMENT_POPUP_GAP_PX;
      const showAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

      if (showAbove) {
        setPopupStyle({
          top: rect.top - CRM_COMMENT_POPUP_GAP_PX,
          left,
          maxWidth,
          transform: 'translateY(-100%)',
        });
        return;
      }

      setPopupStyle({
        top: rect.bottom + CRM_COMMENT_POPUP_GAP_PX,
        left,
        maxWidth,
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  useEffect(
    () => () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    },
    [],
  );

  return (
    <>
      <span
        ref={anchorRef}
        tabIndex={0}
        className="inline-flex h-5 w-5 shrink-0 cursor-default items-center justify-center rounded-full text-muted/60 transition-colors hover:bg-brand-primary/10 hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
        aria-label="Cliente com comentário"
        onMouseDown={(event) => event.stopPropagation()}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onFocus={show}
        onBlur={scheduleHide}
      >
        <InfoIcon className="h-3.5 w-3.5" />
      </span>
      {open && popupStyle && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="tooltip"
              style={{
                position: 'fixed',
                top: popupStyle.top,
                left: popupStyle.left,
                maxWidth: popupStyle.maxWidth,
                transform: popupStyle.transform,
                zIndex: 130,
              }}
              className="w-max rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground shadow-lg"
              onMouseEnter={show}
              onMouseLeave={scheduleHide}
            >
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Comentário
              </p>
              <p className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words">{comments}</p>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

function openNativeDatePicker(input: HTMLInputElement | null) {
  if (!input) return;
  if ('showPicker' in input && typeof input.showPicker === 'function') {
    try {
      void input.showPicker();
      return;
    } catch {
      // Safari / contextos restritos podem bloquear showPicker.
    }
  }
  input.click();
}

function ymdInTzFromIso(utcIso: string, timeZone: string): string {
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(d);
}

function ymdInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function hmInTzFromIso(utcIso: string, timeZone: string): string {
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

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
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
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

function localDateTimeInTzToUtcIso(
  timeZone: string,
  ymd: string,
  hm: string,
): string | null {
  const dateMatch = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = hm.match(/^(\d{1,2}):(\d{2})$/);
  if (!dateMatch || !timeMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  const offset = tzOffsetMinutes(timeZone, guess);
  const utc = new Date(guess.getTime() - offset * 60000);
  if (Number.isNaN(utc.getTime())) return null;
  return utc.toISOString();
}

function toVideoCallDateDraft(item: RafacallCrmItem): string {
  if (!item.hasVideoCall) return '';
  return ymdInTzFromIso(item.startsAt, item.bookingTimezone);
}

function toVideoCallTimeDraft(item: RafacallCrmItem): string {
  if (!item.hasVideoCall) return '';
  return hmInTzFromIso(item.startsAt, item.bookingTimezone);
}

function formatVideoCallDraftLabel(dateDraft: string, timeDraft: string, timeZone: string): string | null {
  if (!dateDraft.trim() || !timeDraft.trim()) return null;
  const iso = localDateTimeInTzToUtcIso(timeZone, dateDraft, timeDraft);
  if (!iso) return null;
  return formatVideoCallDetail({
    hasVideoCall: true,
    bookingStatus: 'SCHEDULED',
    startsAt: iso,
    bookingTimezone: timeZone,
  }).detail;
}

function bookingStatusLabel(status: RafacallCrmItem['bookingStatus']): string {
  if (status === 'COMPLETED') return 'Reunião realizada';
  if (status === 'SCHEDULED') return 'Agendado';
  return 'Cancelado';
}

function normalizeCrmSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

function buildCrmItemSearchHaystack(item: RafacallCrmItem): string {
  const parts = [
    item.userName,
    item.whatsappDigits,
    formatWhatsappDigits(item.whatsappDigits),
    item.crmComments,
    RAFA_CALL_CRM_STATUS_LABELS[item.crmStatus],
    item.crmStatus,
    bookingStatusLabel(item.bookingStatus),
    item.bookingStatus,
    formatImmigrationMonthYear(item.crmExpectedImmigrationAt),
    formatImmigrationDateLabel(item.crmExpectedImmigrationAt),
    item.crmExpectedImmigrationAt,
    item.crmPropertyTypology,
    formatCrmPropertyTypologyLabel(item.crmPropertyTypology),
    item.crmPreferredCity,
    formatCrmPetLabel(item.crmHasPet),
    item.crmHasPet === true ? 'pet animal estimação' : '',
    formatVideoCallSummary(item),
    formatVideoCallBadgeLabel(item)?.label,
    item.bookingTimezone,
    item.bookingOrigin === 'USER_PAID' ? 'pago paga' : 'publico gratuito',
    item.id,
  ];

  return normalizeCrmSearchText(parts.filter(Boolean).join(' '));
}

function crmItemMatchesQuery(item: RafacallCrmItem, query: string): boolean {
  const normalizedQuery = normalizeCrmSearchText(query);
  if (!normalizedQuery) return true;

  if (buildCrmItemSearchHaystack(item).includes(normalizedQuery)) return true;

  const queryDigits = query.replace(/\D/g, '');
  if (queryDigits.length >= 3 && item.whatsappDigits.includes(queryDigits)) {
    return true;
  }

  return false;
}

function filterCrmColumns(columns: CrmColumn[], query: string): CrmColumn[] {
  if (!normalizeCrmSearchText(query)) return columns;
  return columns.map((column) => ({
    ...column,
    items: column.items.filter((item) => crmItemMatchesQuery(item, query)),
  }));
}

function countCrmClients(columns: CrmColumn[]): number {
  return columns.reduce((sum, column) => sum + column.items.length, 0);
}

function waUrl(digits: string, name: string): string {
  const who = (name || '').trim() || '!';
  const text = `Oi ${who}, tudo bem?`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function chunkColumns(columns: CrmColumn[], chunkSize: number): CrmColumn[][] {
  if (chunkSize < 1) return [columns];
  const chunks: CrmColumn[][] = [];
  for (let i = 0; i < columns.length; i += chunkSize) {
    chunks.push(columns.slice(i, i + chunkSize));
  }
  return chunks;
}

function moveItemBetweenColumns(
  columns: CrmColumn[],
  itemId: string,
  toStatus: RafacallCrmStatus,
  updatedItem?: RafacallCrmItem,
): CrmColumn[] {
  let movingItem: RafacallCrmItem | undefined = updatedItem;

  const withoutItem = columns.map((column) => {
    const item = column.items.find((entry) => entry.id === itemId);
    if (item) movingItem = updatedItem ?? item;
    return {
      ...column,
      items: column.items.filter((entry) => entry.id !== itemId),
    };
  });

  if (!movingItem) return columns;

  const nextItem: RafacallCrmItem = {
    ...movingItem,
    ...(updatedItem ?? {}),
    crmStatus: toStatus,
  };

  return sortCrmBoardColumns(
    withoutItem.map((column) =>
      column.status === toStatus
        ? { ...column, items: [...column.items, nextItem] }
        : column,
    ),
  );
}

function removeItemFromColumns(columns: CrmColumn[], itemId: string): CrmColumn[] {
  return columns.map((column) => ({
    ...column,
    items: column.items.filter((entry) => entry.id !== itemId),
  }));
}

function insertItemIntoColumns(columns: CrmColumn[], item: RafacallCrmItem): CrmColumn[] {
  return sortCrmBoardColumns(
    columns.map((column) =>
      column.status === item.crmStatus
        ? {
            ...column,
            items: column.items.some((entry) => entry.id === item.id)
              ? column.items.map((entry) => (entry.id === item.id ? item : entry))
              : [...column.items, item],
          }
        : {
            ...column,
            items: column.items.filter((entry) => entry.id !== item.id),
          },
    ),
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
    </svg>
  );
}

function CrmClientCard({
  item,
  isDragging,
  isSaving,
  onOpenDetails,
  onRequestDelete,
  onDragStart,
  onDragEnd,
}: {
  item: RafacallCrmItem;
  isDragging: boolean;
  isSaving: boolean;
  onOpenDetails: () => void;
  onRequestDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const name = item.userName?.trim() || 'Sem nome';
  const wa = formatWhatsappDigits(item.whatsappDigits);
  const immigrationDateLabel = formatImmigrationDateLabel(item.crmExpectedImmigrationAt);
  const isImmediateImmigration = isCrmImmigrationImmediate(item.crmExpectedImmigrationAt);
  const videoCallBadge = formatVideoCallBadgeLabel(item);
  const propertyTypologyLabel = formatCrmPropertyTypologyLabel(item.crmPropertyTypology);
  const preferredCityLabel = item.crmPreferredCity?.trim() || null;
  const hasPet = item.crmHasPet === true;
  const hasPreferences = Boolean(propertyTypologyLabel || preferredCityLabel || hasPet);
  const crmComments = normalizeCrmComments(item.crmComments);

  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', item.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`relative cursor-grab rounded-lg border border-border bg-page p-3 shadow-sm transition-opacity active:cursor-grabbing ${
        isDragging ? 'opacity-40' : ''
      } ${isSaving ? 'pointer-events-none opacity-60' : ''}`}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          {crmComments ? <CrmCommentInfoBadge comments={crmComments} /> : null}
          <p className="min-w-0 truncate text-sm font-semibold text-foreground">{name}</p>
        </div>
        <p className="mt-0.5 truncate text-[10px] text-muted/60">{wa}</p>
      </div>

      {immigrationDateLabel || videoCallBadge ? (
        <div className="mt-2 flex flex-nowrap items-center gap-1">
          {immigrationDateLabel ? (
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold whitespace-nowrap ${
                isImmediateImmigration
                  ? 'border-orange-200/90 bg-orange-50/90 text-orange-950'
                  : 'border-amber-200/90 bg-amber-50/90 text-amber-950'
              }`}
            >
              <CalendarIcon
                className={`h-3.5 w-3.5 shrink-0 ${
                  isImmediateImmigration ? 'text-orange-700' : 'text-amber-700'
                }`}
              />
              {immigrationDateLabel}
            </span>
          ) : null}
          {videoCallBadge ? (
            <span
              className={`inline-flex min-w-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold whitespace-nowrap ${
                videoCallBadge.tone === 'completed'
                  ? 'border-emerald-200/90 bg-emerald-50/90 text-emerald-950'
                  : 'border-sky-200/90 bg-sky-50/90 text-sky-950'
              }`}
            >
              <VideoIcon
                className={`h-3.5 w-3.5 shrink-0 ${
                  videoCallBadge.tone === 'completed' ? 'text-emerald-700' : 'text-sky-700'
                }`}
              />
              <span className="truncate">{videoCallBadge.label}</span>
            </span>
          ) : null}
        </div>
      ) : null}

      {hasPreferences ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {propertyTypologyLabel ? (
            <span className="inline-flex max-w-full items-center rounded-md border border-violet-200/90 bg-violet-50/90 px-2 py-1 text-[10px] font-medium text-violet-900">
              {propertyTypologyLabel}
            </span>
          ) : null}
          {preferredCityLabel ? (
            <span className="inline-flex max-w-full items-center rounded-md border border-sky-200/90 bg-sky-50/90 px-2 py-1 text-[10px] font-medium text-sky-900">
              {preferredCityLabel}
            </span>
          ) : null}
          {hasPet ? (
            <span className="inline-flex max-w-full items-center rounded-md border border-emerald-200/90 bg-emerald-50/90 px-2 py-1 text-[10px] font-medium text-emerald-900">
              PET
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {item.whatsappDigits ? (
          <a
            href={waUrl(item.whatsappDigits, name)}
            target="_blank"
            rel="noopener noreferrer"
            draggable={false}
            className="inline-flex min-h-8 items-center rounded-lg border border-border px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-card"
            onClick={(event) => event.stopPropagation()}
          >
            WhatsApp
          </a>
        ) : null}
        <button
          type="button"
          draggable={false}
          onClick={onOpenDetails}
          className="inline-flex min-h-8 cursor-pointer items-center rounded-lg border border-border px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-card"
        >
          Detalhes
        </button>
        <button
          type="button"
          draggable={false}
          onClick={(event) => {
            event.stopPropagation();
            onRequestDelete();
          }}
          className="inline-flex min-h-8 cursor-pointer items-center justify-center rounded-lg border border-border px-2.5 text-muted transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          aria-label={`Excluir ${name} do CRM`}
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}

function CrmKanbanColumn({
  column,
  draggingItemId,
  savingItemId,
  onDropItem,
  onOpenDetails,
  onRequestDelete,
  onDragStart,
  onDragEnd,
  className = '',
}: {
  column: CrmColumn;
  draggingItemId: string | null;
  savingItemId: string | null;
  onDropItem: (itemId: string, targetStatus: RafacallCrmStatus) => void;
  onOpenDetails: (item: RafacallCrmItem) => void;
  onRequestDelete: (item: RafacallCrmItem) => void;
  onDragStart: (itemId: string) => void;
  onDragEnd: () => void;
  className?: string;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const tone = getCrmColumnTone(column.status);

  return (
    <section
      className={`flex h-full min-h-[240px] w-full flex-col rounded-xl border shadow-sm transition-shadow ${CRM_COLUMN_MAX_WIDTH_CLASS} ${tone.column} ${tone.border} ${
        isDragOver ? `ring-2 ${tone.dragRing}` : ''
      } ${className}`.trim()}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragOver(false);
        const itemId = event.dataTransfer.getData('text/plain');
        if (itemId) onDropItem(itemId, column.status);
      }}
      aria-label={`Coluna ${column.label}`}
    >
      <header className={`border-b px-3 py-2.5 ${tone.header} ${tone.border}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} aria-hidden />
            <p className="truncate text-sm font-semibold text-foreground">{column.label}</p>
          </div>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${tone.badge}`}>
            {column.items.length}
          </span>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
        {column.items.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted">Arraste clientes para aqui</p>
        ) : (
          column.items.map((item) => (
            <CrmClientCard
              key={item.whatsappDigits || item.id}
              item={item}
              isDragging={draggingItemId === item.id}
              isSaving={savingItemId === item.id}
              onOpenDetails={() => onOpenDetails(item)}
              onRequestDelete={() => onRequestDelete(item)}
              onDragStart={() => onDragStart(item.id)}
              onDragEnd={onDragEnd}
            />
          ))
        )}
      </div>
    </section>
  );
}

function normalizePreferredCityDraft(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toPropertyTypologyDraft(
  value: RafacallCrmPropertyTypology | null | undefined,
): RafacallCrmPropertyTypology | '' {
  return value ?? '';
}

function CrmDeleteConfirmModal({
  item,
  saving,
  error,
  onConfirm,
  onClose,
}: {
  item: RafacallCrmItem;
  saving: boolean;
  error: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const name = item.userName?.trim() || 'Sem nome';

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crm-delete-confirm-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <TrashIcon className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
          <div className="min-w-0">
            <h2 id="crm-delete-confirm-title" className="text-base font-semibold text-foreground">
              Excluir lead do CRM?
            </h2>
            <p className="mt-1 text-sm text-muted">
              O cliente deixa de aparecer no kanban. Se tiver vídeo chamada agendada, o horário
              também é removido da página de agendamentos.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Cliente</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{name}</p>
          <p className="mt-0.5 text-sm text-foreground/90">
            {formatWhatsappDigits(item.whatsappDigits)}
          </p>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={saving}
            onClick={onConfirm}
            className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <TrashIcon className="h-4 w-4" />
            {saving ? 'A excluir…' : 'Confirmar exclusão'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-[14px] border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-page disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CrmNewClientModal({
  name,
  whatsapp,
  whatsappError,
  saving,
  error,
  onNameChange,
  onWhatsappChange,
  onConfirm,
  onClose,
}: {
  name: string;
  whatsapp: string;
  whatsappError: string;
  saving: boolean;
  error: string;
  onNameChange: (value: string) => void;
  onWhatsappChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const whatsappDigits = whatsapp.replace(/\D/g, '');
  const canSubmit = name.trim().length >= 2 && whatsappDigits.length >= 8;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crm-new-client-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[20px] border border-border bg-card p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="crm-new-client-title" className="text-lg font-semibold text-foreground">
              Novo cliente
            </h2>
            <p className="mt-1 text-sm text-muted">
              Adiciona um lead ao CRM com nome e WhatsApp. Entra na coluna «Sem data para imigar».
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-sm text-muted transition-colors hover:bg-page hover:text-foreground disabled:opacity-50"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground" htmlFor="crm-new-client-name">
              Nome
            </label>
            <input
              id="crm-new-client-name"
              type="text"
              value={name}
              disabled={saving}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="Nome do cliente"
              className="mt-2 w-full rounded-xl border border-border bg-page px-3.5 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-brand-accent disabled:opacity-50"
            />
          </div>

          <LoginWhatsappFields
            idPrefix="crm-new-client"
            value={whatsapp}
            onChange={onWhatsappChange}
            disabled={saving}
            error={whatsappError}
            rememberInStorage={false}
          />
        </div>

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-[14px] border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-page disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={saving || !canSubmit}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-[14px] bg-brand-primary px-5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'A adicionar…' : 'Adicionar cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CrmStatusSelect({
  value,
  disabled,
  onChange,
}: {
  value: RafacallCrmStatus;
  disabled: boolean;
  onChange: (status: RafacallCrmStatus) => void;
}) {
  const tone = getCrmColumnTone(value);

  return (
    <div className="mt-4">
      <label htmlFor="crm-status" className="text-xs font-medium uppercase tracking-wide text-muted">
        Status
      </label>
      <div
        className={`relative mt-2 overflow-hidden rounded-xl border shadow-sm ${tone.column} ${tone.border}`}
      >
        <span
          className={`pointer-events-none absolute left-3.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full ${tone.dot}`}
          aria-hidden
        />
        <select
          id="crm-status"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value as RafacallCrmStatus)}
          className="w-full cursor-pointer appearance-none bg-transparent py-3 pl-9 pr-10 text-sm font-semibold text-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {RAFA_CALL_CRM_STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {RAFA_CALL_CRM_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </div>
  );
}

function CrmClientModal({
  item,
  commentsDraft,
  immigrationDateDraft,
  videoCallDateDraft,
  videoCallTimeDraft,
  videoCallAvailability,
  videoCallAvailabilityLoading,
  videoCallSelectedDate,
  propertyTypologyDraft,
  preferredCityDraft,
  hasPetDraft,
  saving,
  onCommentsChange,
  onImmigrationDateChange,
  onVideoCallDateChange,
  onVideoCallTimeChange,
  onVideoCallSelectedDateChange,
  onVideoCallSlotSelect,
  onPropertyTypologyChange,
  onPreferredCityChange,
  onHasPetChange,
  onStatusChange,
  onSave,
  onClose,
}: {
  item: RafacallCrmItem;
  commentsDraft: string;
  immigrationDateDraft: string;
  videoCallDateDraft: string;
  videoCallTimeDraft: string;
  videoCallAvailability: RafacallAvailabilityPayload | null;
  videoCallAvailabilityLoading: boolean;
  videoCallSelectedDate: string;
  propertyTypologyDraft: RafacallCrmPropertyTypology | '';
  preferredCityDraft: string;
  hasPetDraft: boolean | null;
  saving: boolean;
  onCommentsChange: (value: string) => void;
  onImmigrationDateChange: (value: string) => void;
  onVideoCallDateChange: (value: string) => void;
  onVideoCallTimeChange: (value: string) => void;
  onVideoCallSelectedDateChange: (value: string) => void;
  onVideoCallSlotSelect: (slot: { startsAt: string; endsAt: string }) => void;
  onPropertyTypologyChange: (value: RafacallCrmPropertyTypology | '') => void;
  onPreferredCityChange: (value: string) => void;
  onHasPetChange: (value: boolean | null) => void;
  onStatusChange: (status: RafacallCrmStatus) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const immigrationDateInputRef = useRef<HTMLInputElement>(null);
  const [immigrationOptionsOpen, setImmigrationOptionsOpen] = useState(false);
  const name = item.userName?.trim() || 'Sem nome';
  const bookingTimezone = item.bookingTimezone?.trim() || 'Europe/Lisbon';
  const isImmediateImmigration = isCrmImmigrationImmediate(immigrationDateDraft);
  const immigrationLabel = isImmediateImmigration
    ? 'Imediato'
    : formatImmigrationDateLabel(immigrationDateDraft);
  const hasImmigrationDate = Boolean(immigrationDateDraft.trim());
  const isCompletedVideoCall =
    item.hasVideoCall && item.bookingStatus === 'COMPLETED';
  const canEditVideoCall = !isCompletedVideoCall;
  const videoCall = formatVideoCallDetail(item);
  const videoCallDraftLabel = formatVideoCallDraftLabel(
    videoCallDateDraft,
    videoCallTimeDraft,
    bookingTimezone,
  );
  const hasScheduledVideoCallDraft = Boolean(
    videoCallDateDraft.trim() && videoCallTimeDraft.trim(),
  );
  const videoToneClass =
    isCompletedVideoCall
      ? 'border-emerald-200/80 bg-emerald-50/70 text-emerald-900'
      : hasScheduledVideoCallDraft || item.hasVideoCall
        ? 'border-sky-200/80 bg-sky-50/70 text-sky-900'
        : 'border-dashed border-border/80 bg-page/80 text-muted';
  const hasCommentsChanges =
    normalizeCrmComments(commentsDraft) !== normalizeCrmComments(item.crmComments);
  const hasImmigrationDateChanges =
    immigrationDateDraft !== toImmigrationDateInputValue(item.crmExpectedImmigrationAt);
  const hasVideoCallChanges =
    canEditVideoCall &&
    (videoCallDateDraft !== toVideoCallDateDraft(item) ||
      videoCallTimeDraft !== toVideoCallTimeDraft(item));
  const hasPropertyTypologyChanges =
    (propertyTypologyDraft || null) !== (item.crmPropertyTypology ?? null);
  const hasPreferredCityChanges =
    normalizePreferredCityDraft(preferredCityDraft) !==
    normalizePreferredCityDraft(item.crmPreferredCity ?? '');
  const hasPetChanges = hasPetDraft !== item.crmHasPet;
  const hasChanges =
    hasCommentsChanges ||
    hasImmigrationDateChanges ||
    hasVideoCallChanges ||
    hasPropertyTypologyChanges ||
    hasPreferredCityChanges ||
    hasPetChanges;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crm-client-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[20px] border border-border bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 border-b border-border bg-page px-5 pb-4 pt-5">
          <div className="flex items-start gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white shadow-sm"
              aria-hidden
            >
              {getLeadInitials(name)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 id="crm-client-modal-title" className="truncate text-lg font-semibold text-foreground">
                    {name}
                  </h2>
                  <p className="mt-0.5 text-sm text-muted">
                    {formatWhatsappDigits(item.whatsappDigits)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-sm text-muted transition-colors hover:bg-page hover:text-foreground"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <CrmStatusSelect
            value={item.crmStatus}
            disabled={saving}
            onChange={onStatusChange}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => setImmigrationOptionsOpen((open) => !open)}
              className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                hasImmigrationDate
                  ? isImmediateImmigration
                    ? 'border-orange-300/90 bg-orange-50/95 text-orange-950 hover:border-orange-400 hover:bg-orange-50'
                    : 'border-amber-200/90 bg-amber-50/90 text-amber-950 hover:border-amber-300 hover:bg-amber-50'
                  : 'border-dashed border-amber-200/70 bg-amber-50/40 text-amber-900/80 hover:border-amber-300 hover:bg-amber-50/70'
              }`}
              aria-expanded={immigrationOptionsOpen}
              aria-label="Imigração prevista — escolher opção"
            >
              <CalendarIcon
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  isImmediateImmigration ? 'text-orange-700' : 'text-amber-700'
                }`}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    isImmediateImmigration ? 'text-orange-800/80' : 'text-amber-800/80'
                  }`}
                >
                  Imigração prevista
                </p>
                <p
                  className={`mt-0.5 text-sm font-medium leading-snug ${
                    hasImmigrationDate
                      ? isImmediateImmigration
                        ? 'text-orange-950'
                        : 'text-amber-950'
                      : 'italic text-amber-900/70'
                  }`}
                >
                  {immigrationLabel ?? 'Sem data definida — clica para escolher'}
                </p>
              </div>
              <span
                className={`shrink-0 text-xs font-medium ${
                  isImmediateImmigration ? 'text-orange-800/70' : 'text-amber-800/70'
                }`}
              >
                {immigrationOptionsOpen ? 'Fechar' : 'Editar'}
              </span>
              <input
                ref={immigrationDateInputRef}
                id="crm-immigration-date"
                type="date"
                value={isImmediateImmigration ? '' : immigrationDateDraft}
                disabled={saving}
                onChange={(event) => {
                  onImmigrationDateChange(event.target.value);
                  setImmigrationOptionsOpen(false);
                }}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
              />
            </button>

            {immigrationOptionsOpen ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => openNativeDatePicker(immigrationDateInputRef.current)}
                className="inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-amber-200 bg-amber-50/80 px-3 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Escolher data
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  onImmigrationDateChange(CRM_IMMIGRATION_IMMEDIATE_VALUE);
                  setImmigrationOptionsOpen(false);
                }}
                className={`inline-flex min-h-9 cursor-pointer items-center rounded-lg border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isImmediateImmigration
                    ? 'border-orange-300 bg-orange-100 text-orange-950'
                    : 'border-orange-200 bg-orange-50/80 text-orange-900 hover:bg-orange-100'
                }`}
              >
                Imediato
              </button>
              {hasImmigrationDate ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    onImmigrationDateChange('');
                    setImmigrationOptionsOpen(false);
                  }}
                  className="inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Limpar
                </button>
              ) : null}
            </div>
            ) : null}
          </div>

          <div className={`mt-3 rounded-xl border px-3.5 py-3 ${videoToneClass}`}>
            <div className="flex items-start gap-3">
              <VideoIcon className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                  Vídeo chamada
                </p>
                <p className="mt-0.5 text-sm font-medium leading-snug">
                  {isCompletedVideoCall
                    ? videoCall.detail
                    : videoCallDraftLabel ?? videoCall.detail}
                </p>
                {!isCompletedVideoCall ? (
                  <p className="mt-1 text-xs opacity-80">
                    Horário de {bookingTimezone}
                  </p>
                ) : null}
              </div>
            </div>

            {canEditVideoCall ? (
              <div className="mt-3">
                <AdminVideoCallSlotPicker
                  key={item.id}
                  idPrefix="crm-video-call"
                  tz={bookingTimezone}
                  availability={videoCallAvailability}
                  isLoadingAvailability={videoCallAvailabilityLoading}
                  selectedDate={videoCallSelectedDate}
                  manualDate={videoCallDateDraft}
                  manualTime={videoCallTimeDraft}
                  disabled={saving}
                  onDateChange={onVideoCallSelectedDateChange}
                  onSlotSelect={onVideoCallSlotSelect}
                  onManualDateChange={onVideoCallDateChange}
                  onManualTimeChange={onVideoCallTimeChange}
                />
              </div>
            ) : null}

            {canEditVideoCall ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {(hasScheduledVideoCallDraft || item.hasVideoCall) ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => {
                      onVideoCallDateChange('');
                      onVideoCallTimeChange('');
                    }}
                    className="inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Remover agendamento
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-3 rounded-xl border border-violet-200/80 bg-violet-50/50 px-3.5 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-900/80">
              Preferências de imóvel
            </p>

            <div className="mt-3 space-y-3">
              <div>
                <label
                  className="block text-xs font-medium uppercase tracking-wide text-violet-900/70"
                  htmlFor="crm-property-typology"
                >
                  Tipologia
                </label>
                <select
                  id="crm-property-typology"
                  value={propertyTypologyDraft}
                  disabled={saving}
                  onChange={(event) =>
                    onPropertyTypologyChange(
                      event.target.value as RafacallCrmPropertyTypology | '',
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-brand-primary disabled:opacity-50"
                >
                  <option value="">Por definir</option>
                  {RAFA_CALL_CRM_PROPERTY_TYPOLOGY_ORDER.map((typology) => (
                    <option key={typology} value={typology}>
                      {RAFA_CALL_CRM_PROPERTY_TYPOLOGY_LABELS[typology]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="block text-xs font-medium uppercase tracking-wide text-violet-900/70"
                  htmlFor="crm-preferred-city"
                >
                  Cidade de preferência
                </label>
                <input
                  id="crm-preferred-city"
                  type="text"
                  value={preferredCityDraft}
                  disabled={saving}
                  onChange={(event) => onPreferredCityChange(event.target.value)}
                  placeholder="Ex.: Lisboa, Porto…"
                  className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-brand-primary disabled:opacity-50"
                />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-violet-900/70">
                  Tem PET?
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onHasPetChange(true)}
                    className={`inline-flex min-h-9 cursor-pointer items-center rounded-lg border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      hasPetDraft === true
                        ? 'border-emerald-300 bg-emerald-100 text-emerald-950'
                        : 'border-border bg-card text-foreground hover:bg-page'
                    }`}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onHasPetChange(false)}
                    className={`inline-flex min-h-9 cursor-pointer items-center rounded-lg border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      hasPetDraft === false
                        ? 'border-emerald-300 bg-emerald-100 text-emerald-950'
                        : 'border-border bg-card text-foreground hover:bg-page'
                    }`}
                  >
                    Não
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => onHasPetChange(null)}
                    className={`inline-flex min-h-9 cursor-pointer items-center rounded-lg border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      hasPetDraft === null
                        ? 'border-violet-300 bg-violet-100 text-violet-950'
                        : 'border-border bg-card text-foreground hover:bg-page'
                    }`}
                  >
                    Por definir
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <label
              className="text-xs font-medium uppercase tracking-wide text-muted"
              htmlFor="crm-comments"
            >
              Comentários
            </label>
            <textarea
              id="crm-comments"
              value={commentsDraft}
              disabled={saving}
              onChange={(event) => onCommentsChange(event.target.value)}
              rows={8}
              placeholder="Notas adicionadas manualmente sobre o cliente."
              className="mt-2 min-h-[160px] w-full resize-y rounded-xl border border-border bg-page px-3.5 py-3 text-sm leading-relaxed text-foreground outline-none transition-colors focus:border-brand-accent disabled:opacity-50"
            />

          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-page/70 px-5 py-4">
          <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-[14px] border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-page disabled:opacity-50"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !hasChanges}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-[14px] bg-brand-primary px-5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'A guardar…' : 'Guardar alterações'}
          </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CrmPage() {
  const { user } = useAuth();
  const [columns, setColumns] = useState<CrmColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [draggingFromStatus, setDraggingFromStatus] = useState<RafacallCrmStatus | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<RafacallCrmItem | null>(null);
  const [commentsDraft, setCommentsDraft] = useState('');
  const [immigrationDateDraft, setImmigrationDateDraft] = useState('');
  const [videoCallDateDraft, setVideoCallDateDraft] = useState('');
  const [videoCallTimeDraft, setVideoCallTimeDraft] = useState('');
  const [videoCallAvailability, setVideoCallAvailability] =
    useState<RafacallAvailabilityPayload | null>(null);
  const [videoCallAvailabilityLoading, setVideoCallAvailabilityLoading] = useState(false);
  const [videoCallSelectedDate, setVideoCallSelectedDate] = useState('');
  const [propertyTypologyDraft, setPropertyTypologyDraft] = useState<
    RafacallCrmPropertyTypology | ''
  >('');
  const [preferredCityDraft, setPreferredCityDraft] = useState('');
  const [hasPetDraft, setHasPetDraft] = useState<boolean | null>(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<RafacallCrmItem | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [filterQuery, setFilterQuery] = useState('');
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientWhatsapp, setNewClientWhatsapp] = useState('');
  const [newClientWhatsappError, setNewClientWhatsappError] = useState('');
  const [newClientError, setNewClientError] = useState('');
  const [newClientSaving, setNewClientSaving] = useState(false);

  const filteredColumns = useMemo(
    () => filterCrmColumns(columns, filterQuery),
    [columns, filterQuery],
  );
  const totalClients = useMemo(() => countCrmClients(columns), [columns]);
  const filteredClients = useMemo(() => countCrmClients(filteredColumns), [filteredColumns]);
  const isFiltering = normalizeCrmSearchText(filterQuery).length > 0;

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const board = await api.admin.rafacall.crmBoard();
      setColumns(sortCrmBoardColumns(normalizeCrmBoardColumns(board.columns)));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Não foi possível carregar o CRM.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') void loadBoard();
  }, [user?.role, loadBoard]);

  useEffect(() => {
    if (!selectedItem) {
      setVideoCallAvailability(null);
      setVideoCallAvailabilityLoading(false);
      setVideoCallSelectedDate('');
      return;
    }

    const canEditVideoCall =
      !(selectedItem.hasVideoCall && selectedItem.bookingStatus === 'COMPLETED');
    if (!canEditVideoCall) {
      setVideoCallAvailability(null);
      setVideoCallAvailabilityLoading(false);
      setVideoCallSelectedDate('');
      return;
    }

    const bookingTimezone = selectedItem.bookingTimezone?.trim() || 'Europe/Lisbon';
    const existingDate = toVideoCallDateDraft(selectedItem);
    let cancelled = false;

    setVideoCallAvailabilityLoading(true);
    setVideoCallAvailability(null);

    const from = ymdInTz(new Date(), bookingTimezone);
    const to = ymdInTz(addDays(new Date(), 14), bookingTimezone);
    const excludeBookingId =
      selectedItem.bookingStatus === 'SCHEDULED' && selectedItem.hasVideoCall
        ? selectedItem.id
        : undefined;

    void api.rafacall
      .guestAvailability({ from, to, tz: bookingTimezone, excludeBookingId })
      .then((availability) => {
        if (cancelled) return;
        setVideoCallAvailability(availability);
        const firstDay =
          availability.days.find((day) => day.slots.length > 0)?.date ??
          availability.days[0]?.date ??
          '';
        setVideoCallSelectedDate(existingDate || firstDay);
      })
      .catch(() => {
        if (cancelled) return;
        setVideoCallAvailability(null);
        setVideoCallSelectedDate(existingDate);
      })
      .finally(() => {
        if (!cancelled) setVideoCallAvailabilityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedItem?.id]);

  const findItemById = useCallback(
    (itemId: string): { item: RafacallCrmItem; status: RafacallCrmStatus } | null => {
      for (const column of columns) {
        const item = column.items.find((entry) => entry.id === itemId);
        if (item) return { item, status: column.status };
      }
      return null;
    },
    [columns],
  );

  const handleDropItem = useCallback(
    async (itemId: string, targetStatus: RafacallCrmStatus) => {
      const current = findItemById(itemId);
      if (!current || current.status === targetStatus) return;

      const previousColumns = columns;
      setSavingItemId(itemId);
      setColumns((prev) => moveItemBetweenColumns(prev, itemId, targetStatus));

      try {
        const updated = await api.admin.rafacall.updateCrm(itemId, {
          crmStatus: targetStatus,
        });
        setColumns((prev) =>
          moveItemBetweenColumns(prev, itemId, targetStatus, updated),
        );
        if (selectedItem?.id === itemId) {
          setSelectedItem(updated);
        }
      } catch (err) {
        setColumns(previousColumns);
        setError(
          err instanceof Error ? err.message : 'Não foi possível mover o cliente.',
        );
      } finally {
        setSavingItemId(null);
        setDraggingItemId(null);
        setDraggingFromStatus(null);
      }
    },
    [columns, findItemById, selectedItem?.id],
  );

  const handleDragStart = useCallback(
    (itemId: string) => {
      const current = findItemById(itemId);
      setDraggingItemId(itemId);
      setDraggingFromStatus(current?.status ?? null);
    },
    [findItemById],
  );

  const handleOpenDetails = useCallback((item: RafacallCrmItem) => {
    setSelectedItem(item);
    setCommentsDraft(item.crmComments ?? '');
    setImmigrationDateDraft(toImmigrationDateInputValue(item.crmExpectedImmigrationAt));
    setVideoCallDateDraft(toVideoCallDateDraft(item));
    setVideoCallTimeDraft(toVideoCallTimeDraft(item));
    setPropertyTypologyDraft(toPropertyTypologyDraft(item.crmPropertyTypology));
    setPreferredCityDraft(item.crmPreferredCity ?? '');
    setHasPetDraft(item.crmHasPet);
  }, []);

  const handleModalStatusChange = useCallback(
    async (status: RafacallCrmStatus) => {
      if (!selectedItem || selectedItem.crmStatus === status) return;

      const previousColumns = columns;
      const previousItem = selectedItem;
      setModalSaving(true);
      setColumns((prev) =>
        moveItemBetweenColumns(prev, selectedItem.id, status),
      );
      setSelectedItem((prev) => (prev ? { ...prev, crmStatus: status } : prev));

      try {
        const updated = await api.admin.rafacall.updateCrm(selectedItem.id, {
          crmStatus: status,
        });
        setSelectedItem(updated);
        setCommentsDraft(updated.crmComments ?? '');
        setImmigrationDateDraft(toImmigrationDateInputValue(updated.crmExpectedImmigrationAt));
        setVideoCallDateDraft(toVideoCallDateDraft(updated));
        setVideoCallTimeDraft(toVideoCallTimeDraft(updated));
        setPropertyTypologyDraft(toPropertyTypologyDraft(updated.crmPropertyTypology));
        setPreferredCityDraft(updated.crmPreferredCity ?? '');
        setHasPetDraft(updated.crmHasPet);
        setColumns((prev) =>
          moveItemBetweenColumns(prev, selectedItem.id, status, updated),
        );
      } catch (err) {
        setColumns(previousColumns);
        setSelectedItem(previousItem);
        showRafacallAdminBookingErrorToast(
          getUserFacingApiError(err, { context: 'Ao atualizar o estado' }),
          'Não foi possível atualizar o estado.',
        );
      } finally {
        setModalSaving(false);
      }
    },
    [columns, selectedItem],
  );

  const handleSave = useCallback(async () => {
    if (!selectedItem) return;

    const commentsChanged =
      normalizeCrmComments(commentsDraft) !== normalizeCrmComments(selectedItem.crmComments);
    const immigrationDateChanged =
      immigrationDateDraft !== toImmigrationDateInputValue(selectedItem.crmExpectedImmigrationAt);
    const canEditVideoCall =
      !(selectedItem.hasVideoCall && selectedItem.bookingStatus === 'COMPLETED');
    const videoCallChanged =
      canEditVideoCall &&
      (videoCallDateDraft !== toVideoCallDateDraft(selectedItem) ||
        videoCallTimeDraft !== toVideoCallTimeDraft(selectedItem));
    const propertyTypologyChanged =
      (propertyTypologyDraft || null) !== (selectedItem.crmPropertyTypology ?? null);
    const preferredCityChanged =
      normalizePreferredCityDraft(preferredCityDraft) !==
      normalizePreferredCityDraft(selectedItem.crmPreferredCity ?? '');
    const hasPetChanged = hasPetDraft !== selectedItem.crmHasPet;

    if (
      !commentsChanged &&
      !immigrationDateChanged &&
      !videoCallChanged &&
      !propertyTypologyChanged &&
      !preferredCityChanged &&
      !hasPetChanged
    ) {
      return;
    }

    const bookingTimezone = selectedItem.bookingTimezone?.trim() || 'Europe/Lisbon';
    let videoCallStartsAtUtcIso: string | null | undefined;
    if (videoCallChanged) {
      if (!videoCallDateDraft.trim() && !videoCallTimeDraft.trim()) {
        videoCallStartsAtUtcIso = null;
      } else if (!videoCallDateDraft.trim() || !videoCallTimeDraft.trim()) {
        toast.error('Indica data e hora da vídeo chamada.');
        return;
      } else {
        const startsAtUtc = localDateTimeInTzToUtcIso(
          bookingTimezone,
          videoCallDateDraft,
          videoCallTimeDraft,
        );
        if (!startsAtUtc) {
          toast.error('Data ou hora da vídeo chamada inválida.');
          return;
        }
        videoCallStartsAtUtcIso = startsAtUtc;
      }
    }

    setModalSaving(true);
    try {
      const updated = await api.admin.rafacall.updateCrm(selectedItem.id, {
        ...(commentsChanged ? { crmComments: commentsDraft } : {}),
        ...(immigrationDateChanged
          ? { crmExpectedImmigrationAt: immigrationDateDraft || null }
          : {}),
        ...(videoCallChanged
          ? {
              videoCallStartsAtUtcIso,
              videoCallTimezone: bookingTimezone,
            }
          : {}),
        ...(propertyTypologyChanged
          ? { crmPropertyTypology: propertyTypologyDraft || null }
          : {}),
        ...(preferredCityChanged
          ? { crmPreferredCity: normalizePreferredCityDraft(preferredCityDraft) }
          : {}),
        ...(hasPetChanged ? { crmHasPet: hasPetDraft } : {}),
      });
      setSelectedItem(updated);
      setCommentsDraft(updated.crmComments ?? '');
      setImmigrationDateDraft(toImmigrationDateInputValue(updated.crmExpectedImmigrationAt));
      setVideoCallDateDraft(toVideoCallDateDraft(updated));
      setVideoCallTimeDraft(toVideoCallTimeDraft(updated));
      setPropertyTypologyDraft(toPropertyTypologyDraft(updated.crmPropertyTypology));
      setPreferredCityDraft(updated.crmPreferredCity ?? '');
      setHasPetDraft(updated.crmHasPet);
      setColumns((prev) =>
        sortCrmBoardColumns(
          moveItemBetweenColumns(prev, updated.id, updated.crmStatus, updated),
        ),
      );
      setSelectedItem(null);
      setCommentsDraft('');
      setImmigrationDateDraft('');
      setVideoCallDateDraft('');
      setVideoCallTimeDraft('');
      setPropertyTypologyDraft('');
      setPreferredCityDraft('');
      setHasPetDraft(null);
      toast.success('Alterações guardadas com sucesso.');
    } catch (err) {
      const { shouldRefreshAvailability } = showRafacallAdminBookingErrorToast(
        getUserFacingApiError(err, { context: 'Ao guardar' }),
        'Não foi possível guardar as alterações.',
      );
      if (shouldRefreshAvailability && selectedItem) {
        const bookingTimezone = selectedItem.bookingTimezone?.trim() || 'Europe/Lisbon';
        const from = ymdInTz(new Date(), bookingTimezone);
        const to = ymdInTz(addDays(new Date(), 14), bookingTimezone);
        const excludeBookingId =
          selectedItem.bookingStatus === 'SCHEDULED' && selectedItem.hasVideoCall
            ? selectedItem.id
            : undefined;
        void api.rafacall
          .guestAvailability({ from, to, tz: bookingTimezone, excludeBookingId })
          .then(setVideoCallAvailability)
          .catch(() => undefined);
      }
    } finally {
      setModalSaving(false);
    }
  }, [
    commentsDraft,
    hasPetDraft,
    immigrationDateDraft,
    preferredCityDraft,
    propertyTypologyDraft,
    selectedItem,
    videoCallDateDraft,
    videoCallTimeDraft,
  ]);

  const handleRequestDelete = useCallback((item: RafacallCrmItem) => {
    setDeleteConfirmItem(item);
    setDeleteError('');
  }, []);

  const handleOpenNewClient = useCallback(() => {
    setNewClientOpen(true);
    setNewClientName('');
    setNewClientWhatsapp('');
    setNewClientWhatsappError('');
    setNewClientError('');
  }, []);

  const handleCreateClient = useCallback(async () => {
    const trimmedName = newClientName.trim();
    const whatsappDigits = newClientWhatsapp.replace(/\D/g, '');

    if (trimmedName.length < 2) {
      setNewClientError('Indica o nome do cliente.');
      return;
    }
    if (whatsappDigits.length < 8) {
      setNewClientWhatsappError('Indica um WhatsApp válido com indicativo do país.');
      return;
    }

    setNewClientSaving(true);
    setNewClientError('');
    setNewClientWhatsappError('');

    try {
      const created = await api.admin.rafacall.createCrmClient({
        name: trimmedName,
        whatsapp: whatsappDigits,
      });
      setColumns((prev) => insertItemIntoColumns(prev, created));
      setNewClientOpen(false);
      setNewClientName('');
      setNewClientWhatsapp('');
      handleOpenDetails(created);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Não foi possível adicionar o cliente.';
      if (message.toLowerCase().includes('whatsapp')) {
        setNewClientWhatsappError(message);
      } else {
        setNewClientError(message);
      }
    } finally {
      setNewClientSaving(false);
    }
  }, [handleOpenDetails, newClientName, newClientWhatsapp]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirmItem) return;

    const itemId = deleteConfirmItem.id;
    const previousColumns = columns;
    setDeleteSaving(true);
    setDeleteError('');
    setColumns((prev) => removeItemFromColumns(prev, itemId));

    try {
      await api.admin.rafacall.deleteCrm(itemId);
      if (selectedItem?.id === itemId) {
        setSelectedItem(null);
        setCommentsDraft('');
        setImmigrationDateDraft('');
        setVideoCallDateDraft('');
        setVideoCallTimeDraft('');
        setPropertyTypologyDraft('');
        setPreferredCityDraft('');
        setHasPetDraft(null);
      }
      setDeleteConfirmItem(null);
    } catch (err) {
      setColumns(previousColumns);
      setDeleteError(
        err instanceof Error ? err.message : 'Não foi possível excluir o lead.',
      );
    } finally {
      setDeleteSaving(false);
    }
  }, [columns, deleteConfirmItem, selectedItem?.id]);

  if (!user) return null;

  if (user.role !== 'ADMIN') {
    return (
      <div className="pt-6 md:pt-8">
        <h1 className="text-2xl font-semibold text-foreground">CRM</h1>
        <p className="mt-2 text-sm text-muted">Sem permissão para esta página.</p>
      </div>
    );
  }

  const columnProps = {
    draggingItemId,
    savingItemId,
    onDropItem: (itemId: string, targetStatus: RafacallCrmStatus) => {
      void handleDropItem(itemId, targetStatus);
    },
    onOpenDetails: handleOpenDetails,
    onRequestDelete: handleRequestDelete,
    onDragStart: handleDragStart,
    onDragEnd: () => {
      setDraggingItemId(null);
      setDraggingFromStatus(null);
    },
  };

  return (
    <div className="pt-6 md:pt-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">CRM</h1>
          <p className="mt-1 text-sm text-muted">
            Acompanhe o follow-up dos clientes após o agendamento. Arraste entre colunas
            para atualizar o estado.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenNewClient}
          disabled={loading || newClientSaving}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-[14px] bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Novo cliente
        </button>
      </div>

      <p className="mt-3 text-sm text-muted">
        {isFiltering
          ? `${filteredClients} de ${totalClients} cliente${totalClients === 1 ? '' : 's'} no pipeline`
          : `${totalClients} cliente${totalClients === 1 ? '' : 's'} no pipeline`}
      </p>

      {columns.length > 0 ? (
        <div className="relative mt-4 max-w-xl">
          <label className="sr-only" htmlFor="crm-filter">
            Filtrar clientes
          </label>
          <input
            id="crm-filter"
            type="search"
            value={filterQuery}
            onChange={(event) => setFilterQuery(event.target.value)}
            placeholder="Nome, WhatsApp, tipologia, cidade, PET, coluna, comentários…"
            className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-9 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted/80 focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
          />
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" />
          </svg>
          {isFiltering ? (
            <button
              type="button"
              onClick={() => setFilterQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded-md p-1.5 text-muted transition-colors hover:bg-page hover:text-foreground"
              aria-label="Limpar filtro"
            >
              ✕
            </button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {loading && columns.length === 0 ? (
        <p className="mt-6 text-sm text-muted">A carregar CRM…</p>
      ) : null}

      {!loading && columns.length > 0 && totalClients === 0 ? (
        <p className="mt-6 text-sm text-muted">
          Ainda não há clientes no CRM. Os agendamentos ativos aparecem aqui automaticamente.
        </p>
      ) : null}

      {!loading && isFiltering && filteredClients === 0 && totalClients > 0 ? (
        <p className="mt-6 text-sm text-muted">
          Nenhum cliente corresponde ao filtro.
        </p>
      ) : null}

      {columns.length > 0 && (!isFiltering || filteredClients > 0) ? (
        <div className="mt-6 min-w-0">
          <CrmKanbanBoard columns={filteredColumns} columnProps={columnProps} />
        </div>
      ) : null}

      {newClientOpen ? (
        <CrmNewClientModal
          name={newClientName}
          whatsapp={newClientWhatsapp}
          whatsappError={newClientWhatsappError}
          saving={newClientSaving}
          error={newClientError}
          onNameChange={(value) => {
            setNewClientName(value);
            if (newClientError) setNewClientError('');
          }}
          onWhatsappChange={(value) => {
            setNewClientWhatsapp(value);
            if (newClientWhatsappError) setNewClientWhatsappError('');
            if (newClientError) setNewClientError('');
          }}
          onConfirm={() => void handleCreateClient()}
          onClose={() => {
            if (!newClientSaving) {
              setNewClientOpen(false);
              setNewClientName('');
              setNewClientWhatsapp('');
              setNewClientWhatsappError('');
              setNewClientError('');
            }
          }}
        />
      ) : null}

      {deleteConfirmItem ? (
        <CrmDeleteConfirmModal
          item={deleteConfirmItem}
          saving={deleteSaving}
          error={deleteError}
          onConfirm={() => void handleConfirmDelete()}
          onClose={() => {
            if (!deleteSaving) {
              setDeleteConfirmItem(null);
              setDeleteError('');
            }
          }}
        />
      ) : null}

      {selectedItem ? (
        <CrmClientModal
          item={selectedItem}
          commentsDraft={commentsDraft}
          immigrationDateDraft={immigrationDateDraft}
          videoCallDateDraft={videoCallDateDraft}
          videoCallTimeDraft={videoCallTimeDraft}
          videoCallAvailability={videoCallAvailability}
          videoCallAvailabilityLoading={videoCallAvailabilityLoading}
          videoCallSelectedDate={videoCallSelectedDate}
          propertyTypologyDraft={propertyTypologyDraft}
          preferredCityDraft={preferredCityDraft}
          hasPetDraft={hasPetDraft}
          saving={modalSaving}
          onCommentsChange={setCommentsDraft}
          onImmigrationDateChange={setImmigrationDateDraft}
          onVideoCallDateChange={setVideoCallDateDraft}
          onVideoCallTimeChange={setVideoCallTimeDraft}
          onVideoCallSelectedDateChange={setVideoCallSelectedDate}
          onVideoCallSlotSelect={(slot) => {
            const bookingTimezone =
              selectedItem.bookingTimezone?.trim() || 'Europe/Lisbon';
            const date = ymdInTzFromIso(slot.startsAt, bookingTimezone);
            const time = hmInTzFromIso(slot.startsAt, bookingTimezone);
            setVideoCallDateDraft(date);
            setVideoCallTimeDraft(time);
            setVideoCallSelectedDate(date);
          }}
          onPropertyTypologyChange={setPropertyTypologyDraft}
          onPreferredCityChange={setPreferredCityDraft}
          onHasPetChange={setHasPetDraft}
          onStatusChange={(status) => void handleModalStatusChange(status)}
          onSave={() => void handleSave()}
          onClose={() => {
            if (!modalSaving) {
              setSelectedItem(null);
              setCommentsDraft('');
              setImmigrationDateDraft('');
              setVideoCallDateDraft('');
              setVideoCallTimeDraft('');
              setVideoCallAvailability(null);
              setVideoCallAvailabilityLoading(false);
              setVideoCallSelectedDate('');
              setPropertyTypologyDraft('');
              setPreferredCityDraft('');
              setHasPetDraft(null);
            }
          }}
        />
      ) : null}

      {draggingItemId && draggingFromStatus ? (
        <p className="sr-only" aria-live="polite">
          A mover cliente para outra coluna
        </p>
      ) : null}
    </div>
  );
}
