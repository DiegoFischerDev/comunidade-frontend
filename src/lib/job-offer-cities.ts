export type JobOfferCityOption = {
  city: string;
  count: number;
};

/** Cidades distintas com ofertas na listagem (últimos ~3 dias), ordenadas, com contagem. */
export function uniqueJobOfferCities(
  offers: Array<{ city: string }>,
): JobOfferCityOption[] {
  const byKey = new Map<string, JobOfferCityOption>();
  for (const offer of offers) {
    const raw = offer.city?.trim();
    if (!raw) continue;
    const key = raw.toLocaleLowerCase("pt-PT");
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      byKey.set(key, { city: raw, count: 1 });
    }
  }
  return [...byKey.values()].sort((a, b) =>
    a.city.localeCompare(b.city, "pt-PT", { sensitivity: "base" }),
  );
}

export function cityMatchesFilter(offerCity: string, filter: string): boolean {
  if (!filter) return true;
  return (
    offerCity.trim().toLocaleLowerCase("pt-PT") ===
    filter.trim().toLocaleLowerCase("pt-PT")
  );
}
