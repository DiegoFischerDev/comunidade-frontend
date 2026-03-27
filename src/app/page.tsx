import { redirect } from "next/navigation";

function buildDashboardPath(
  searchParams: Record<string, string | string[] | undefined>,
): string {
  const qs = new URLSearchParams();
  for (const key of Object.keys(searchParams)) {
    const val = searchParams[key];
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      val.forEach((v) => qs.append(key, v));
    } else {
      qs.set(key, val);
    }
  }
  const query = qs.toString();
  return query ? `/dashboard?${query}` : "/dashboard";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  redirect(buildDashboardPath(params));
}
