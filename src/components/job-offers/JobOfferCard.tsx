"use client";

import type { JobOfferContact } from "@/components/job-offers/JobOfferDetailView";
import { CardButton } from "@/components/ui/CardButton";

type JobOfferListItem = {
  id: string;
  title: string;
  jobFunction: string;
  city: string;
  company?: string;
  summary?: string;
  advertiserContacts?: JobOfferContact[];
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

function BuildingIcon({ className }: { className?: string }) {
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
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
      <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01" />
    </svg>
  );
}

function contactHref(c: JobOfferContact): string | null {
  const value = c.value.trim();
  if (!value) return null;
  if (c.type === "email") return `mailto:${value}`;
  if (c.type === "phone") {
    const digits = value.replace(/[^\d+]/g, "");
    return digits ? `tel:${digits}` : null;
  }
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function contactTypeLabel(type: JobOfferContact["type"]): string {
  if (type === "email") return "Email";
  if (type === "phone") return "Telefone";
  return "Link";
}

function formatPublishedAtShort(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
  });
}

/** Altura mínima partilhada (carrossel e skeleton). */
export const JOB_OFFER_CARD_MIN_HEIGHT_CLASS = "min-h-[16rem]";

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
  const company = offer.company?.trim() || "";
  const summary = offer.summary?.trim() || "";
  const contacts = (offer.advertiserContacts ?? []).filter((c) =>
    c.value.trim(),
  );
  const publishedLabel = formatPublishedAtShort(offer.publishedAt);

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

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="inline-flex min-h-[1.25rem] items-center gap-1.5 text-sm font-medium leading-snug text-foreground/90">
            <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-brand-primary" />
            <span className="line-clamp-1">{local}</span>
          </p>
          {publishedLabel ? (
            <span className="text-[11px] text-muted">{publishedLabel}</span>
          ) : null}
        </div>

        <h2 className="line-clamp-2 text-base font-bold leading-snug text-foreground">
          {jobFunction}
        </h2>

        {company ? (
          <p className="inline-flex min-w-0 items-start gap-1.5 text-sm leading-snug text-muted">
            <BuildingIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted/80" />
            <span className="line-clamp-1">{company}</span>
          </p>
        ) : null}

        {summary ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted">
            {summary}
          </p>
        ) : null}

        {contacts.length > 0 ? (
          <div className="rounded-lg border border-emerald-200/70 bg-emerald-50/50 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-900/80">
              Candidaturas
            </p>
            <ul className="mt-1 space-y-1">
              {contacts.slice(0, 2).map((c, i) => {
                const href = contactHref(c);
                const label = c.value.trim();
                return (
                  <li key={`${c.type}-${label}-${i}`} className="min-w-0">
                    {href ? (
                      <a
                        href={href}
                        target={c.type === "url" ? "_blank" : undefined}
                        rel={
                          c.type === "url" ? "noopener noreferrer" : undefined
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="block truncate text-xs font-medium text-emerald-900 underline-offset-2 hover:underline"
                        title={`${contactTypeLabel(c.type)}: ${label}`}
                      >
                        <span className="text-emerald-800/70">
                          {contactTypeLabel(c.type)}:{" "}
                        </span>
                        {label}
                      </a>
                    ) : (
                      <span className="block truncate text-xs text-emerald-900">
                        <span className="text-emerald-800/70">
                          {contactTypeLabel(c.type)}:{" "}
                        </span>
                        {label}
                      </span>
                    )}
                  </li>
                );
              })}
              {contacts.length > 2 ? (
                <li className="text-[11px] text-emerald-800/70">
                  +{contacts.length - 2} contacto
                  {contacts.length - 2 === 1 ? "" : "s"}
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>

      <div className={isCarousel ? "mt-auto pt-3" : "mt-3"}>
        <CardButton
          type="button"
          variant="secondary"
          size="sm"
          fullWidth
          onClick={onOpenDetail}
          className="!rounded-lg px-3 py-2.5 text-xs shadow-sm sm:text-sm"
        >
          Saber mais
        </CardButton>
      </div>
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
        <div className="h-10 w-full animate-pulse rounded-lg bg-emerald-50" />
      </div>
      <div className={isCarousel ? "mt-auto pt-3" : "mt-3"}>
        <div className="h-9 w-full animate-pulse rounded-lg bg-zinc-200" />
      </div>
    </div>
  );
}
