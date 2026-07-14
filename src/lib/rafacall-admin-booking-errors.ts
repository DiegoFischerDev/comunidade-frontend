import { toast } from '@/lib/toast';

export type RafacallAdminBookingErrorFeedback = {
  /** Mensagem principal — mostrar acima do botão de confirmar. */
  submitError: string;
  /** Destaque no campo WhatsApp quando o erro for desse campo. */
  whatsappFieldError: string;
  /** Recarregar grelha de horários (slot deixou de estar livre). */
  shouldRefreshAvailability: boolean;
};

const WHATSAPP_BOOKING_CONFLICT_PATTERN =
  /whatsapp.*agendamento|já tem um agendamento ativo|agendamento ativo/i;

const SLOT_UNAVAILABLE_PATTERN = /horário|disponível|bloqueado|ocupado/i;

export function getRafacallAdminBookingErrorFeedback(
  message: string,
  fallback = 'Não foi possível concluir o agendamento.',
): RafacallAdminBookingErrorFeedback {
  const submitError = message.trim() || fallback;
  const isWhatsappConflict = WHATSAPP_BOOKING_CONFLICT_PATTERN.test(submitError);

  return {
    submitError,
    whatsappFieldError: isWhatsappConflict ? submitError : '',
    shouldRefreshAvailability: SLOT_UNAVAILABLE_PATTERN.test(submitError),
  };
}

/** Mostra o erro num toast persistente e devolve o feedback para estado de campo / refresh. */
export function showRafacallAdminBookingErrorToast(
  message: string,
  fallback = 'Não foi possível concluir o agendamento.',
): RafacallAdminBookingErrorFeedback {
  const feedback = getRafacallAdminBookingErrorFeedback(message, fallback);
  toast.error(feedback.submitError);
  return feedback;
}
