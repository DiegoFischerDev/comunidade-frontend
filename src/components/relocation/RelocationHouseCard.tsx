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
};

export function RelocationHouseCard({ house: h, showContactButton = true }: Props) {
  const { user } = useAuth();
  const { videoSrc, primaryImageSrc, videoPosterSrc } = getRelocationHouseMedia(h);
  const cityLabel = relocationCityDisplayName(h.city);
  const typoLabel = RELOCATION_TYPOLOGY_LABELS[h.typology] ?? h.typology;
  const businessTypeLabel = RELOCATION_BUSINESS_TYPE_LABELS[h.businessType] ?? "Arrendamento";
  const handleContactClick = () => {
    openRelocationPartnerWhatsApp(h);
  };

  return (
    <article className="group flex w-full flex-col overflow-hidden rounded-xl border border-zinc-200/90 bg-white text-left shadow-sm ring-1 ring-zinc-900/5 transition-shadow duration-200 hover:border-zinc-300 hover:shadow-md">
      <Link
        href={`/dashboard/casas/${encodeURIComponent(h.id)}`}
        className="relative block aspect-[4/3] w-full cursor-pointer overflow-hidden bg-zinc-100 outline-none ring-inset transition hover:opacity-[0.98] focus-visible:ring-2 focus-visible:ring-amber-500/90 focus-visible:ring-offset-0"
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
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-zinc-100 text-zinc-500 md:hidden">
              <svg
                viewBox="0 0 24 24"
                className="h-9 w-9 text-zinc-400"
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
          <div className="flex h-full min-h-[8rem] items-center justify-center text-sm text-zinc-400">Sem média</div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 px-4 pb-1 pt-4">
        <div>
          <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug text-zinc-900 sm:text-base">
            {h.title}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Id: {h.houseId} · {typoLabel} · {cityLabel} · {businessTypeLabel}
          </p>
        </div>

        <div className="border-t border-zinc-100 pt-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
            {h.businessType === "SALE" ? "Preço de venda" : "Renda mensal"}
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-zinc-900">
            {formatRelocationPriceByBusinessType(h.priceEur, h.businessType)}
          </p>
        </div>

        <p className="text-xs text-zinc-500">{relocationAvailabilityLabel(h.availableFrom)}</p>

        <dl className="space-y-2 text-xs">
          <div className="flex items-start justify-between gap-3">
            <dt className="shrink-0 text-zinc-500">Taxa relocation</dt>
            <dd className="text-right font-medium tabular-nums text-zinc-800">
              {formatRelocationFeeEur(h.relocationFeeEur)}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3">
            <dt className="shrink-0 text-zinc-500">Entrada</dt>
            <dd className="text-right font-medium text-zinc-800">
              {formatHouseEntradaWithTotal(h.caucoesCount, h.rendasEntradaCount, h.priceEur)}
            </dd>
          </div>
        </dl>
      </div>
      <div className="mt-auto border-t border-zinc-100 bg-zinc-50/50 px-4 py-3">
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <CardLinkButton
            href={`/dashboard/casas/${encodeURIComponent(h.id)}`}
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
