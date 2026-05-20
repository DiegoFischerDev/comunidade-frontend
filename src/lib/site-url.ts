function stripNonLocalDevPort(u: URL): void {
  const isLocal =
    u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (!isLocal && (u.port === '3000' || u.port === '3001')) {
    u.port = '';
  }
  if (
    (u.protocol === 'https:' && u.port === '443') ||
    (u.protocol === 'http:' && u.port === '80')
  ) {
    u.port = '';
  }
}

/**
 * Remove portas de desenvolvimento (ex.: :3000) em domínios públicos e portas HTTP(S) padrão.
 */
export function normalizePublicSiteOrigin(raw: string): string {
  const trimmed = String(raw ?? '').trim().replace(/\/$/, '');
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    stripNonLocalDevPort(u);
    return u.origin;
  } catch {
    return trimmed.replace(/:3000(?=\/|$)/, '').replace(/\/$/, '');
  }
}

/** URL absoluta de partilha, preservando path e removendo `:3000` indevido. */
export function normalizePublicShareUrl(fullUrl: string): string {
  const trimmed = String(fullUrl ?? '').trim();
  if (!trimmed) return trimmed;
  try {
    const u = new URL(trimmed);
    stripNonLocalDevPort(u);
    return u.toString();
  } catch {
    return trimmed.replace(/:3000(?=\/|$)/, '');
  }
}

/**
 * Base URL pública do site (sem barra final).
 * Definir `NEXT_PUBLIC_SITE_URL` em builds de produção (CI / Docker).
 * Em `development` usa `http://localhost:3000`.
 */
export function getPublicSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    return normalizePublicSiteOrigin(raw);
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  if (process.env.VERCEL_URL) {
    return normalizePublicSiteOrigin(
      `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`,
    );
  }
  console.warn(
    'NEXT_PUBLIC_SITE_URL is not set; using http://localhost:3000. Set for production metadata and links.',
  );
  return 'http://localhost:3000';
}

/** URL absoluta para partilhar página pública (`/{slug}` ou `/partner/{id}`). */
export function buildPublicShareUrl(pathname: string): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const onLocalhost = host === 'localhost' || host === '127.0.0.1';
    const origin = onLocalhost
      ? window.location.origin
      : `${window.location.protocol}//${host}`;
    return `${origin}${path}`;
  }
  return `${getPublicSiteUrl()}${path}`;
}

/**
 * Em `use client`, corrige links de partilha gerados com `localhost` ou `:3000` no build.
 */
export function resolveShareUrlForBrowser(fullUrl: string): string {
  const normalized = normalizePublicShareUrl(fullUrl);
  if (typeof window === 'undefined') return normalized;
  try {
    const u = new URL(normalized);
    const path = `${u.pathname}${u.search}${u.hash}`;
    const host = window.location.hostname;
    const onLocalhost = host === 'localhost' || host === '127.0.0.1';
    if (!onLocalhost) {
      return `${window.location.protocol}//${host}${path}`;
    }
    const isPlaceholder =
      u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    if (isPlaceholder) {
      return `${window.location.origin}${path}`;
    }
    return `${window.location.protocol}//${host}${path}`;
  } catch {
    return normalized;
  }
}

/**
 * Usado em `generateMetadata` quando `NEXT_PUBLIC_SITE_URL` não está definida,
 * para que `og:image` e `metadataBase` usem o host real (ex. nginx) e não
 * `http://localhost:3000` (que quebra previews no WhatsApp / Facebook).
 */
export function getPublicSiteUrlFromRequestHeaders(
  h: Readonly<Headers>,
): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return normalizePublicSiteOrigin(fromEnv);
  }
  const host =
    h.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    h.get('host')?.trim() ||
    '';
  if (!host) {
    return getPublicSiteUrl();
  }
  const rawProto = h.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const isLocal =
    host.split(':')[0] === 'localhost' || host.startsWith('127.');
  const protocol = rawProto || (isLocal ? 'http' : 'https');
  return normalizePublicSiteOrigin(`${protocol}://${host}`);
}

/**
 * `next/image`: o nosso site ou API = otimizar; alojamento externo (ex. R2) = unoptimized.
 */
export function isOurImageHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }
  try {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      if (new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname === hostname) {
        return true;
      }
    }
    if (process.env.NEXT_PUBLIC_API_URL) {
      if (new URL(process.env.NEXT_PUBLIC_API_URL).hostname === hostname) {
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}
