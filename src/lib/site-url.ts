/**
 * Base URL pública do site (sem barra final).
 * Definir `NEXT_PUBLIC_SITE_URL` em builds de produção (CI / Docker).
 * Em `development` usa `http://localhost:3000`.
 */
export function getPublicSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (raw) {
    return raw;
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  // Preview Vercel / outro: tentar host público
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }
  // Build sem variável: documentação pede a env; usamos evitar crash em ferramentas
  console.warn(
    'NEXT_PUBLIC_SITE_URL is not set; using http://localhost:3000. Set for production metadata and links.',
  );
  return 'http://localhost:3000';
}

/**
 * Em `use client`, quando o build não tinha `NEXT_PUBLIC_SITE_URL`, a partilha
 * pode vir com `http://localhost:...`. Reescreve para a origem atual se o
 * utilizador estiver noutro host (stage, produção, preview).
 */
export function resolveShareUrlForBrowser(fullUrl: string): string {
  if (typeof window === 'undefined') return fullUrl;
  try {
    const u = new URL(fullUrl);
    const isPlaceholder =
      u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    const cur = window.location.hostname;
    const onLocalhost = cur === 'localhost' || cur === '127.0.0.1';
    if (isPlaceholder && !onLocalhost) {
      u.protocol = window.location.protocol;
      u.host = window.location.host;
      return u.toString();
    }
  } catch {
    return fullUrl;
  }
  return fullUrl;
}

/**
 * Usado em `generateMetadata` quando `NEXT_PUBLIC_SITE_URL` não está definida,
 * para que `og:image` e `metadataBase` usem o host real (ex. nginx) e não
 * `http://localhost:3000` (que quebra previews no WhatsApp / Facebook).
 */
export function getPublicSiteUrlFromRequestHeaders(
  h: Readonly<Headers>,
): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (fromEnv) {
    return fromEnv;
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
  return `${protocol}://${host}`.replace(/\/$/, '');
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
