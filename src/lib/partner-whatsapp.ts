/** Mensagem padrão do botão «Entre em contato» na hero do parceiro. */
const PARTNER_HERO_WA_TEXT =
  'Olá! Vim da comunidade da Rafa e gostaria de mais informações sobre seus serviços.';

/**
 * Abre o WhatsApp Web / app com o mesmo padrão oficial:
 * `https://api.whatsapp.com/send?phone=...&text=...`
 */
export function buildWhatsAppApiSendUrl(
  phoneDigits: string,
  text?: string,
): string {
  const d = phoneDigits.replace(/\D/g, '');
  if (!d) {
    return '#';
  }
  let url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(d)}`;
  const t = text?.trim();
  if (t) {
    url += `&text=${encodeURIComponent(t)}`;
  }
  return url;
}

export function buildPartnerHeroWhatsAppUrl(whatsappRaw: string): string {
  const d = whatsappRaw.replace(/\D/g, '');
  if (!d) {
    return '#';
  }
  return buildWhatsAppApiSendUrl(d, PARTNER_HERO_WA_TEXT);
}
