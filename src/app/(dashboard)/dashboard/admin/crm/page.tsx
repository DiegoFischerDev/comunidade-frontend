'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type RafacallCrmItem, type RafacallCrmStatus } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { RAFA_CALL_CRM_STATUS_LABELS, RAFA_CALL_CRM_STATUS_ORDER, formatImmigrationDateLabel, formatImmigrationMonthYear, toImmigrationDateInputValue } from '@/lib/rafacall-crm';
import {
  CENTERED_PEEK_CAROUSEL_ITEM,
  CENTERED_PEEK_CAROUSEL_TRACK,
  HORIZONTAL_CAROUSEL_TRACK,
  HorizontalSnapCarousel,
} from '@/components/ui/horizontal-snap-carousel';

type CrmBoardPayload = Awaited<ReturnType<typeof api.admin.rafacall.crmBoard>>;
type CrmColumn = CrmBoardPayload['columns'][number];

const CRM_TABLET_SLIDE =
  'flex-none w-[calc(100vw-2rem)] max-w-3xl snap-center sm:w-[calc(100vw-3rem)]';

const CRM_DESKTOP_COLUMN = 'flex-none w-[17.5rem] min-w-[17.5rem]';

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

function formatBookingDateTime(utcIso: string, timeZone: string): string {
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = d.toLocaleDateString('pt-PT', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
  const hour = d.toLocaleTimeString('pt-PT', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${day} · ${hour}`;
}

function bookingStatusLabel(status: RafacallCrmItem['bookingStatus']): string {
  if (status === 'COMPLETED') return 'Reunião realizada';
  if (status === 'SCHEDULED') return 'Agendado';
  return 'Cancelado';
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
    crmStatus: toStatus,
    crmComments: updatedItem?.crmComments ?? movingItem.crmComments,
    crmExpectedImmigrationAt:
      updatedItem?.crmExpectedImmigrationAt ?? movingItem.crmExpectedImmigrationAt,
  };

  return withoutItem.map((column) =>
    column.status === toStatus
      ? { ...column, items: [nextItem, ...column.items] }
      : column,
  );
}

function removeItemFromColumns(columns: CrmColumn[], itemId: string): CrmColumn[] {
  return columns.map((column) => ({
    ...column,
    items: column.items.filter((entry) => entry.id !== itemId),
  }));
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

  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', item.id);
        event.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`cursor-grab rounded-lg border border-border bg-page p-3 shadow-sm transition-opacity active:cursor-grabbing ${
        isDragging ? 'opacity-40' : ''
      } ${isSaving ? 'pointer-events-none opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{name}</p>
          <p className="mt-0.5 truncate text-xs text-muted">{wa}</p>
          {formatImmigrationMonthYear(item.crmExpectedImmigrationAt) ? (
            <p className="mt-0.5 truncate text-xs text-muted">
              {formatImmigrationMonthYear(item.crmExpectedImmigrationAt)}
            </p>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            item.bookingStatus === 'COMPLETED'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-sky-100 text-sky-800'
          }`}
        >
          {bookingStatusLabel(item.bookingStatus)}
        </span>
      </div>

      {item.crmComments?.trim() ? (
        <p className="mt-2 line-clamp-2 text-xs text-muted">{item.crmComments.trim()}</p>
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
          className="inline-flex min-h-8 cursor-pointer items-center rounded-lg bg-brand-primary px-2.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
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

  return (
    <section
      className={`flex h-full min-h-[240px] flex-col rounded-xl border border-border bg-card shadow-sm ${
        isDragOver ? 'border-brand-accent ring-2 ring-brand-accent/20' : ''
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
      <header className="border-b border-border bg-page px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{column.label}</p>
          <span className="rounded-full bg-muted/15 px-2 py-0.5 text-xs font-medium text-muted">
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

function normalizeCrmComments(value: string | null | undefined): string {
  return (value ?? '').trim();
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
              O cliente deixa de aparecer no kanban. Os agendamentos mantêm-se na página de
              agendamentos.
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

function CrmClientModal({
  item,
  commentsDraft,
  immigrationDateDraft,
  saving,
  error,
  onCommentsChange,
  onImmigrationDateChange,
  onStatusChange,
  onSave,
  onClose,
}: {
  item: RafacallCrmItem;
  commentsDraft: string;
  immigrationDateDraft: string;
  saving: boolean;
  error: string;
  onCommentsChange: (value: string) => void;
  onImmigrationDateChange: (value: string) => void;
  onStatusChange: (status: RafacallCrmStatus) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const name = item.userName?.trim() || 'Sem nome';
  const hasCommentsChanges =
    normalizeCrmComments(commentsDraft) !== normalizeCrmComments(item.crmComments);
  const hasImmigrationDateChanges =
    immigrationDateDraft !== toImmigrationDateInputValue(item.crmExpectedImmigrationAt);
  const hasChanges = hasCommentsChanges || hasImmigrationDateChanges;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crm-client-modal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="crm-client-modal-title" className="text-lg font-semibold text-foreground">
              {name}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {formatWhatsappDigits(item.whatsappDigits)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg border border-border text-sm text-muted transition-colors hover:bg-page"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <dl className="mt-4 grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Agendamento</dt>
            <dd className="text-right font-medium text-foreground">
              {formatBookingDateTime(item.startsAt, item.bookingTimezone)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Estado da reunião</dt>
            <dd className="text-right font-medium text-foreground">
              {bookingStatusLabel(item.bookingStatus)}
            </dd>
          </div>
        </dl>

        <label className="mt-5 block text-sm font-medium text-foreground" htmlFor="crm-status">
          Coluna no kanban
        </label>
        <select
          id="crm-status"
          value={item.crmStatus}
          disabled={saving}
          onChange={(event) => onStatusChange(event.target.value as RafacallCrmStatus)}
          className="mt-1.5 w-full rounded-xl border border-border bg-page px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand-accent"
        >
          {RAFA_CALL_CRM_STATUS_ORDER.map((status) => (
            <option key={status} value={status}>
              {RAFA_CALL_CRM_STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        <label
          className="mt-5 block text-sm font-medium text-foreground"
          htmlFor="crm-immigration-date"
        >
          Data prevista para imigração
        </label>
        <input
          id="crm-immigration-date"
          type="date"
          value={immigrationDateDraft}
          disabled={saving}
          onChange={(event) => onImmigrationDateChange(event.target.value)}
          className="mt-1.5 w-full rounded-xl border border-border bg-page px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand-accent"
        />

        <label className="mt-5 block text-sm font-medium text-foreground" htmlFor="crm-comments">
          Histórico e comentários
        </label>
        <textarea
          id="crm-comments"
          value={commentsDraft}
          disabled={saving}
          onChange={(event) => onCommentsChange(event.target.value)}
          rows={8}
          placeholder="Notas sobre o cliente, histórico de contactos, etc."
          className="mt-1.5 w-full resize-y rounded-xl border border-border bg-page px-3 py-2.5 text-sm text-foreground outline-none focus:border-brand-accent"
        />

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-[14px] border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-page disabled:opacity-50"
          >
            Fechar
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !hasChanges}
            className="inline-flex min-h-11 cursor-pointer items-center rounded-[14px] bg-brand-primary px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'A guardar…' : 'Guardar'}
          </button>
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
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<RafacallCrmItem | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const tabletSlides = useMemo(() => chunkColumns(columns, 2), [columns]);
  const totalClients = useMemo(
    () => columns.reduce((sum, column) => sum + column.items.length, 0),
    [columns],
  );

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const board = await api.admin.rafacall.crmBoard();
      setColumns(board.columns);
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
    setModalError('');
  }, []);

  const handleModalStatusChange = useCallback(
    async (status: RafacallCrmStatus) => {
      if (!selectedItem || selectedItem.crmStatus === status) return;

      const previousColumns = columns;
      const previousItem = selectedItem;
      setModalSaving(true);
      setModalError('');
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
        setColumns((prev) =>
          moveItemBetweenColumns(prev, selectedItem.id, status, updated),
        );
      } catch (err) {
        setColumns(previousColumns);
        setSelectedItem(previousItem);
        setModalError(
          err instanceof Error ? err.message : 'Não foi possível atualizar o estado.',
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

    if (!commentsChanged && !immigrationDateChanged) return;

    setModalSaving(true);
    setModalError('');
    try {
      const updated = await api.admin.rafacall.updateCrm(selectedItem.id, {
        ...(commentsChanged ? { crmComments: commentsDraft } : {}),
        ...(immigrationDateChanged
          ? { crmExpectedImmigrationAt: immigrationDateDraft || null }
          : {}),
      });
      setSelectedItem(updated);
      setCommentsDraft(updated.crmComments ?? '');
      setImmigrationDateDraft(toImmigrationDateInputValue(updated.crmExpectedImmigrationAt));
      setColumns((prev) =>
        prev.map((column) =>
          column.status === updated.crmStatus
            ? {
                ...column,
                items: column.items.map((entry) =>
                  entry.id === updated.id ? updated : entry,
                ),
              }
            : column,
        ),
      );
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : 'Não foi possível guardar as alterações.',
      );
    } finally {
      setModalSaving(false);
    }
  }, [commentsDraft, immigrationDateDraft, selectedItem]);

  const handleRequestDelete = useCallback((item: RafacallCrmItem) => {
    setDeleteConfirmItem(item);
    setDeleteError('');
  }, []);

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
        setModalError('');
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
            para registar o histórico automaticamente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadBoard()}
          disabled={loading}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center rounded-[14px] border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
        >
          Atualizar
        </button>
      </div>

      <p className="mt-3 text-sm text-muted">
        {totalClients} cliente{totalClients === 1 ? '' : 's'} no pipeline
      </p>

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

      {columns.length > 0 ? (
        <div className="mt-6">
          <div className="hidden gap-4 overflow-x-auto pb-2 lg:flex">
            {columns.map((column) => (
              <CrmKanbanColumn
                key={column.status}
                column={column}
                {...columnProps}
                className={CRM_DESKTOP_COLUMN}
              />
            ))}
          </div>

          <div className="hidden md:block lg:hidden">
            <HorizontalSnapCarousel
              slideCount={tabletSlides.length}
              ariaLabel="Colunas do CRM — deslize ou use as setas"
              navStyle="visible"
              hideNavWhenSingle={false}
              prevAriaLabel="Colunas anteriores"
              nextAriaLabel="Colunas seguintes"
              trackClassName={`items-stretch ${HORIZONTAL_CAROUSEL_TRACK} gap-4 px-2 pb-2`}
            >
              {tabletSlides.map((pair, index) => (
                <div key={`tablet-slide:${index}`} className={CRM_TABLET_SLIDE}>
                  <div
                    className={`grid h-full gap-3 ${pair.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}
                  >
                    {pair.map((column) => (
                      <CrmKanbanColumn
                        key={column.status}
                        column={column}
                        {...columnProps}
                        className="min-w-0 h-full"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </HorizontalSnapCarousel>
          </div>

          <div className="md:hidden">
            <HorizontalSnapCarousel
              slideCount={columns.length}
              ariaLabel="Colunas do CRM — deslize ou use as setas"
              navStyle="visible"
              centeredPeek
              hideNavWhenSingle={false}
              prevAriaLabel="Coluna anterior"
              nextAriaLabel="Coluna seguinte"
              trackClassName={`items-stretch ${CENTERED_PEEK_CAROUSEL_TRACK} pb-2`}
            >
              {columns.map((column) => (
                <div key={column.status} className={CENTERED_PEEK_CAROUSEL_ITEM}>
                  <CrmKanbanColumn
                    column={column}
                    {...columnProps}
                    className="h-full w-[84vw] max-w-[320px]"
                  />
                </div>
              ))}
            </HorizontalSnapCarousel>
          </div>
        </div>
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
          saving={modalSaving}
          error={modalError}
          onCommentsChange={setCommentsDraft}
          onImmigrationDateChange={setImmigrationDateDraft}
          onStatusChange={(status) => void handleModalStatusChange(status)}
          onSave={() => void handleSave()}
          onClose={() => {
            if (!modalSaving) {
              setSelectedItem(null);
              setCommentsDraft('');
              setImmigrationDateDraft('');
              setModalError('');
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
