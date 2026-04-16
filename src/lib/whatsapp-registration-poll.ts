/** Backend: pedido de registo expira aos 15 min; margem de 1 min para o polling no browser. */
export const WHATSAPP_REGISTRATION_POLL_MAX_MS = 16 * 60 * 1000;

export const WHATSAPP_REGISTRATION_POLL_TIMEOUT_MESSAGE =
  'O tempo para enviar a confirmação pelo WhatsApp expirou (16 minutos). Crie a conta de novo.';
