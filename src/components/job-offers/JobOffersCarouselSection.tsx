"use client";

import { JobOfferCard } from "@/components/job-offers/JobOfferCard";
import {
  CENTERED_PEEK_CAROUSEL_ITEM,
  CENTERED_PEEK_CAROUSEL_TRACK,
  HorizontalSnapCarousel,
} from "@/components/ui/horizontal-snap-carousel";

/** Mobile: 76vw + peek; desktop (md+): 3 cartões visíveis (gap 1.25rem entre eles). */
export const JOB_OFFER_CAROUSEL_ITEM = `${CENTERED_PEEK_CAROUSEL_ITEM} flex flex-col md:!w-[calc((100%-2*1.25rem)/3)] md:!max-w-none`;

export const JOB_OFFER_CAROUSEL_TRACK = `items-stretch ${CENTERED_PEEK_CAROUSEL_TRACK} md:justify-start`;

/** Contentor do carrossel: full-bleed no telemóvel; mais largo no desktop. */
export const JOB_OFFER_CAROUSEL_SHELL =
  "relative -mx-4 mt-2 w-[calc(100%+2rem)] overflow-visible sm:-mx-6 sm:w-[calc(100%+3rem)] md:mx-0 md:mt-0 md:w-full md:px-16 lg:px-20 xl:px-24";

export type JobOfferCarouselItem = {
  id: string;
  publicNumber: number;
  title: string;
  jobFunction: string;
  city: string;
  company?: string;
  publishedAt: string;
};

type Props<T extends JobOfferCarouselItem = JobOfferCarouselItem> = {
  offers: T[];
  ariaLabel: string;
  onOpenDetail: (offer: T) => void;
  isAdmin?: boolean;
  onEdit?: (offer: T) => void;
  onDelete?: (offer: T) => void;
  deletingId?: string | null;
};

export function JobOffersCarouselSection<T extends JobOfferCarouselItem>({
  offers,
  ariaLabel,
  onOpenDetail,
  isAdmin = false,
  onEdit,
  onDelete,
  deletingId = null,
}: Props<T>) {
  if (offers.length === 0) return null;

  const trackClassName =
    offers.length < 3
      ? `${JOB_OFFER_CAROUSEL_TRACK} md:justify-center`
      : JOB_OFFER_CAROUSEL_TRACK;

  return (
    <div className={JOB_OFFER_CAROUSEL_SHELL}>
      <HorizontalSnapCarousel
        slideCount={offers.length}
        ariaLabel={ariaLabel}
        navStyle="fadeMobile"
        navPlacement="outset"
        centeredPeek
        prevAriaLabel="Vaga anterior"
        nextAriaLabel="Vaga seguinte"
        trackClassName={trackClassName}
      >
        {offers.map((offer) => (
          <div key={offer.id} className={JOB_OFFER_CAROUSEL_ITEM}>
            <JobOfferCard
              variant="carousel"
              offer={offer}
              onOpenDetail={() => onOpenDetail(offer)}
              isAdmin={isAdmin}
              onEdit={onEdit ? () => onEdit(offer) : undefined}
              onDelete={onDelete ? () => onDelete(offer) : undefined}
              deleting={deletingId === offer.id}
            />
          </div>
        ))}
      </HorizontalSnapCarousel>
    </div>
  );
}
