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
 * Entrada pública para partilha de anúncio → WhatsApp do parceiro (com tracking).
 * Aceita id interno (cuid) ou número sequencial do anúncio (#houseId).
 */
export default async function ImovelRedirectEntryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const id = firstString(sp, "id");

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(
    /\/$/,
    "",
  );

  if (id) {
    redirect(
      `${apiBase}/redirect-links/public/by-house/${encodeURIComponent(id)}`,
    );
  }

  redirect("/");
}
