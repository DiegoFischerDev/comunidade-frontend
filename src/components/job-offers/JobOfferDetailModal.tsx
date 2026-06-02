"use client";

import { ModalPortal } from "@/components/ui/ModalPortal";

export type JobOfferContact = {
  type: "email" | "phone" | "url";
  value: string;
};

export type JobOfferDetail = {
  id: string;
  title: string;
  jobFunction: string;
  city: string;
  company: string;
  summary: string;
  description: string;
  advertiserContacts: JobOfferContact[];
  publishedAt: string;
};

function formatPublishedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatContactLabel(c: JobOfferContact): string {
  if (c.type === "email") return `📧 ${c.value}`;
  if (c.type === "phone") return `📲 ${c.value}`;
  return `🔗 ${c.value}`;
}

type Props = {
  offer: JobOfferDetail | null;
  onClose: () => void;
};

export function JobOfferDetailModal({ offer, onClose }: Props) {
  if (!offer) return null;

  const bodyText =
    offer.summary.trim() || offer.description.trim();

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        role="presentation"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="job-offer-detail-title"
          className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
                {offer.city}
              </span>
              <h2
                id="job-offer-detail-title"
                className="mt-3 text-xl font-bold leading-snug text-zinc-900 sm:text-2xl"
              >
                {offer.jobFunction}
              </h2>
              {offer.company.trim() ? (
                <p className="mt-2 text-sm font-semibold text-zinc-800">
                  🏢 {offer.company}
                </p>
              ) : null}
              {offer.title.trim() ? (
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                  {offer.title}
                </p>
              ) : null}
              <p className="mt-3 text-xs text-zinc-500">
                Publicado em {formatPublishedAt(offer.publishedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          {offer.advertiserContacts.length > 0 ? (
            <div className="mt-5 rounded-xl border border-emerald-200/80 bg-emerald-50/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
                Candidaturas
              </p>
              <ul className="mt-2 space-y-1 text-sm text-zinc-800">
                {offer.advertiserContacts.map((c, i) => (
                  <li key={`${c.type}-${c.value}-${i}`}>
                    {formatContactLabel(c)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
            {bodyText}
          </div>
          {offer.summary.trim() &&
          offer.description.trim() &&
          offer.summary.trim() !== offer.description.trim() ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-amber-800">
                Ver descrição completa
              </summary>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">
                {offer.description}
              </div>
            </details>
          ) : null}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
