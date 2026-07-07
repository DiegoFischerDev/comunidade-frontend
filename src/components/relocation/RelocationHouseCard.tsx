"use client";

import Image from "next/image";
import Link from "next/link";

import { CardButton, CardLinkButton } from "@/components/ui/CardButton";
import { useAuth } from "@/contexts/AuthContext";
import { formatHouseEntradaWithTotal } from "@/lib/house-entrance";

import {
  formatRelocationFeeEur,
  formatRelocationPriceByBusinessType,
  getRelocationHouseMedia,
  RELOCATION_BUSINESS_TYPE_LABELS,
  RELOCATION_TYPOLOGY_LABELS,
  relocationCityDisplayName,
  relocationAvailabilityLabel,
  relocationNextImageUnoptimized,
  openRelocationPartnerWhatsApp,
  type RelocationHouseRow,
} from "./relocation-house-shared";

type Props = {
  house: RelocationHouseRow;
  /** Quando false, oculta o botão WhatsApp "Contactar" (ex.: página pública do parceiro). */
  showContactButton?: boolean;
  /** Destino do card (omissão: página no dashboard). */
  detailHref?: string;
};

export function RelocationHouseCard({
  house: h,
  showContactButton = true,
  detailHref,
}: Props) {
  const { user } = useAuth();
  const { videoSrc, primaryImageSrc, videoPosterSrc } = getRelocationHouseMedia(h);
  const cityLabel = relocationCityDisplayName(h.city);
  const typoLabel = RELOCATION_TYPOLOGY_LABELS[h.typology] ?? h.typology;
  const businessTypeLabel = RELOCATION_BUSINESS_TYPE_LABELS[h.businessType] ?? "Arrendamento";
  const listingHref =
    detailHref ?? `/dashboard/casas/${encodeURIComponent(h.id)}`;
  const handleContactClick = () => {
    openRelocationPartnerWhatsApp(h);
  };

  return (
    <article className="group flex w-full flex-col overflow-hidden rounded-xl border border-border/90 bg-card text-left shadow-sm transition-shadow duration-200 hover:border-border hover:shadow-md">
      <Link
        href={listingHref}
        className="relative block aspect-[4/3] w-full cursor-pointer overflow-hidden bg-primary-1 outline-none ring-inset transition hover:opacity-[0.98] focus-visible:ring-2 focus-visible:ring-brand-primary/25/90 focus-visible:ring-offset-0"
        aria-label={`Ver imóvel: ${h.title}`}
      >
        {primaryImageSrc ? (
          <Image
            src={primaryImageSrc}
            alt=""
            fill
            className="object-cover transition group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, 33vw"
            unoptimized={relocationNextImageUnoptimized(primaryImageSrc)}
          />
        ) : videoPosterSrc ? (
          <Image
            src={videoPosterSrc}
            alt=""
            fill
            className="object-cover transition group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 100vw, 33vw"
            unoptimized={relocationNextImageUnoptimized(videoPosterSrc)}
          />
        ) : videoSrc ? (
          <>
            {/* Mobile (iOS): vídeo pode não pintar 1º frame sem interação → fallback. */}
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-primary-1 text-muted md:hidden">
              <svg
                viewBox="0 0 24 24"
                className="h-9 w-9 text-muted/80"
                fill="currentColor"
                aria-hidden
              >
                <path d="M3 6.75A2.75 2.75 0 0 1 5.75 4h8.5A2.75 2.75 0 0 1 17 6.75v1.19l2.22-1.27A1.5 1.5 0 0 1 21.5 7.97v8.06a1.5 1.5 0 0 1-2.28 1.3L17 16.06v1.19A2.75 2.75 0 0 1 14.25 20h-8.5A2.75 2.75 0 0 1 3 17.25v-10.5Z" />
              </svg>
              <span className="text-sm font-medium">Vídeo</span>
            </div>

            {/* Desktop: manter preview via vídeo (funciona bem). */}
            <video
              src={videoSrc}
              className="pointer-events-none hidden h-full w-full object-cover transition group-hover:scale-[1.02] md:block"
              muted
              playsInline
              preload="metadata"
            />
          </>
        ) : (
          <div className="flex h-full min-h-[8rem] items-center justify-center text-sm text-muted/80">Sem média</div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 px-4 pb-1 pt-4">
        <div>
          <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground sm:text-base">
            {h.title}
          </h2>
          <p className="mt-1 text-xs text-muted">
            Id: {h.houseId} · {typoLabel} · {cityLabel} · {businessTypeLabel}
          </p>
        </div>

        <div className="border-t border-border/60 pt-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted/80">
            {h.businessType === "SALE" ? "Preço de venda" : "Renda mensal"}
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-foreground">
            {formatRelocationPriceByBusinessType(h.priceEur, h.businessType)}
          </p>
        </div>

        <p className="text-xs text-muted">{relocationAvailabilityLabel(h.availableFrom)}</p>

        {h.businessType !== "SALE" ? (
          <dl className="space-y-2 text-xs">
            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0 text-muted">Taxa relocation</dt>
              <dd className="text-right font-medium tabular-nums text-foreground">
                {formatRelocationFeeEur(h.relocationFeeEur)}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="shrink-0 text-muted">Entrada</dt>
              <dd className="text-right font-medium text-foreground">
                {formatHouseEntradaWithTotal(h.caucoesCount, h.rendasEntradaCount, h.priceEur)}
              </dd>
            </div>
          </dl>
        ) : null}
      </div>
      <div className="mt-auto border-t border-border/60 bg-page/50 px-4 py-3">
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <CardLinkButton
            href={listingHref}
            variant="primary"
            className={
              showContactButton
                ? "min-w-[8rem] flex-1 sm:flex-initial"
                : "w-full min-w-0 sm:ml-auto sm:w-auto"
            }
          >
            Ver imóvel
          </CardLinkButton>
          {showContactButton ? (
            <CardButton
              type="button"
              variant="navGold"
              onClick={handleContactClick}
              className="min-w-[8rem] flex-1 sm:flex-initial"
            >
              Contactar
            </CardButton>
          ) : null}
        </div>
      </div>
    </article>
  );
}
