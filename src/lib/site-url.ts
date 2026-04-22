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
