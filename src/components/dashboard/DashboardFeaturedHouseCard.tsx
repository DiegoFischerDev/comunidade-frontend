"use client";

import Image from "next/image";
import Link from "next/link";

import {
  formatRelocationPriceByBusinessType,
  getRelocationHouseMedia,
  RELOCATION_BUSINESS_TYPE_LABELS,
  RELOCATION_TYPOLOGY_LABELS,
  relocationAvailabilityLabel,
  relocationCityDisplayName,
  relocationNextImageUnoptimized,
  type RelocationHouseRow,
} from "@/components/relocation/relocation-house-shared";

const DASHBOARD_HOUSE_CAROUSEL_IMAGE_SIZES = "(max-width: 767px) 76vw, 288px";

type Props = {
  house: RelocationHouseRow;
};

export function DashboardFeaturedHouseCard({ house: h }: Props) {
  const { primaryImageSrc, videoPosterSrc } = getRelocationHouseMedia(h);
  const imageSrc = primaryImageSrc ?? videoPosterSrc;
  const cityLabel = relocationCityDisplayName(h.city);
  const typoLabel = RELOCATION_TYPOLOGY_LABELS[h.typology] ?? h.typology;
  const businessTypeLabel =
    RELOCATION_BUSINESS_TYPE_LABELS[h.businessType] ?? "Arrendamento";
  const detailHref = `/dashboard/casas/${encodeURIComponent(h.id)}`;

  return (
    <article className="dashboard-carousel-card flex h-full flex-col overflow-hidden rounded-lg border border-border bg-page/80 shadow-sm">
      <Link
        href={detailHref}
        className="flex min-h-0 flex-1 flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 focus-visible:ring-offset-2"
        aria-label={`Ver imóvel: ${h.title}`}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-primary-1">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt=""
              fill
              className="dashboard-carousel-card-media object-cover"
              sizes={DASHBOARD_HOUSE_CAROUSEL_IMAGE_SIZES}
              unoptimized={relocationNextImageUnoptimized(imageSrc)}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted/80">
              Sem imagem
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 px-3 pb-4 pt-3">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">
            {h.title}
          </h3>
          <p className="text-xs text-muted">
            {typoLabel} · {cityLabel} · {businessTypeLabel}
          </p>
          <p className="mt-auto text-base font-semibold tabular-nums tracking-tight text-foreground">
            {formatRelocationPriceByBusinessType(h.priceEur, h.businessType)}
          </p>
          <p className="text-xs text-muted">
            {relocationAvailabilityLabel(h.availableFrom)}
          </p>
        </div>
      </Link>
    </article>
  );
}
