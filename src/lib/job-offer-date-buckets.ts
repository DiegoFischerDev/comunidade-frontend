/** Início do dia civil no fuso local do browser. */
function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export type JobOfferDateBucket = "today" | "yesterday" | "older";

export function getJobOfferDateBucket(publishedAt: string): JobOfferDateBucket {
  const published = new Date(publishedAt);
  if (Number.isNaN(published.getTime())) return "older";

  const todayStart = startOfLocalDay(new Date());
  const publishedStart = startOfLocalDay(published);
  const diffDays = Math.round((todayStart - publishedStart) / 86_400_000);

  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "yesterday";
  return "older";
}

export function partitionJobOffersByDate<T extends { publishedAt: string }>(
  offers: T[],
): Record<JobOfferDateBucket, T[]> {
  const buckets: Record<JobOfferDateBucket, T[]> = {
    today: [],
    yesterday: [],
    older: [],
  };
  for (const offer of offers) {
    buckets[getJobOfferDateBucket(offer.publishedAt)].push(offer);
  }
  return buckets;
}
