import type { RafacallCrmStatus } from '@/lib/api';

export const RAFA_CALL_CRM_STATUS_ORDER: RafacallCrmStatus[] = [
  'ENVIOU_MENSAGEM',
  'IMIGRACAO_MUITO_LONGE',
  'VIDEO_CHAMADA_AGENDADA',
  'REALIZOU_VIDEO_CHAMADA',
  'AGUARDANDO_ASSINATURA',
  'CONTRATO_ASSINADO',
];

export const RAFA_CALL_CRM_STATUS_LABELS: Record<RafacallCrmStatus, string> = {
  ENVIOU_MENSAGEM: 'Enviou mensagem',
  VIDEO_CHAMADA_AGENDADA: 'Vídeo chamada agendada',
  REALIZOU_VIDEO_CHAMADA: 'Realizou vídeo chamada',
  IMIGRACAO_MUITO_LONGE: 'Data para imigrar muito longe ainda',
  AGUARDANDO_ASSINATURA: 'Aguardando assinatura do contrato',
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
  IMIGRACAO_MUITO_LONGE: {
    column: 'bg-amber-500/[0.08]',
    header: 'bg-amber-500/12',
    border: 'border-amber-200/80',
    badge: 'bg-amber-500/15 text-amber-900',
    dot: 'bg-amber-400',
    dragRing: 'ring-amber-300/50',
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

export function toImmigrationDateInputValue(value: string | null | undefined): string {
  return value?.trim() ?? '';
}

export function formatImmigrationMonthYear(value: string | null | undefined): string | null {
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
