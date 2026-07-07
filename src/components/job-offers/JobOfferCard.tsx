"use client";

type JobOfferListItem = {
  id: string;
  title: string;
  jobFunction: string;
  city: string;
  company?: string;
  publishedAt: string;
};

function PencilIcon({ className }: { className?: string }) {
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
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
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
      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
    </svg>
  );
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

/** Altura mínima partilhada (carrossel e skeleton). */
export const JOB_OFFER_CARD_MIN_HEIGHT_CLASS = "min-h-[10rem]";

type Props = {
  offer: JobOfferListItem;
  onOpenDetail: () => void;
  isAdmin?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  deleting?: boolean;
  /** Carrossel: altura mínima fixa e conteúdo centrado verticalmente. */
  variant?: "default" | "carousel";
};

export function JobOfferCard({
  offer,
  onOpenDetail,
  isAdmin = false,
  onEdit,
  onDelete,
  deleting = false,
  variant = "default",
}: Props) {
  const isCarousel = variant === "carousel";
  const local = offer.city.trim() || "—";
  const jobFunction = offer.jobFunction.trim() || "—";
  const company = offer.company?.trim() || "—";

  return (
    <article
      className={`group flex flex-col rounded-xl border border-border/90 bg-card px-3.5 py-3 shadow-sm transition hover:border-brand-accent/40 hover:shadow-md sm:px-4 ${
        isCarousel ? `h-full w-full ${JOB_OFFER_CARD_MIN_HEIGHT_CLASS}` : ""
      }`}
    >
      {isAdmin && (onEdit || onDelete) ? (
        <div className="mb-2 flex justify-end gap-1.5">
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              aria-label="Editar oferta"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-border bg-card text-muted transition hover:border-brand-accent/50 hover:bg-page hover:text-brand-primary"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              aria-label="Excluir oferta"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-red-200 bg-card text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="inline-flex min-h-[1.25rem] items-center gap-1.5 text-sm font-medium leading-snug text-foreground/90">
          <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-brand-primary" />
          <span className="line-clamp-1">{local}</span>
        </p>

        <h2 className="line-clamp-2 text-base font-bold leading-snug text-foreground">
          {jobFunction}
        </h2>

        <p className="line-clamp-2 min-h-[1.25rem] text-sm leading-snug text-muted">
          {company}
        </p>
      </div>

      <button
        type="button"
        onClick={onOpenDetail}
        className={`mt-3 w-full cursor-pointer rounded-lg brand-cta-accent px-3 py-2.5 text-xs shadow-sm transition hover:brightness-105 sm:text-sm ${
          isCarousel ? "mt-auto" : ""
        }`}
      >
        Saber mais
      </button>
    </article>
  );
}

export function JobOfferCardSkeleton({
  variant = "default",
}: {
  variant?: "default" | "carousel";
} = {}) {
  const isCarousel = variant === "carousel";

  return (
    <div
      className={`flex flex-col rounded-xl border border-border bg-card px-4 py-3 shadow-sm ${
        isCarousel ? `h-full w-full ${JOB_OFFER_CARD_MIN_HEIGHT_CLASS}` : ""
      }`}
      aria-hidden
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-4 w-2/5 animate-pulse rounded bg-primary-1" />
        <div className="h-5 w-4/5 animate-pulse rounded bg-zinc-200" />
        <div className="h-4 w-3/5 animate-pulse rounded bg-primary-1" />
      </div>
      <div
        className={`h-9 w-full animate-pulse rounded-lg bg-zinc-200 ${
          isCarousel ? "mt-auto" : "mt-3"
        }`}
      />
    </div>
  );
}
