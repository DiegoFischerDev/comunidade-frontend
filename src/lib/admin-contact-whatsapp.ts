/** Atendimento Rafa Portugal — número para pedidos de contacto com parceiros. */
export const ADMIN_ATTENDIMENTO_WA_DIGITS = '351936958429';

export function buildAdminWhatsAppUrl(text: string): string {
  const d = ADMIN_ATTENDIMENTO_WA_DIGITS.replace(/\D/g, '');
  const t = text.trim();
  let url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(d)}`;
  if (t) url += `&text=${encodeURIComponent(t)}`;
  return url;
}

export function partnerAtendimentoMessage(partnerName: string): string {
  return `Olá, gostaria de atendimento com ${partnerName}`;
}

export function partnerServiceInterestMessage(
  partnerName: string,
  serviceTitle: string,
): string {
  return `Olá, gostaria de mais informações sobre o serviço "${serviceTitle}". Atendimento com ${partnerName}.`;
}
