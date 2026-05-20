/** URL de contacto: link rastreado quando existir; senão fallback directo (ex. WhatsApp). */
export function partnerContactHref(
  redirectPath: string | null | undefined,
  fallbackUrl: string,
): string {
  const p = redirectPath?.trim();
  if (p) return p;
  return fallbackUrl;
}
