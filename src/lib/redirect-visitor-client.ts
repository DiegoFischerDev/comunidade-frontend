/** Mesmo valor usado em todos os pontos de entrada (/whatsapp, /link, /imovel). */
export const REDIRECT_VISITOR_STORAGE_KEY = "rpm_rd_vid";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidV4Like(s: string): boolean {
  return UUID_V4.test(s.trim());
}

function readFirstPartyVisitorCookie(): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${REDIRECT_VISITOR_STORAGE_KEY}=`;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const p = part.trim();
    if (!p.startsWith(prefix)) continue;
    const raw = p.slice(prefix.length);
    try {
      const val = decodeURIComponent(raw);
      if (isUuidV4Like(val)) return val.trim().toLowerCase();
    } catch {
      if (isUuidV4Like(raw)) return raw.trim().toLowerCase();
    }
  }
  return null;
}

/** Cookie de 1.ª parte (não HttpOnly) + localStorage: partilhado por todas as abas do mesmo host. */
function persistVisitorId(id: string): void {
  const v = id.trim().toLowerCase();
  try {
    window.localStorage.setItem(REDIRECT_VISITOR_STORAGE_KEY, v);
  } catch {
    /* Safari / modo restrito pode bloquear LS; o cookie ainda ajuda noutras abas */
  }
  try {
    const maxAge = 365 * 24 * 60 * 60;
    const secure = window.location.protocol === "https:";
    let c = `${REDIRECT_VISITOR_STORAGE_KEY}=${encodeURIComponent(v)}; path=/; max-age=${maxAge}; SameSite=Lax`;
    if (secure) c += "; Secure";
    document.cookie = c;
  } catch {
    /* ignorar */
  }
}

/**
 * Identificador estável por browser no **domínio do site** (localStorage + cookie
 * legível por JS). Todas as abas do mesmo host reutilizam o mesmo UUID; o valor
 * segue na query `rd_vid` para o API deduplicar cliques.
 */
export function getOrCreateStableRedirectVisitorId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  let fromLs: string | null = null;
  try {
    const raw = window.localStorage.getItem(REDIRECT_VISITOR_STORAGE_KEY);
    if (raw && isUuidV4Like(raw)) fromLs = raw.trim().toLowerCase();
  } catch {
    /* ignorar */
  }

  const fromCk = readFirstPartyVisitorCookie();

  if (fromLs && fromCk && fromLs === fromCk) {
    return fromLs;
  }

  if (fromLs) {
    persistVisitorId(fromLs);
    return fromLs;
  }

  if (fromCk) {
    persistVisitorId(fromCk);
    return fromCk;
  }

  const id = crypto.randomUUID();
  persistVisitorId(id);
  return id;
}

/**
 * Evita segundo redirect no mesmo carregamento (ex.: React Strict Mode em dev).
 * Chave por URL completa; TTL curto.
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
