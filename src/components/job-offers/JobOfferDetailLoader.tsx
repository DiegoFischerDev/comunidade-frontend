"use client";

import { notFound } from "next/navigation";
import { useEffect, useState } from "react";

import { JobOfferDetailView } from "@/components/job-offers/JobOfferDetailView";
import type { JobOfferDetailData } from "@/components/job-offers/JobOfferDetailView";
import { api } from "@/lib/api";

type Props = {
  offerId: string;
};

export function JobOfferDetailLoader({ offerId }: Props) {
  const [offer, setOffer] = useState<JobOfferDetailData | null | undefined>(
    undefined,
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.jobOffers.get(offerId);
        if (!cancelled) setOffer(data);
      } catch {
        if (!cancelled) setOffer(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [offerId]);

  if (offer === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <p className="text-sm text-zinc-500">A carregar oferta…</p>
      </div>
    );
  }

  if (!offer) notFound();

  return <JobOfferDetailView offer={offer} />;
}
