import type { RafacallCrmStatus } from '@/lib/api';

export const RAFA_CALL_CRM_STATUS_ORDER: RafacallCrmStatus[] = [
  'ENVIOU_MENSAGEM',
  'VIDEO_CHAMADA_AGENDADA',
  'REALIZOU_VIDEO_CHAMADA',
  'IMIGRACAO_MUITO_LONGE',
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
  const monthLabel = String(month).padStart(2, '0');
  return `${monthLabel}/${year}`;
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
