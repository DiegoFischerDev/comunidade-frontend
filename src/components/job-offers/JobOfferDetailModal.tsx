"use client";

import { ModalPortal } from "@/components/ui/ModalPortal";

export type JobOfferDetail = {
  id: string;
  title: string;
  jobFunction: string;
  city: string;
  description: string;
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

type Props = {
  offer: JobOfferDetail | null;
  onClose: () => void;
};

export function JobOfferDetailModal({ offer, onClose }: Props) {
  if (!offer) return null;

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
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-amber-800/90">
                {offer.city}
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-700">
                {offer.jobFunction}
              </p>
              <h2
                id="job-offer-detail-title"
                className="mt-1 text-xl font-bold text-zinc-900"
              >
                {offer.title}
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
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
          <div className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
            {offer.description}
          </div>
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
