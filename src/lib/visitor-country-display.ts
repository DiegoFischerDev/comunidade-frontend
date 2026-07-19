/** Nome do país em português a partir do código ISO 3166-1 alpha-2. */
export function visitorCountryDisplayName(
  code: string | null | undefined,
): string | null {
  if (!code || code.length !== 2) return null;
  const c = code.trim().toUpperCase();
  try {
    return new Intl.DisplayNames(["pt-PT"], { type: "region" }).of(c) ?? c;
  } catch {
    return c;
  }
}

/** Bandeira emoji a partir do código ISO 3166-1 alpha-2 (ex.: PT → 🇵🇹). */
export function countryCodeToFlagEmoji(
  code: string | null | undefined,
): string | null {
  if (!code || code.length !== 2) return null;
  const c = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return null;
  const base = 0x1f1e6;
  return String.fromCodePoint(
    ...[...c].map((ch) => base + (ch.charCodeAt(0) - 65)),
  );
}
