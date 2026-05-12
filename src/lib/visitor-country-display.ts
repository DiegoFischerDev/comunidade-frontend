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
