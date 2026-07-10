"use client";

import { useEffect, useState } from "react";

import { DashboardFeaturedHouseCard } from "@/components/dashboard/DashboardFeaturedHouseCard";
import type { RelocationHouseRow } from "@/components/relocation/relocation-house-shared";
import {
  CENTERED_PEEK_CAROUSEL_ITEM,
  CENTERED_PEEK_CAROUSEL_TRACK,
  HorizontalSnapCarousel,
} from "@/components/ui/horizontal-snap-carousel";
import { api } from "@/lib/api";

const FEATURED_HOUSES_LIMIT = 5;

const DASHBOARD_HOUSE_CAROUSEL_ITEM = `${CENTERED_PEEK_CAROUSEL_ITEM} w-[min(288px,calc(100vw-2.75rem))] sm:w-[272px] md:w-[288px]`;

const DASHBOARD_HOUSE_CAROUSEL_TRACK = `relative z-10 items-stretch ${CENTERED_PEEK_CAROUSEL_TRACK} md:pt-5 md:pb-10`;

function CarouselSkeleton() {
  return (
    <div className={DASHBOARD_HOUSE_CAROUSEL_ITEM}>
      <div className="dashboard-carousel-card overflow-hidden rounded-lg border border-border bg-page/80 shadow-sm">
        <div className="aspect-[4/3] animate-pulse bg-primary-1" />
        <div className="space-y-2 px-3 py-4">
          <div className="h-4 w-4/5 animate-pulse rounded bg-primary-1" />
          <div className="h-3 w-3/5 animate-pulse rounded bg-primary-1" />
          <div className="h-5 w-2/5 animate-pulse rounded bg-primary-1" />
        </div>
      </div>
    </div>
  );
}

export function DashboardFeaturedHousesCarousel() {
  const [houses, setHouses] = useState<RelocationHouseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const data = await api.marketplace.relocationHouses({
          page: 1,
          pageSize: FEATURED_HOUSES_LIMIT,
          sort: "recent",
        });
        if (cancelled) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setHouses(items.slice(0, FEATURED_HOUSES_LIMIT));
      } catch {
        if (!cancelled) setHouses([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && houses.length === 0) return null;

  const trackClassName =
    !loading && houses.length < 3
      ? `${DASHBOARD_HOUSE_CAROUSEL_TRACK} md:justify-center`
      : DASHBOARD_HOUSE_CAROUSEL_TRACK;

  return (
    <section
      className="dashboard-carousel-section group relative mt-2 w-full px-0 pt-8 pb-10 md:mt-4 md:px-2 md:pt-10 md:pb-8"
      aria-label="Imóveis em destaque"
    >
      <h2 className="relative z-10 mb-4 px-4 text-center text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:mb-6 md:px-0">
        Imóveis em destaque
      </h2>

      <HorizontalSnapCarousel
        slideCount={loading ? FEATURED_HOUSES_LIMIT : houses.length}
        ariaLabel="Imóveis em destaque — use os botões ou deslize para navegar"
        navStyle="subtle"
        centeredPeek
        prevAriaLabel="Imóvel anterior"
        nextAriaLabel="Imóvel seguinte"
        trackClassName={trackClassName}
        hideNavWhenSingle={false}
      >
        {loading
          ? Array.from({ length: FEATURED_HOUSES_LIMIT }, (_, i) => (
              <CarouselSkeleton key={i} />
            ))
          : houses.map((house) => (
              <div key={house.id} className={DASHBOARD_HOUSE_CAROUSEL_ITEM}>
                <DashboardFeaturedHouseCard house={house} />
              </div>
            ))}
      </HorizontalSnapCarousel>
    </section>
  );
}
