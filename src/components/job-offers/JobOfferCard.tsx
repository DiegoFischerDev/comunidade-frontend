"use client";

type JobOfferListItem = {
  id: string;
  title: string;
  jobFunction: string;
  city: string;
  publishedAt: string;
};

function formatPublishedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
  });
}

function publishedRecencyLabel(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "Hoje";
  if (days === 1) return "Há 1 dia";
  if (days < 7) return `Há ${days} dias`;
  return null;
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

type Props = {
  offer: JobOfferListItem;
  onOpenDetail: () => void;
};

export function JobOfferCard({ offer, onOpenDetail }: Props) {
  const recency = publishedRecencyLabel(offer.publishedAt);
  const dateLabel = formatPublishedDate(offer.publishedAt);

  return (
    <article className="group rounded-xl border border-zinc-200/90 bg-white px-3.5 py-3 shadow-sm ring-1 ring-zinc-900/5 transition hover:border-amber-200/80 hover:shadow-md sm:px-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {recency ? (
              <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-emerald-200/70">
                {recency}
              </span>
            ) : (
              <span className="text-[11px] text-zinc-500">{dateLabel}</span>
            )}
            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-50 px-2 py-0.5 text-[11px] font-medium text-zinc-700 ring-1 ring-zinc-200/70">
              <MapPinIcon className="h-3 w-3 shrink-0 text-amber-700" />
              {offer.city}
            </span>
            {recency ? (
              <span className="text-[11px] text-zinc-400">{dateLabel}</span>
            ) : null}
          </div>

          <h2 className="mt-1.5 text-base font-bold leading-snug text-zinc-900">
            {offer.jobFunction}
          </h2>

          {offer.title.trim() ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">
              {offer.title}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={onOpenDetail}
          className="shrink-0 cursor-pointer rounded-lg bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-105 sm:px-3.5 sm:text-sm"
        >
          Saber mais
        </button>
      </div>
    </article>
  );
}

export function JobOfferCardSkeleton() {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm"
      aria-hidden
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex gap-2">
          <div className="h-4 w-14 animate-pulse rounded-full bg-zinc-200" />
          <div className="h-4 w-20 animate-pulse rounded-md bg-zinc-100" />
        </div>
        <div className="h-5 w-3/5 max-w-[200px] animate-pulse rounded bg-zinc-200" />
        <div className="h-3 w-2/5 animate-pulse rounded bg-zinc-100" />
      </div>
      <div className="h-8 w-20 shrink-0 animate-pulse rounded-lg bg-zinc-200" />
    </div>
  );
}
