import { redirect } from "next/navigation";

function firstString(
  sp: Record<string, string | string[] | undefined>,
  key: string,
): string {
  const v = sp[key];
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) return v[0]?.trim() ?? "";
  return "";
}

/**
 * Alias legado: aceita `t`, `titulo`, `imovel`. Imóveis: preferir `/imovel?id=…`.
 */
export default async function ShareRedirectEntryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const t = firstString(sp, "t");
  const titulo = firstString(sp, "titulo");
  const slug = t || titulo;
  const imovel = firstString(sp, "imovel");

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(
    /\/$/,
    "",
  );

  if (slug) {
    redirect(
      `${apiBase}/redirect-links/public/by-titulo/${encodeURIComponent(slug)}`,
    );
  }
  if (imovel) {
    redirect(
      `${apiBase}/redirect-links/public/by-house/${encodeURIComponent(imovel)}`,
    );
  }

  redirect("/");
}
