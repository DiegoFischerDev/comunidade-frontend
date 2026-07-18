'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  api,
  getUserFacingApiError,
  type FinanceBoard,
  type FinanceEntry,
  type FinanceEntryKind,
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/lib/toast';
import { LoginWhatsappFields } from '@/components/auth/LoginWhatsappFields';
import {
  formatCrmEuroAmount,
  formatCrmPaymentDateLabel,
} from '@/lib/rafacall-crm';

function financeMediaUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(
    /\/$/,
    '',
  );
  return `${base}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

function parseAmountInput(raw: string): number | null {
  const normalized = raw.trim().replace(/\s/g, '').replace(',', '.');
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0.01) return null;
  return Math.round(value * 100) / 100;
}

function formatWhatsappDisplay(digits: string | null | undefined): string | null {
  const value = digits?.trim();
  if (!value) return null;
  return `+${value}`;
}

function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfMonth(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex, 1);
}

function endOfMonth(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex + 1, 0);
}

function formatMonthQuickLabel(year: number, monthIndex: number, now = new Date()): string {
  const date = new Date(year, monthIndex, 1);
  const monthName = date
    .toLocaleDateString('pt-PT', { month: 'long' })
    .toLowerCase();
  if (year !== now.getFullYear()) {
    return `${monthName} ${year}`;
  }
  return monthName;
}

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

function buildLastThreeMonthOptions(now = new Date()) {
  return [2, 1, 0].map((offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    return {
      key: monthKey(year, monthIndex),
      label: formatMonthQuickLabel(year, monthIndex, now),
      from: toYmd(startOfMonth(year, monthIndex)),
      to: toYmd(endOfMonth(year, monthIndex)),
    };
  });
}

function formatYmdShort(ymd: string): string {
  const match = ymd.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return ymd;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
  }).replace(/\.$/, '');
}

function FilterIcon({ className }: { className?: string }) {
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
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z" />
    </svg>
  );
}

function sumEntryAmounts(entries: FinanceEntry[]): number {
  return Math.round(entries.reduce((sum, entry) => sum + entry.amount, 0) * 100) / 100;
}

function entryInPeriod(
  entry: FinanceEntry,
  from: string | null,
  to: string | null,
): boolean {
  const paidAt = entry.paidAt?.trim() ?? '';
  if (!paidAt) return false;
  if (from && paidAt < from) return false;
  if (to && paidAt > to) return false;
  return true;
}

type PeriodMode = 'all' | 'month' | 'custom';

type EntryFormState = {
  kind: FinanceEntryKind;
  title: string;
  paidAt: string;
  amount: string;
  comment: string;
  receiptUrl: string;
  receiptFileName: string;
  whatsapp: string;
};

const EMPTY_FORM: EntryFormState = {
  kind: 'INCOME',
  title: '',
  paidAt: '',
  amount: '',
  comment: '',
  receiptUrl: '',
  receiptFileName: '',
  whatsapp: '',
};

export default function AdminFinanceiroPage() {
  const { user } = useAuth();
  const canSee = user?.role === 'ADMIN';

  const [board, setBoard] = useState<FinanceBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const monthOptions = useMemo(() => buildLastThreeMonthOptions(), []);
  const currentMonthOption = monthOptions[monthOptions.length - 1];
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [selectedMonthKey, setSelectedMonthKey] = useState(
    currentMonthOption?.key ?? '',
  );
  const [customFrom, setCustomFrom] = useState(currentMonthOption?.from ?? '');
  const [customTo, setCustomTo] = useState(currentMonthOption?.to ?? '');
  const [showPeriodFilter, setShowPeriodFilter] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EntryFormState>(EMPTY_FORM);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [deleteConfirmEntry, setDeleteConfirmEntry] = useState<FinanceEntry | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePeriod = useMemo(() => {
    if (periodMode === 'all') {
      return { from: null as string | null, to: null as string | null };
    }
    if (periodMode === 'month') {
      const option = monthOptions.find((item) => item.key === selectedMonthKey);
      return {
        from: option?.from ?? null,
        to: option?.to ?? null,
      };
    }
    const from = customFrom.trim() || null;
    const to = customTo.trim() || null;
    if (from && to && from > to) {
      return { from: to, to: from };
    }
    return { from, to };
  }, [periodMode, selectedMonthKey, monthOptions, customFrom, customTo]);

  const filteredIncomes = useMemo(
    () =>
      (board?.incomes ?? []).filter((entry) =>
        entryInPeriod(entry, activePeriod.from, activePeriod.to),
      ),
    [board?.incomes, activePeriod.from, activePeriod.to],
  );

  const filteredExpenses = useMemo(
    () =>
      (board?.expenses ?? []).filter((entry) =>
        entryInPeriod(entry, activePeriod.from, activePeriod.to),
      ),
    [board?.expenses, activePeriod.from, activePeriod.to],
  );

  const incomesTotal = useMemo(
    () => sumEntryAmounts(filteredIncomes),
    [filteredIncomes],
  );
  const expensesTotal = useMemo(
    () => sumEntryAmounts(filteredExpenses),
    [filteredExpenses],
  );
  const balance = useMemo(
    () => Math.round((incomesTotal - expensesTotal) * 100) / 100,
    [incomesTotal, expensesTotal],
  );

  const periodSummaryLabel = useMemo(() => {
    if (periodMode === 'all') return 'Todo o histórico';
    if (periodMode === 'month') {
      return (
        monthOptions.find((item) => item.key === selectedMonthKey)?.label ??
        'Período'
      );
    }
    const from = customFrom.trim();
    const to = customTo.trim();
    if (from && to) return `${formatYmdShort(from)} – ${formatYmdShort(to)}`;
    if (from) return `Desde ${formatYmdShort(from)}`;
    if (to) return `Até ${formatYmdShort(to)}`;
    return 'Período livre';
  }, [periodMode, selectedMonthKey, monthOptions, customFrom, customTo]);

  const load = useCallback(async () => {
    if (!canSee) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.admin.finance.list();
      setBoard(data);
    } catch (err) {
      setBoard(null);
      setError(
        getUserFacingApiError(err, { context: 'Ao carregar o financeiro' }),
      );
    } finally {
      setLoading(false);
    }
  }, [canSee]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectMonth = (key: string) => {
    const option = monthOptions.find((item) => item.key === key);
    setPeriodMode('month');
    setSelectedMonthKey(key);
    if (option) {
      setCustomFrom(option.from);
      setCustomTo(option.to);
    }
    setShowPeriodFilter(false);
  };

  const selectAllPeriod = () => {
    setPeriodMode('all');
    setShowPeriodFilter(false);
  };

  const handleCustomFromChange = (value: string) => {
    setPeriodMode('custom');
    setCustomFrom(value);
  };

  const handleCustomToChange = (value: string) => {
    setPeriodMode('custom');
    setCustomTo(value);
    if (customFrom.trim() && value.trim()) {
      setShowPeriodFilter(false);
    }
  };

  const resetForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startAdd = (kind: FinanceEntryKind) => {
    setEditingId(null);
    setFormOpen(true);
    setForm({
      ...EMPTY_FORM,
      kind,
      paidAt: new Date().toISOString().slice(0, 10),
    });
  };

  const startEdit = (entry: FinanceEntry) => {
    setEditingId(entry.id);
    setFormOpen(true);
    setForm({
      kind: entry.kind,
      title: entry.title,
      paidAt: entry.paidAt,
      amount: String(entry.amount).replace('.', ','),
      comment: entry.comment ?? '',
      receiptUrl: entry.receiptImageUrl ?? '',
      receiptFileName: '',
      whatsapp: entry.whatsappDigits ?? '',
    });
  };

  const handleUploadReceipt = async (file: File | null) => {
    if (!file) return;
    setBusy(true);
    try {
      const uploaded = await api.uploads.post(file);
      setForm((prev) => ({
        ...prev,
        receiptUrl: uploaded.url,
        receiptFileName: file.name,
      }));
      toast.success('Comprovante carregado.');
    } catch (err) {
      toast.error(
        getUserFacingApiError(err, { context: 'Ao enviar o comprovante' }),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    const amountValue = parseAmountInput(form.amount);
    const title = form.title.trim();
    if (!title) {
      toast.error('Indica um título.');
      return;
    }
    if (!form.paidAt.trim()) {
      toast.error('Indica a data.');
      return;
    }
    if (amountValue == null) {
      toast.error('Indica um valor válido (mín. 0,01 €).');
      return;
    }

    const body = {
      kind: form.kind,
      title,
      paidAt: form.paidAt.trim(),
      amount: amountValue,
      receiptImageUrl: form.receiptUrl.trim() || null,
      comment: form.comment.trim() || null,
      whatsapp: form.kind === 'INCOME' ? form.whatsapp.trim() || null : null,
    };

    setBusy(true);
    try {
      if (editingId) {
        await api.admin.finance.update(editingId, body);
        toast.success(
          form.kind === 'INCOME' ? 'Receita atualizada.' : 'Despesa atualizada.',
        );
      } else {
        await api.admin.finance.create(body);
        toast.success(
          form.kind === 'INCOME' ? 'Receita adicionada.' : 'Despesa adicionada.',
        );
      }
      resetForm();
      await load();
    } catch (err) {
      toast.error(
        getUserFacingApiError(err, {
          context: editingId ? 'Ao atualizar lançamento' : 'Ao adicionar lançamento',
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmEntry) return;
    const entry = deleteConfirmEntry;

    setBusy(true);
    try {
      await api.admin.finance.delete(entry.id);
      if (editingId === entry.id) resetForm();
      setDeleteConfirmEntry(null);
      toast.success(entry.kind === 'INCOME' ? 'Receita removida.' : 'Despesa removida.');
      await load();
    } catch (err) {
      toast.error(
        getUserFacingApiError(err, { context: 'Ao remover lançamento' }),
      );
    } finally {
      setBusy(false);
    }
  };

  if (!user) return null;

  if (!canSee) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-muted">Sem permissão para ver esta página.</p>
      </div>
    );
  }

  const isBusy = busy || loading;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 pt-8 pb-8 sm:px-6 sm:pt-12 md:pt-16 lg:pt-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Financeiro
          </h1>
          <p className="text-sm text-muted">
            Receitas e despesas. Pagamentos do CRM aparecem aqui como receitas; receitas
            com WhatsApp são atribuídas ao cliente no CRM.
          </p>
        </div>
        <div className="relative z-20 shrink-0 self-end">
          <button
            type="button"
            onClick={() => setShowPeriodFilter((prev) => !prev)}
            aria-expanded={showPeriodFilter}
            aria-haspopup="dialog"
            aria-label={
              showPeriodFilter
                ? 'Ocultar filtro de período'
                : 'Mostrar filtro de período'
            }
            className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
              showPeriodFilter
                ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                : 'border-border bg-card text-foreground hover:bg-page'
            }`}
          >
            <FilterIcon className="h-4 w-4 shrink-0" />
            <span className={periodMode === 'month' ? 'capitalize' : undefined}>
              {periodSummaryLabel}
            </span>
          </button>

          {showPeriodFilter ? (
            <PeriodFilter
              monthOptions={monthOptions}
              periodMode={periodMode}
              selectedMonthKey={selectedMonthKey}
              customFrom={customFrom}
              customTo={customTo}
              onSelectAll={selectAllPeriod}
              onSelectMonth={selectMonth}
              onCustomFromChange={handleCustomFromChange}
              onCustomToChange={handleCustomToChange}
              onRequestClose={() => setShowPeriodFilter(false)}
            />
          ) : null}
        </div>
      </header>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryStat
          label="Receitas"
          value={formatCrmEuroAmount(incomesTotal)}
          tone="income"
          caption={periodSummaryLabel}
          captionCapitalize={periodMode === 'month'}
        />
        <SummaryStat
          label="Despesas"
          value={formatCrmEuroAmount(expensesTotal)}
          tone="expense"
          caption={periodSummaryLabel}
          captionCapitalize={periodMode === 'month'}
        />
        <SummaryStat
          label="Saldo"
          value={formatCrmEuroAmount(balance)}
          tone={balance >= 0 ? 'balance-positive' : 'balance-negative'}
          emphasized
          caption={periodSummaryLabel}
          captionCapitalize={periodMode === 'month'}
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <EntryList
          title="Receitas"
          emptyLabel="Nenhuma receita neste período."
          entries={filteredIncomes}
          tone="income"
          busy={isBusy}
          onAdd={() => startAdd('INCOME')}
          onEdit={startEdit}
          onPreviewReceipt={(url) => setReceiptPreviewUrl(url)}
        />
        <EntryList
          title="Despesas"
          emptyLabel="Nenhuma despesa neste período."
          entries={filteredExpenses}
          tone="expense"
          busy={isBusy}
          onAdd={() => startAdd('EXPENSE')}
          onEdit={startEdit}
          onPreviewReceipt={(url) => setReceiptPreviewUrl(url)}
        />
      </div>

      {loading && !board ? (
        <p className="text-sm text-muted">A carregar…</p>
      ) : null}

      {formOpen
        ? createPortal(
            <EntryFormModal
              form={form}
              editingId={editingId}
              busy={busy}
              fileInputRef={fileInputRef}
              onChange={setForm}
              onUpload={(file) => void handleUploadReceipt(file)}
              onClose={resetForm}
              onSave={() => void handleSave()}
              onPreviewReceipt={(url) => setReceiptPreviewUrl(url)}
              onDelete={
                editingId
                  ? () => {
                      const entry =
                        board?.incomes.find((item) => item.id === editingId) ??
                        board?.expenses.find((item) => item.id === editingId) ??
                        null;
                      if (!entry) return;
                      resetForm();
                      setDeleteConfirmEntry(entry);
                    }
                  : undefined
              }
            />,
            document.body,
          )
        : null}

      {receiptPreviewUrl
        ? createPortal(
            <ReceiptPreviewModal
              url={receiptPreviewUrl}
              onClose={() => setReceiptPreviewUrl(null)}
            />,
            document.body,
          )
        : null}

      {deleteConfirmEntry
        ? createPortal(
            <DeleteConfirmModal
              entry={deleteConfirmEntry}
              busy={busy}
              onConfirm={() => void handleDelete()}
              onClose={() => {
                if (!busy) setDeleteConfirmEntry(null);
              }}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

function PeriodFilter({
  monthOptions,
  periodMode,
  selectedMonthKey,
  customFrom,
  customTo,
  onSelectAll,
  onSelectMonth,
  onCustomFromChange,
  onCustomToChange,
  onRequestClose,
}: {
  monthOptions: Array<{ key: string; label: string; from: string; to: string }>;
  periodMode: PeriodMode;
  selectedMonthKey: string;
  customFrom: string;
  customTo: string;
  onSelectAll: () => void;
  onSelectMonth: (key: string) => void;
  onCustomFromChange: (value: string) => void;
  onCustomToChange: (value: string) => void;
  onRequestClose: () => void;
}) {
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onRequestClose();
    };
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target || !panelRef.current) return;
      const root = panelRef.current.parentElement;
      if (root && !root.contains(target)) {
        onRequestClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [onRequestClose]);

  const chipClass = (active: boolean) =>
    `cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
      active
        ? 'border-brand-primary bg-brand-primary text-white'
        : 'border-border bg-page text-foreground hover:border-brand-primary/40 hover:bg-card'
    }`;

  return (
    <section
      ref={panelRef}
      role="dialog"
      aria-label="Filtro de período"
      className="absolute top-[calc(100%+0.5rem)] right-0 z-30 w-[min(18.5rem,calc(100vw-2.5rem))] rounded-2xl border border-border bg-card px-3.5 py-3.5 shadow-[0_12px_40px_rgba(12,58,51,0.14)] sm:w-max sm:min-w-[40rem] sm:max-w-[min(48rem,calc(100vw-2rem))] sm:px-4"
    >
      {/* Mobile: datas primeiro */}
      <div className="space-y-3 sm:hidden">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted"
              htmlFor="finance-period-from-mobile"
            >
              De
            </label>
            <input
              id="finance-period-from-mobile"
              type="date"
              value={customFrom}
              onChange={(event) => onCustomFromChange(event.target.value)}
              className={`w-full rounded-lg border bg-page px-2 py-1.5 text-sm outline-none transition-colors focus:border-brand-primary ${
                periodMode === 'custom'
                  ? 'border-brand-primary/60'
                  : 'border-border'
              }`}
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-muted"
              htmlFor="finance-period-to-mobile"
            >
              Até
            </label>
            <input
              id="finance-period-to-mobile"
              type="date"
              value={customTo}
              onChange={(event) => onCustomToChange(event.target.value)}
              className={`w-full rounded-lg border bg-page px-2 py-1.5 text-sm outline-none transition-colors focus:border-brand-primary ${
                periodMode === 'custom'
                  ? 'border-brand-primary/60'
                  : 'border-border'
              }`}
            />
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border/70 pt-3">
          {monthOptions.map((option) => {
            const isActive =
              periodMode === 'month' && selectedMonthKey === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => onSelectMonth(option.key)}
                className={`${chipClass(isActive)} capitalize`}
              >
                {option.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={onSelectAll}
            className={chipClass(periodMode === 'all')}
          >
            Todo o histórico
          </button>
        </div>
      </div>

      {/* Desktop/tablet: datas à esquerda, quick filters à direita */}
      <div className="hidden items-center justify-end gap-2 sm:flex">
        <div className="flex items-end gap-2 border-r border-border/70 pr-3">
          <div>
            <label
              className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted"
              htmlFor="finance-period-from"
            >
              De
            </label>
            <input
              id="finance-period-from"
              type="date"
              value={customFrom}
              onChange={(event) => onCustomFromChange(event.target.value)}
              className={`w-[9.75rem] rounded-lg border bg-page px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-brand-primary ${
                periodMode === 'custom'
                  ? 'border-brand-primary/60'
                  : 'border-border'
              }`}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted"
              htmlFor="finance-period-to"
            >
              Até
            </label>
            <input
              id="finance-period-to"
              type="date"
              value={customTo}
              onChange={(event) => onCustomToChange(event.target.value)}
              className={`w-[9.75rem] rounded-lg border bg-page px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-brand-primary ${
                periodMode === 'custom'
                  ? 'border-brand-primary/60'
                  : 'border-border'
              }`}
            />
          </div>
        </div>

        {monthOptions.map((option) => {
          const isActive =
            periodMode === 'month' && selectedMonthKey === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onSelectMonth(option.key)}
              className={`${chipClass(isActive)} capitalize`}
            >
              {option.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onSelectAll}
          className={chipClass(periodMode === 'all')}
        >
          Todo o histórico
        </button>
      </div>
    </section>
  );
}

function SummaryStat({
  label,
  value,
  tone,
  emphasized = false,
  caption,
  captionCapitalize = false,
}: {
  label: string;
  value: string;
  tone: 'income' | 'expense' | 'balance-positive' | 'balance-negative';
  emphasized?: boolean;
  caption?: string;
  captionCapitalize?: boolean;
}) {
  const styles = {
    income: {
      shell: 'border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-emerald-50/40 to-card',
      bar: 'bg-emerald-500',
      label: 'text-emerald-800/80',
      value: 'text-emerald-950',
      iconWrap: 'bg-emerald-600/10 text-emerald-700 ring-1 ring-emerald-600/10',
      icon: (
        <path
          d="M12 19V5M5 12l7-7 7 7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ),
    },
    expense: {
      shell: 'border-rose-200/70 bg-gradient-to-br from-rose-50 via-rose-50/40 to-card',
      bar: 'bg-rose-500',
      label: 'text-rose-800/80',
      value: 'text-rose-950',
      iconWrap: 'bg-rose-600/10 text-rose-700 ring-1 ring-rose-600/10',
      icon: (
        <path
          d="M12 5v14M5 12l7 7 7-7"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ),
    },
    'balance-positive': {
      shell:
        'border-brand-primary/15 bg-gradient-to-br from-brand-primary/[0.08] via-brand-secondary/20 to-card',
      bar: 'bg-brand-accent',
      label: 'text-brand-primary/75',
      value: 'text-brand-primary',
      iconWrap: 'bg-brand-primary/10 text-brand-primary ring-1 ring-brand-primary/10',
      icon: (
        <path
          d="M4 7h16M4 12h16M4 17h10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ),
    },
    'balance-negative': {
      shell: 'border-rose-200/80 bg-gradient-to-br from-rose-100/80 via-rose-50/50 to-card',
      bar: 'bg-rose-500',
      label: 'text-rose-800/80',
      value: 'text-rose-900',
      iconWrap: 'bg-rose-600/10 text-rose-700 ring-1 ring-rose-600/10',
      icon: (
        <path
          d="M4 7h16M4 12h16M4 17h10"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      ),
    },
  }[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-[18px] border px-5 py-5 shadow-[0_1px_2px_rgba(12,58,51,0.04)] sm:px-6 sm:py-6 ${styles.shell} ${
        emphasized ? 'sm:shadow-[0_4px_18px_rgba(12,58,51,0.07)]' : ''
      }`}
    >
      <span
        className={`absolute inset-y-0 left-0 w-1 ${styles.bar}`}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-4 pl-1">
        <div className="min-w-0">
          <p
            className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${styles.label}`}
          >
            {label}
          </p>
          <p
            className={`mt-3 text-[1.65rem] font-semibold leading-none tracking-tight tabular-nums sm:text-[1.85rem] ${styles.value}`}
          >
            {value}
          </p>
          {caption ? (
            <span
              className={`mt-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand-accent/35 bg-brand-accent/15 px-2.5 py-1 text-xs font-semibold text-brand-primary ${
                captionCapitalize ? 'capitalize' : ''
              }`}
            >
              <svg
                className="h-3.5 w-3.5 shrink-0 text-brand-accent-dark"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
              <span className="truncate">{caption}</span>
            </span>
          ) : null}
        </div>
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${styles.iconWrap}`}
          aria-hidden
        >
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none">
            {styles.icon}
          </svg>
        </span>
      </div>
    </div>
  );
}

function EntryList({
  title,
  emptyLabel,
  entries,
  tone,
  busy,
  onAdd,
  onEdit,
  onPreviewReceipt,
}: {
  title: string;
  emptyLabel: string;
  entries: FinanceEntry[];
  tone: 'income' | 'expense';
  busy: boolean;
  onAdd: () => void;
  onEdit: (entry: FinanceEntry) => void;
  onPreviewReceipt: (url: string) => void;
}) {
  const titleClass =
    tone === 'income' ? 'text-emerald-950' : 'text-rose-950';
  const borderClass =
    tone === 'income' ? 'border-emerald-200/80' : 'border-rose-200/80';
  const hoverClass =
    tone === 'income' ? 'hover:bg-emerald-50' : 'hover:bg-rose-50';
  const buttonAccent =
    tone === 'income'
      ? 'border-emerald-300 bg-emerald-100/80 text-emerald-950 hover:bg-emerald-100'
      : 'border-rose-300 bg-rose-100/80 text-rose-950 hover:bg-rose-100';
  const placeholderClass =
    tone === 'income'
      ? 'border-emerald-200/80 bg-emerald-50/50 text-emerald-800/60'
      : 'border-rose-200/80 bg-rose-50/50 text-rose-800/60';

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className={`text-lg font-semibold ${titleClass}`}>
          {title}
          <span className="ml-2 text-sm font-medium text-muted">
            ({entries.length})
          </span>
        </h2>
        <button
          type="button"
          disabled={busy}
          onClick={onAdd}
          className={`inline-flex min-h-9 cursor-pointer items-center rounded-lg border px-3 text-xs font-semibold transition-colors disabled:opacity-50 ${buttonAccent}`}
        >
          + Adicionar
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm italic text-muted">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <div
                role="button"
                tabIndex={busy ? -1 : 0}
                onClick={() => {
                  if (!busy) onEdit(entry);
                }}
                onKeyDown={(event) => {
                  if (busy) return;
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onEdit(entry);
                  }
                }}
                className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border bg-card px-3.5 py-3 text-left transition-colors ${hoverClass} ${
                  busy ? 'cursor-not-allowed opacity-50' : ''
                } ${borderClass}`}
              >
                {entry.receiptImageUrl ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={(event) => {
                      event.stopPropagation();
                      onPreviewReceipt(financeMediaUrl(entry.receiptImageUrl!));
                    }}
                    className="relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border bg-page transition-opacity hover:opacity-90 disabled:opacity-50"
                    aria-label="Ver comprovante"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={financeMediaUrl(entry.receiptImageUrl)}
                      alt="Comprovante"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed text-sm font-semibold ${placeholderClass}`}
                    aria-hidden
                  >
                    €
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {entry.title}
                      </p>
                      {entry.kind === 'INCOME' ? (
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {entry.whatsappDigits
                            ? `${entry.clientName?.trim() ? `${entry.clientName.trim()} · ` : ''}${formatWhatsappDisplay(entry.whatsappDigits)}`
                            : 'Sem cliente atribuído'}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`text-base font-semibold tabular-nums tracking-tight sm:text-lg ${
                          tone === 'income' ? 'text-emerald-800' : 'text-rose-800'
                        }`}
                      >
                        {formatCrmEuroAmount(entry.amount)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {formatCrmPaymentDateLabel(entry.paidAt) ?? entry.paidAt}
                      </p>
                    </div>
                  </div>
                  {entry.comment?.trim() ? (
                    <p className="mt-2 line-clamp-2 text-xs text-foreground/75">
                      {entry.comment}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EntryFormModal({
  form,
  editingId,
  busy,
  fileInputRef,
  onChange,
  onUpload,
  onClose,
  onSave,
  onPreviewReceipt,
  onDelete,
}: {
  form: EntryFormState;
  editingId: string | null;
  busy: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onChange: React.Dispatch<React.SetStateAction<EntryFormState>>;
  onUpload: (file: File | null) => void;
  onClose: () => void;
  onSave: () => void;
  onPreviewReceipt: (url: string) => void;
  onDelete?: () => void;
}) {
  const isIncome = form.kind === 'INCOME';
  const title = editingId
    ? isIncome
      ? 'Editar receita'
      : 'Editar despesa'
    : isIncome
      ? 'Nova receita'
      : 'Nova despesa';

  const [clientLookup, setClientLookup] = useState<{
    status: 'idle' | 'loading' | 'found' | 'not_found';
    name: string | null;
  }>({ status: 'idle', name: null });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  useEffect(() => {
    if (!isIncome) {
      setClientLookup({ status: 'idle', name: null });
      return;
    }

    const digits = form.whatsapp.replace(/\D/g, '');
    if (digits.length < 8) {
      setClientLookup({ status: 'idle', name: null });
      return;
    }

    let cancelled = false;
    setClientLookup({ status: 'loading', name: null });
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const result = await api.admin.rafacall.lookupCrmClient(digits);
          if (cancelled) return;
          if (result.inCrm) {
            setClientLookup({
              status: 'found',
              name: result.name?.trim() || null,
            });
          } else {
            setClientLookup({ status: 'not_found', name: null });
          }
        } catch {
          if (cancelled) return;
          setClientLookup({ status: 'not_found', name: null });
        }
      })();
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [form.whatsapp, isIncome]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="finance-entry-modal-title"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="max-h-[min(94dvh,52rem)] w-full max-w-lg overflow-y-auto rounded-[20px] border border-border bg-card p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="finance-entry-modal-title"
              className="text-lg font-semibold text-foreground"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {isIncome
                ? 'Regista uma receita. Com WhatsApp, fica no CRM do cliente.'
                : 'Regista uma despesa com data, valor e opcionalmente comprovante.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-sm text-muted transition-colors hover:bg-page hover:text-foreground disabled:opacity-50"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {!editingId ? (
          <div className="mt-4 flex gap-1 rounded-lg border border-border p-0.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => onChange({ ...form, kind: 'INCOME' })}
              className={`flex-1 cursor-pointer rounded-md px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                isIncome
                  ? 'bg-emerald-100 text-emerald-950'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Receita
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onChange({ ...form, kind: 'EXPENSE', whatsapp: '' })
              }
              className={`flex-1 cursor-pointer rounded-md px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50 ${
                !isIncome
                  ? 'bg-rose-100 text-rose-950'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              Despesa
            </button>
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          <div>
            <label
              className="block text-sm font-medium text-foreground"
              htmlFor="finance-title"
            >
              Título
            </label>
            <input
              id="finance-title"
              type="text"
              value={form.title}
              disabled={busy}
              onChange={(event) =>
                onChange({ ...form, title: event.target.value })
              }
              placeholder={
                isIncome ? 'Ex.: Pagamento Relocation' : 'Ex.: Software, marketing…'
              }
              maxLength={120}
              className="mt-2 w-full rounded-xl border border-border bg-page px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand-accent disabled:opacity-50"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                className="block text-sm font-medium text-foreground"
                htmlFor="finance-date"
              >
                Data
              </label>
              <input
                id="finance-date"
                type="date"
                value={form.paidAt}
                disabled={busy}
                onChange={(event) =>
                  onChange({ ...form, paidAt: event.target.value })
                }
                className="mt-2 w-full rounded-xl border border-border bg-page px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand-accent disabled:opacity-50"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium text-foreground"
                htmlFor="finance-amount"
              >
                Valor (€)
              </label>
              <input
                id="finance-amount"
                type="text"
                inputMode="decimal"
                value={form.amount}
                disabled={busy}
                onChange={(event) =>
                  onChange({ ...form, amount: event.target.value })
                }
                placeholder="0,00"
                className="mt-2 w-full rounded-xl border border-border bg-page px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand-accent disabled:opacity-50"
              />
            </div>
          </div>

          {isIncome ? (
            <div>
              <LoginWhatsappFields
                idPrefix="finance-income"
                label="WhatsApp do cliente (opcional)"
                value={form.whatsapp}
                onChange={(fullDigits) =>
                  onChange((prev) => ({ ...prev, whatsapp: fullDigits }))
                }
                disabled={busy}
                rememberInStorage={false}
              />
              {clientLookup.status === 'loading' ? (
                <p className="mt-2 text-xs text-muted">A procurar cliente…</p>
              ) : null}
              {clientLookup.status === 'found' ? (
                <div className="mt-3 flex items-start gap-3 rounded-xl border border-emerald-300/80 bg-emerald-50 px-3.5 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
                    {(clientLookup.name || 'C')
                      .trim()
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                      Cliente no CRM
                    </p>
                    <p className="mt-0.5 truncate text-sm font-semibold text-emerald-950">
                      {clientLookup.name || 'Cliente encontrado'}
                    </p>
                    {formatWhatsappDisplay(form.whatsapp) ? (
                      <p className="mt-0.5 truncate text-xs text-emerald-800/80">
                        {formatWhatsappDisplay(form.whatsapp)}
                      </p>
                    ) : null}
                  </div>
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </div>
              ) : null}
              {clientLookup.status === 'not_found' ? (
                <div className="mt-3 rounded-xl border border-amber-300/80 bg-amber-50 px-3.5 py-2.5">
                  <p className="text-sm font-medium text-amber-900">
                    Cliente não encontrado
                  </p>
                  <p className="mt-0.5 text-xs text-amber-800/80">
                    A receita pode ser guardada sem vínculo no CRM.
                  </p>
                </div>
              ) : null}
              {clientLookup.status === 'idle' ? (
                <p className="mt-2 text-xs text-muted">
                  Se preencheres, a receita fica atribuída a esse cliente no CRM.
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <label
              className="block text-sm font-medium text-foreground"
              htmlFor="finance-comment"
            >
              Comentário (opcional)
            </label>
            <textarea
              id="finance-comment"
              value={form.comment}
              disabled={busy}
              onChange={(event) =>
                onChange({ ...form, comment: event.target.value })
              }
              rows={2}
              placeholder="Nota sobre este lançamento…"
              className="mt-2 w-full resize-y rounded-xl border border-border bg-page px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-brand-accent disabled:opacity-50"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-foreground">
              Comprovante (opcional)
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              {form.receiptUrl ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    onPreviewReceipt(financeMediaUrl(form.receiptUrl))
                  }
                  className="relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border bg-page transition-opacity hover:opacity-90 disabled:opacity-50"
                  aria-label="Ampliar comprovante"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={financeMediaUrl(form.receiptUrl)}
                    alt="Preview do comprovante"
                    className="h-full w-full object-cover"
                  />
                </button>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                disabled={busy}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  onUpload(file);
                }}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-border bg-page px-3 text-xs font-medium text-foreground hover:bg-card disabled:opacity-50"
              >
                {form.receiptUrl ? 'Trocar imagem' : 'Carregar imagem'}
              </button>
              {form.receiptUrl ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    onChange({
                      ...form,
                      receiptUrl: '',
                      receiptFileName: '',
                    });
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-xs font-medium text-muted underline-offset-2 hover:underline disabled:opacity-50"
                >
                  Remover
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onSave}
            className="inline-flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 sm:flex-none"
          >
            {editingId ? 'Guardar' : 'Adicionar'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-page disabled:opacity-50"
          >
            Cancelar
          </button>
          {editingId && onDelete ? (
            <button
              type="button"
              disabled={busy}
              onClick={onDelete}
              className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center rounded-xl border border-red-200 px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 sm:ml-auto sm:w-auto"
            >
              Apagar
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReceiptPreviewModal({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Comprovante"
      onClick={onClose}
    >
      <div
        className="relative max-h-[min(90dvh,52rem)] w-full max-w-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-sm text-muted shadow-md transition-colors hover:bg-page hover:text-foreground sm:-top-4 sm:-right-4"
          aria-label="Fechar"
        >
          ✕
        </button>
        <div className="overflow-hidden rounded-[20px] border border-border bg-card shadow-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Comprovante"
            className="max-h-[min(86dvh,48rem)] w-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  entry,
  busy,
  onConfirm,
  onClose,
}: {
  entry: FinanceEntry;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const kindLabel = entry.kind === 'INCOME' ? 'receita' : 'despesa';
  const title =
    entry.kind === 'INCOME' ? 'Apagar receita?' : 'Apagar despesa?';

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="finance-delete-confirm-title"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2
          id="finance-delete-confirm-title"
          className="text-base font-semibold text-foreground"
        >
          {title}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Esta ação não pode ser desfeita. O lançamento será removido do
          financeiro
          {entry.kind === 'INCOME' && entry.whatsappDigits
            ? ' e do CRM do cliente'
            : ''}
          .
        </p>

        <div className="mt-4 rounded-xl border border-red-200 bg-red-50/80 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {kindLabel}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {entry.title}
          </p>
          <p className="mt-0.5 text-sm tabular-nums text-foreground/90">
            {formatCrmEuroAmount(entry.amount)}
            {' · '}
            {formatCrmPaymentDateLabel(entry.paidAt) ?? entry.paidAt}
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-[14px] bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? 'A apagar…' : 'Confirmar exclusão'}
          </button>
          <button
            type="button"
            disabled={busy}
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
