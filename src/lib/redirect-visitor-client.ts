/**
 * Limpa ID de visitante legado (`rpm_rd_vid`) deixado por versões antigas.
 * Já não persistimos visitante para medição de cliques.
 */
export function clearLegacyRedirectVisitorStorage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("rpm_rd_vid");
  } catch {
    /* ignorar */
  }
  try {
    document.cookie =
      "rpm_rd_vid=; path=/; max-age=0; SameSite=Lax" +
      (window.location.protocol === "https:" ? "; Secure" : "");
  } catch {
    /* ignorar */
  }
}

/**
 * Evita segundo redirect no mesmo carregamento (ex.: React Strict Mode em dev).
 * Chave por URL completa; TTL curto. Usa só sessionStorage (efémero).
 */
export function tryAcquireRedirectNavigationLock(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const key = `rpm_rd_nav_${window.location.pathname}${window.location.search}`.slice(
      0,
      220,
    );
    const now = Date.now();
    const raw = window.sessionStorage.getItem(key);
    if (raw) {
      const prev = parseInt(raw, 10);
      if (!Number.isNaN(prev) && now - prev < 2000) {
        return false;
      }
    }
    window.sessionStorage.setItem(key, String(now));
    return true;
  } catch {
    return true;
  }
}
