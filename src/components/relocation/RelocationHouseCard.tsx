"use client";

import Image from "next/image";
import Link from "next/link";

import { HouseStatusBadge } from "@/components/house/HouseStatusBadge";
import { cardButtonPrimaryClass } from "@/components/ui/CardButton";
import { formatHouseEntradaShort } from "@/lib/house-entrance";

import {
  formatRelocationFeeEur,
  formatRelocationRentPerMonth,
  getRelocationHouseMedia,
  RELOCATION_CITY_LABELS,
  RELOCATION_TYPOLOGY_LABELS,
  relocationAvailabilityLabel,
  relocationNextImageUnoptimized,
  openRelocationPartnerWhatsApp,
  type RelocationHouseRow,
} from "./relocation-house-shared";

type Props = {
  house: RelocationHouseRow;
};

export function RelocationHouseCard({ house: h }: Props) {
  const { videoSrc, primaryImageSrc } = getRelocationHouseMedia(h);
  const cityLabel = RELOCATION_CITY_LABELS[h.city] ?? h.city;
  const typoLabel = RELOCATION_TYPOLOGY_LABELS[h.typology] ?? h.typology;
  const isListedButNotForContact = h.status !== "AVAILABLE";

  return (
    <article
      className={`group flex w-full flex-col overflow-hidden rounded-xl border text-left shadow-sm ring-1 ring-zinc-900/5 transition-shadow duration-200 hover:shadow-md ${
        isListedButNotForContact
          ? "border-zinc-200/90 bg-zinc-50/80 opacity-[0.97] hover:border-zinc-300"
          : "border-zinc-200/90 bg-white hover:border-zinc-300"
      }`}
    >
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
        ) : videoSrc ? (
          <video
            src={videoSrc}
            className="pointer-events-none h-full w-full object-cover transition group-hover:scale-[1.02]"
            muted
            playsInline
            preload="metadata"
          />
        ) : (
          <div className="flex h-full min-h-[8rem] items-center justify-center text-sm text-zinc-400">Sem média</div>
        )}
        {videoSrc ? (
          <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
            Vídeo
          </span>
        ) : null}
        <div className="pointer-events-none absolute left-2 top-2 z-10">
          <HouseStatusBadge status={h.status} variant="overlay" />
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-3 px-4 pb-1 pt-4">
        <div>
          <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug text-zinc-900 sm:text-base">
            {h.title}
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {typoLabel} · {cityLabel}
          </p>
        </div>

        <div className="border-t border-zinc-100 pt-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">Renda mensal</p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-zinc-900">
            {formatRelocationRentPerMonth(h.priceEur)}
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
              {formatHouseEntradaShort(h.caucoesCount, h.rendasEntradaCount)}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-3 border-t border-zinc-100 pt-2">
            <dt className="shrink-0 text-zinc-500">Anunciante</dt>
            <dd className="line-clamp-2 text-right font-medium text-zinc-800">{h.partner.name}</dd>
          </div>
        </dl>
      </div>
      <div className="mt-auto border-t border-zinc-100 bg-zinc-50/50 px-4 py-3">
        {h.status === "AVAILABLE" ? (
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Link
              href={`/dashboard/casas/${encodeURIComponent(h.id)}`}
              className="inline-flex min-w-[8rem] flex-1 justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 sm:flex-initial"
            >
              Ver imóvel
            </Link>
            <button
              type="button"
              onClick={() => openRelocationPartnerWhatsApp(h)}
              className={`inline-flex min-w-[8rem] flex-1 cursor-pointer justify-center rounded-lg px-3 py-2 text-sm font-semibold shadow-sm sm:flex-initial ${cardButtonPrimaryClass}`}
            >
              Contactar relocation
            </button>
          </div>
        ) : h.status === "RESERVED" ? (
          <span className="inline-flex w-full items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-950 sm:text-sm">
            Reservado — contacto não disponível
          </span>
        ) : (
          <span className="inline-flex w-full items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 px-3 py-2 text-center text-xs text-zinc-600 sm:text-sm">
            Esse imóvel já não está mais disponível
          </span>
        )}
      </div>
    </article>
  );
}
