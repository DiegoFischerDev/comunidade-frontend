"use client";

import { JobOfferCardSkeleton } from "@/components/job-offers/JobOfferCard";
import {
  JOB_OFFER_CAROUSEL_ITEM,
  JOB_OFFER_CAROUSEL_SHELL,
  JOB_OFFER_CAROUSEL_TRACK,
  JobOffersCarouselSection,
  type JobOfferCarouselItem,
} from "@/components/job-offers/JobOffersCarouselSection";
import { HorizontalSnapCarousel } from "@/components/ui/horizontal-snap-carousel";
import { partitionJobOffersByDate } from "@/lib/job-offer-date-buckets";

const SECTIONS: {
  key: "today" | "yesterday" | "older";
  title: string;
  carouselLabel: string;
}[] = [
  { key: "today", title: "Hoje", carouselLabel: "Vagas de hoje" },
  { key: "yesterday", title: "Ontem", carouselLabel: "Vagas de ontem" },
  {
    key: "older",
    title: "Antes de ontem",
    carouselLabel: "Vagas anteriores a ontem",
  },
];

type Props<T extends JobOfferCarouselItem = JobOfferCarouselItem> = {
  offers: T[];
  loading?: boolean;
  onOpenDetail: (offer: T) => void;
  isAdmin?: boolean;
  onEdit?: (offer: T) => void;
  onDelete?: (offer: T) => void;
  deletingId?: string | null;
};

function CarouselSkeleton() {
  return (
    <div className={JOB_OFFER_CAROUSEL_SHELL}>
      <HorizontalSnapCarousel
        slideCount={2}
        ariaLabel="A carregar vagas"
        hideNavWhenSingle={false}
        navStyle="fadeMobile"
        navPlacement="outset"
        centeredPeek
        trackClassName={JOB_OFFER_CAROUSEL_TRACK}
      >
        {[0, 1].map((i) => (
          <div key={i} className={JOB_OFFER_CAROUSEL_ITEM}>
            <JobOfferCardSkeleton variant="carousel" />
          </div>
        ))}
      </HorizontalSnapCarousel>
    </div>
  );
}

export function JobOffersDateCarousels<T extends JobOfferCarouselItem>({
  offers,
  loading = false,
  onOpenDetail,
  isAdmin = false,
  onEdit,
  onDelete,
  deletingId = null,
}: Props<T>) {
  if (loading) {
    return (
      <div className="space-y-8">
        {SECTIONS.map((s) => (
          <section key={s.key} aria-busy="true">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
              {s.title}
            </h2>
            <div className="mt-3">
              <CarouselSkeleton />
            </div>
          </section>
        ))}
      </div>
    );
  }

  const buckets = partitionJobOffersByDate(offers);
  const visibleSections = SECTIONS.filter((s) => buckets[s.key].length > 0);

  if (visibleSections.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
        <p className="font-medium text-zinc-800">Nenhuma oferta encontrada</p>
        <p className="mt-1">
          Tenta outras palavras (função, cidade ou empresa).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {visibleSections.map((s) => (
        <section key={s.key}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
              {s.title}
            </h2>
            <span className="text-xs font-medium text-zinc-500">
              {buckets[s.key].length === 1
                ? "1 vaga"
                : `${buckets[s.key].length} vagas`}
            </span>
          </div>
          <div className="mt-3">
            <JobOffersCarouselSection
              offers={buckets[s.key]}
              ariaLabel={s.carouselLabel}
              onOpenDetail={onOpenDetail}
              isAdmin={isAdmin}
              onEdit={onEdit}
              onDelete={onDelete}
              deletingId={deletingId}
            />
          </div>
        </section>
      ))}
    </div>
  );
}
