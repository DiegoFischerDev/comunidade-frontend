export function normalizeWhatsappDigits(raw: string): string {
  return String(raw || '').replace(/\D/g, '');
}

export function buildWhatsAppUrl(toWhatsapp: string, text: string): string {
  const d = normalizeWhatsappDigits(toWhatsapp);
  const t = String(text || '').trim();
  let url = `https://api.whatsapp.com/send?phone=${encodeURIComponent(d)}`;
  if (t) url += `&text=${encodeURIComponent(t)}`;
  return url;
}

