import type { RafacallCrmStatus } from '@/lib/api';

export const RAFA_CALL_CRM_STATUS_ORDER: RafacallCrmStatus[] = [
  'ENVIOU_MENSAGEM',
  'VIDEO_CHAMADA_AGENDADA',
  'REALIZOU_VIDEO_CHAMADA',
  'NAO_TEM_INTERESSE',
  'INTERESSE_FUTURO',
  'AGUARDANDO_ASSINATURA',
  'CONTRATO_ASSINADO',
];

export const RAFA_CALL_CRM_STATUS_LABELS: Record<RafacallCrmStatus, string> = {
  ENVIOU_MENSAGEM: 'Enviou mensagem',
  VIDEO_CHAMADA_AGENDADA: 'Vídeo chamada agendada',
  REALIZOU_VIDEO_CHAMADA: 'Realizou vídeo chamada',
  NAO_TEM_INTERESSE: 'Não tem interesse de avançar',
  INTERESSE_FUTURO: 'Tem interesse de avançar futuramente',
  AGUARDANDO_ASSINATURA: 'Aguardando assinatura do contrato',
  CONTRATO_ASSINADO: 'Contrato assinado',
};
