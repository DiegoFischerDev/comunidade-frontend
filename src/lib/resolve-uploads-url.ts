/**
 * URLs de ficheiros servidos pela API (`/uploads/...`).
 * - Caminhos relativos: junta NEXT_PUBLIC_API_URL
 * - URLs absolutas antigas com host errado (ex. localhost em stage): usa só o pathname + API
 */
export function resolveUploadsUrl(url: string | null | undefined): string {
  if (!url) return "";
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
  if (url.startsWith("/uploads/")) return `${base}${url}`;
  try {
    const u = new URL(url);
    if (u.pathname.startsWith("/uploads/")) return `${base}${u.pathname}`;
  } catch {
    /* ignore */
  }
  return url;
}
