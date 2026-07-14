import type { RafacallCrmStatus } from '@/lib/api';

export type RafacallCrmPropertyTypology =
  | 'QUARTO'
  | 'T0'
  | 'T1'
  | 'T3'
  | 'T4'
  | 'T5';

export const RAFA_CALL_CRM_PROPERTY_TYPOLOGY_ORDER: RafacallCrmPropertyTypology[] = [
  'QUARTO',
  'T0',
  'T1',
  'T3',
  'T4',
  'T5',
];

export const RAFA_CALL_CRM_PROPERTY_TYPOLOGY_LABELS: Record<
  RafacallCrmPropertyTypology,
  string
> = {
  QUARTO: 'Apenas quarto',
  T0: 'T0',
  T1: 'T1',
  T3: 'T3',
  T4: 'T4',
  T5: 'T5',
};

export function formatCrmPropertyTypologyLabel(
  value: RafacallCrmPropertyTypology | null | undefined,
): string | null {
  if (!value) return null;
  return RAFA_CALL_CRM_PROPERTY_TYPOLOGY_LABELS[value] ?? value;
}

export function formatCrmPetLabel(value: boolean | null | undefined): string {
  if (value === true) return 'Sim';
  if (value === false) return 'Não';
  return 'Por definir';
}

export const CRM_IMMIGRATION_IMMEDIATE_VALUE = 'IMEDIATO';

export const RAFA_CALL_CRM_STATUS_ORDER: RafacallCrmStatus[] = [
  'ENVIOU_MENSAGEM',
  'IMIGRACAO_LONGE',
  'IMIGRACAO_PERTO',
  'VIDEO_CHAMADA_AGENDADA',
  'REALIZOU_VIDEO_CHAMADA',
  'AGUARDANDO_ASSINATURA',
  'CONTRATO_ASSINADO',
];

export const RAFA_CALL_CRM_STATUS_LABELS: Record<RafacallCrmStatus, string> = {
  ENVIOU_MENSAGEM: 'Sem data para imigar',
  IMIGRACAO_LONGE: 'Data para imigrar longe',
  IMIGRACAO_PERTO: 'Data para imigrar perto',
  VIDEO_CHAMADA_AGENDADA: 'Vídeo chamada agendada',
  REALIZOU_VIDEO_CHAMADA: 'Realizou vídeo chamada',
  AGUARDANDO_ASSINATURA: 'Contrato enviado',
  CONTRATO_ASSINADO: 'Contrato assinado',
};

export type RafacallCrmColumnTone = {
  column: string;
  header: string;
  border: string;
  badge: string;
  dot: string;
  dragRing: string;
};

export const RAFA_CALL_CRM_STATUS_TONES: Record<RafacallCrmStatus, RafacallCrmColumnTone> = {
  ENVIOU_MENSAGEM: {
    column: 'bg-slate-500/[0.06]',
    header: 'bg-slate-500/10',
    border: 'border-slate-200/80',
    badge: 'bg-slate-500/15 text-slate-700',
    dot: 'bg-slate-400',
    dragRing: 'ring-slate-300/40',
  },
  VIDEO_CHAMADA_AGENDADA: {
    column: 'bg-sky-500/[0.07]',
    header: 'bg-sky-500/12',
    border: 'border-sky-200/80',
    badge: 'bg-sky-500/15 text-sky-800',
    dot: 'bg-sky-400',
    dragRing: 'ring-sky-300/50',
  },
  REALIZOU_VIDEO_CHAMADA: {
    column: 'bg-emerald-500/[0.07]',
    header: 'bg-emerald-500/12',
    border: 'border-emerald-200/80',
    badge: 'bg-emerald-500/15 text-emerald-800',
    dot: 'bg-emerald-400',
    dragRing: 'ring-emerald-300/50',
  },
  IMIGRACAO_LONGE: {
    column: 'bg-amber-500/[0.08]',
    header: 'bg-amber-500/12',
    border: 'border-amber-200/80',
    badge: 'bg-amber-500/15 text-amber-900',
    dot: 'bg-amber-400',
    dragRing: 'ring-amber-300/50',
  },
  IMIGRACAO_PERTO: {
    column: 'bg-orange-500/[0.08]',
    header: 'bg-orange-500/12',
    border: 'border-orange-200/80',
    badge: 'bg-orange-500/15 text-orange-900',
    dot: 'bg-orange-400',
    dragRing: 'ring-orange-300/50',
  },
  AGUARDANDO_ASSINATURA: {
    column: 'bg-violet-500/[0.07]',
    header: 'bg-violet-500/12',
    border: 'border-violet-200/80',
    badge: 'bg-violet-500/15 text-violet-800',
    dot: 'bg-violet-400',
    dragRing: 'ring-violet-300/50',
  },
  CONTRATO_ASSINADO: {
    column: 'bg-brand-primary/[0.07]',
    header: 'bg-brand-primary/12',
    border: 'border-brand-primary/20',
    badge: 'bg-brand-primary/15 text-brand-primary',
    dot: 'bg-brand-accent',
    dragRing: 'ring-brand-accent/35',
  },
};

