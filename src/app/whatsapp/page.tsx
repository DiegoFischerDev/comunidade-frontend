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
 * Entrada pública recomendada para links personalizados: /whatsapp?t=<slug>
 * Imóveis: preferir /imovel?id=<id> (mantém-se ?imovel= como legado).
 */
export default async function WhatsappRedirectEntryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const t = firstString(sp, "t");
  const tituloLegacy = firstString(sp, "titulo");
  const slug = t || tituloLegacy;
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
