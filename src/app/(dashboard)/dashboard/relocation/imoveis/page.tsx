import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

function toQueryString(sp: SearchParams): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) v.forEach((x) => q.append(k, x));
    else q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

/**
 * Rota legada: mantida para links antigos. A listagem vive em {@link /relocation/imoveis}.
 */
export default async function LegacyDashboardRelocationImoveisPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  redirect(`/relocation/imoveis${toQueryString(sp)}`);
}