const CRM_STATUS_ALIASES: Partial<Record<string, RafacallCrmStatus>> = {
  IMIGRACAO_MUITO_LONGE: 'IMIGRACAO_LONGE',
};

const FALLBACK_CRM_COLUMN_TONE = RAFA_CALL_CRM_STATUS_TONES.ENVIOU_MENSAGEM;

export function normalizeCrmStatus(status: string): RafacallCrmStatus {
  const aliased = CRM_STATUS_ALIASES[status] ?? status;
  if (RAFA_CALL_CRM_STATUS_ORDER.includes(aliased as RafacallCrmStatus)) {
    return aliased as RafacallCrmStatus;
  }
  return 'ENVIOU_MENSAGEM';
}

export function getCrmColumnTone(status: string | RafacallCrmStatus): RafacallCrmColumnTone {
  const normalized = normalizeCrmStatus(status);
  return RAFA_CALL_CRM_STATUS_TONES[normalized] ?? FALLBACK_CRM_COLUMN_TONE;
}

export function normalizeCrmBoardColumns<TItem extends { crmStatus: string }>(
  columns: Array<{ status: string; label: string; items: TItem[] }>,
): Array<{ status: RafacallCrmStatus; label: string; items: TItem[] }> {
  const byStatus = new Map<
    RafacallCrmStatus,
    { status: string; label: string; items: TItem[] }
  >();
  for (const column of columns) {
    byStatus.set(normalizeCrmStatus(column.status), column);
  }

  return RAFA_CALL_CRM_STATUS_ORDER.map((status) => {
    const existing = byStatus.get(status);
    if (existing) {
      return {
        ...existing,
        status,
        label: RAFA_CALL_CRM_STATUS_LABELS[status],
        items: existing.items.map((item) => ({
          ...item,
          crmStatus: normalizeCrmStatus(item.crmStatus),
        })),
      };
    }
    return {
      status,
      label: RAFA_CALL_CRM_STATUS_LABELS[status],
      items: [] as TItem[],
    };
  });
}

export function isCrmImmigrationImmediate(
  value: string | null | undefined,
): boolean {
  return value?.trim().toUpperCase() === CRM_IMMIGRATION_IMMEDIATE_VALUE;
}

export function toImmigrationDateInputValue(value: string | null | undefined): string {
  if (isCrmImmigrationImmediate(value)) return CRM_IMMIGRATION_IMMEDIATE_VALUE;
  return value?.trim() ?? '';
}

export function formatImmigrationMonthYear(value: string | null | undefined): string | null {
  if (isCrmImmigrationImmediate(value)) return 'imediato';
  const raw = value?.trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const month = Number(match[2]);
  const year = Number(match[1]);
  if (month < 1 || month > 12) return null;
  const date = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  const monthShort = date
    .toLocaleDateString('pt-PT', { month: 'short', timeZone: 'UTC' })
    .replace(/\.$/, '')
    .toLowerCase();
  return `${monthShort}/${year}`;
}

export function formatImmigrationDateLabel(value: string | null | undefined): string | null {
  if (isCrmImmigrationImmediate(value)) return 'Imediato';
  const raw = value?.trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return raw;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0));
  return date.toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function compareCrmImmigrationDateKeys(
  left: string | null | undefined,
  right: string | null | undefined,
): number {
  const leftImmediate = isCrmImmigrationImmediate(left);
  const rightImmediate = isCrmImmigrationImmediate(right);
  if (leftImmediate && rightImmediate) return 0;
  if (leftImmediate) return -1;
  if (rightImmediate) return 1;

  const leftKey = left?.trim() ?? '';
  const rightKey = right?.trim() ?? '';
  if (!leftKey && !rightKey) return 0;
  if (!leftKey) return 1;
  if (!rightKey) return -1;
  return leftKey.localeCompare(rightKey);
}

export function sortCrmItemsByImmigrationDate<
  T extends { crmExpectedImmigrationAt: string | null },
>(items: T[]): T[] {
  return [...items].sort((left, right) =>
    compareCrmImmigrationDateKeys(
      left.crmExpectedImmigrationAt,
      right.crmExpectedImmigrationAt,
    ),
  );
}

export function sortCrmBoardColumns<
  T extends { items: Array<{ crmExpectedImmigrationAt: string | null }> },
>(columns: T[]): T[] {
  return columns.map((column) => ({
    ...column,
    items: sortCrmItemsByImmigrationDate(column.items),
  }));
}
