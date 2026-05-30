import Image from "next/image";
import Link from "next/link";

import type { PublicHousePageData } from "@/lib/house-public-server";
import { formatHouseEntradaWithTotal, orderHouseImagesWithCoverFirst } from "@/lib/house-entrance";
import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";
import { isOurImageHostname } from "@/lib/site-url";

import { HousePublicationStatusBadge } from "@/components/house/HousePublicationStatusBadge";

import { HouseContactSection } from "./house-contact-section";
import { HouseImageCarousel } from "./house-image-carousel";
import { relocationCityDisplayName } from "@/lib/relocation-portugal-cities";
import { partnerPublicPagePath } from "@/lib/partner-public-shared";
import { partnerCategoryName } from "@/lib/partner-categories";

const TYPOLOGY_LABELS: Record<string, string> = {
  T0: "T0",
  T1: "T1",
  T2: "T2",
  T3: "T3",
  T4: "T4",
  T5: "T5",
  QUARTO_AP_COMPARTILHADO: "Quarto em Ap compartilhado",
};

function formatPriceByBusinessType(priceEur: string, businessType: "RENT" | "SALE"): string {
  const t = priceEur
    .trim()
    .replace(/\s*€\s*$/i, "")
    .replace(/\s*\/\s*m[eê]s?\s*$/i, "")
    .trim();
  return businessType === "SALE" ? `${t} €` : `${t} € / mês`;
}

function formatRelocationFeeEur(raw: string): string {
  const t = (raw ?? "").trim().replace(/\s*€\s*$/i, "").trim();
  const digits = t.replace(/[^\d]/g, "");
  if (!digits || /^0+$/.test(digits)) return "Não informado";
  return `${t} €`;
}

function availabilityLabel(availableFromIso: string): string {
  const day = availableFromIso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const d = new Date(availableFromIso);
    if (Number.isNaN(d.getTime())) return "Data indisponível";
    return `Disponível a partir de ${d.toLocaleDateString("pt-PT")}`;
  }
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (day <= todayStr) return "Atualmente disponível";
  const [y, m, dd] = day.split("-").map(Number);
  const d = new Date(y, m - 1, dd);
  return `Disponível a partir de ${d.toLocaleDateString("pt-PT")}`;
}

function nextImageUnoptimized(resolvedUrl: string) {
  if (!resolvedUrl.startsWith("http")) return false;
  try {
    const h = new URL(resolvedUrl).hostname;
    if (isOurImageHostname(h)) return false;
    return true;
  } catch {
    return true;
  }
}

type Props = {
  house: PublicHousePageData;
  apiBaseUrl: string;
  /** `dashboard`: sem cabeçalho público; dentro do layout do painel. */
  variant?: "standalone" | "dashboard";
  /** Destino de «Ver todos os imóveis» (omissão: catálogo público). */
  allHousesHref?: string;
};

export function HousePublicView({
  house,
  apiBaseUrl,
  variant = "standalone",
  allHousesHref = "/relocation/imoveis",
}: Props) {
  const { partner } = house;
  const cityLabel = relocationCityDisplayName(house.city);
  const typoLabel = TYPOLOGY_LABELS[house.typology] ?? house.typology;
  const isSale = house.businessType === "SALE";
  const entrada = !isSale
    ? formatHouseEntradaWithTotal(
        house.caucoesCount,
        house.rendasEntradaCount,
        house.priceEur,
      )
    : null;

  const videoSrc = house.videoUrl ? resolveUploadsUrl(house.videoUrl) : null;
  const orderedUrls = orderHouseImagesWithCoverFirst(
    house.imageUrls ?? [],
    house.coverImageUrl,
  );
  const photos = orderedUrls.map(resolveUploadsUrl).filter(Boolean);

  const logoSrc =
    partner.logoUrl && partner.logoUrl.startsWith("/uploads/")
      ? `${apiBaseUrl}${partner.logoUrl}`
      : partner.logoUrl;

  const isDashboard = variant === "dashboard";

  return (
    <div
      className={
        isDashboard
          ? "w-full bg-gradient-to-b from-zinc-100/80 to-zinc-50/80 pb-8 pt-2"
          : "min-h-screen bg-gradient-to-b from-zinc-100 to-zinc-50"
      }
    >
      {!isDashboard ? (
        <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/85 shadow-sm backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
            <Link
              href="/"
              className="inline-flex min-w-0 flex-1 items-center gap-2 pr-3 sm:gap-3 sm:pr-4"
              aria-label="Comunidade Rafa Portugal — início"
            >
              <Image
                src="/logo-RP.png"
                alt=""
                width={800}
                height={192}
                priority
                className="h-24 w-auto max-w-[22rem] shrink-0 object-contain sm:h-28 sm:max-w-[25rem]"
              />
              <span className="min-w-0 text-[10px] font-semibold uppercase leading-snug tracking-wide text-zinc-900 sm:text-xs md:text-sm">
                COMUNIDADE RAFA PELO MUNDO - RELOCATION PORTUGAL
              </span>
            </Link>
            <nav className="shrink-0">
              <Link
                href="/relocation/imoveis"
                className="inline-flex rounded-full bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-105 sm:px-4 sm:text-sm"
              >
                Catálogo de imóveis
              </Link>
            </nav>
          </div>
        </header>
      ) : null}

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        {isDashboard ? (
          <nav className="text-sm">
            <Link
              href={allHousesHref}
              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              Ver todos os imóveis
            </Link>
          </nav>
        ) : null}
        <article className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-xl shadow-zinc-200/50">
          {photos.length > 0 ? (
            <HouseImageCarousel photos={photos} />
          ) : !videoSrc ? (
            <div className="flex min-h-[200px] w-full items-center justify-center bg-zinc-100 text-sm text-zinc-500 aspect-[16/10] sm:aspect-[2/1]">
              Sem fotos nem vídeo
            </div>
          ) : (
            <div className="relative flex min-h-[min(50vh,420px)] w-full items-center justify-center bg-black">
              <video
                src={videoSrc}
                className="max-h-[min(85vh,920px)] w-auto max-w-full object-contain"
                controls
                playsInline
                preload="metadata"
              />
            </div>
          )}

          {photos.length > 0 && videoSrc ? (
            <div className="flex flex-col border-t border-zinc-100 bg-black px-4 py-4 sm:px-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Vídeo</p>
              <div className="flex w-full justify-center">
                <video
                  src={videoSrc}
                  className="max-h-[min(85vh,920px)] w-auto max-w-full rounded-xl object-contain"
                  controls
                  playsInline
                  preload="metadata"
                />
              </div>
            </div>
          ) : null}

          <div className="space-y-6 p-5 sm:p-8">
            <header className="space-y-2 border-b border-zinc-100 pb-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800/90">
                  Relocation · {cityLabel}
                </p>
                <HousePublicationStatusBadge
                  publicationStatus={house.publicationStatus}
                  publishedUntil={house.publishedUntil}
                  displayVariant="public"
                />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{house.title}</h1>
              <p className="text-xs font-medium tabular-nums text-zinc-500">Id: {house.houseId}</p>
              <p className="text-sm text-zinc-600">
                {typoLabel} · {availabilityLabel(house.availableFrom)}
              </p>
              <p className="text-sm text-zinc-600">
                Mobilado: <span className="font-medium text-zinc-800">{house.furnished ? "Sim" : "Não"}</span>
              </p>
            </header>

            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 sm:col-span-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-emerald-900/70">
                  {house.businessType === "SALE" ? "Preço de venda" : "Renda mensal"}
                </dt>
                <dd className="mt-1 text-lg font-semibold text-emerald-950">
                  {formatPriceByBusinessType(house.priceEur, house.businessType)}
                </dd>
              </div>
              {!isSale ? (
                <>
                  <div className="rounded-2xl border border-amber-200/90 bg-amber-50/80 px-4 py-3 sm:col-span-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-amber-900/75">
                      Taxa relocation
                    </dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums text-amber-950">
                      {formatRelocationFeeEur(house.relocationFeeEur)}
                    </dd>
                  </div>
                  <div className="rounded-2xl border border-sky-200/90 bg-sky-50/80 px-4 py-3 sm:col-span-2">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-sky-900/75">
                      Entrada
                    </dt>
                    <dd className="mt-1 text-base font-semibold leading-snug text-sky-950">
                      {entrada}
                    </dd>
                  </div>
                </>
              ) : null}
            </dl>

            <section>
              <h2 className="text-sm font-semibold text-zinc-900">Descrição</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{house.description}</p>
            </section>

            <HouseContactSection
              houseId={house.id}
              numericHouseId={house.houseId}
              partnerId={house.partnerId}
              publicationStatus={house.publicationStatus}
              publishedUntil={house.publishedUntil}
              allowUnpublished={variant === "dashboard"}
            />

            <section className="border-t border-zinc-100 pt-6">
              <h2 className="text-sm font-semibold text-zinc-900">Anunciante</h2>
              <p className="mt-1 text-xs text-zinc-600">
                Este imóvel é anunciado por um parceiro relocation da comunidade.
              </p>
              <Link
                href={partnerPublicPagePath(partner.id, partner.publicSlug)}
                className="mt-4 flex items-center gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4 transition hover:border-amber-200/90 hover:bg-amber-50/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
              >
                {logoSrc ? (
                  <Image
                    src={logoSrc}
                    alt=""
                    width={56}
                    height={56}
                    className="h-14 w-14 shrink-0 rounded-full border border-zinc-200 bg-white object-contain p-1"
                    unoptimized={nextImageUnoptimized(logoSrc)}
                  />
                ) : (
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#d58901] to-[#f0b23a] text-lg font-semibold text-white"
                    aria-hidden
                  >
                    {partner.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-zinc-900">{partner.name}</p>
                  {partnerCategoryName(partner.categorySlug) ? (
                    <p className="mt-0.5 text-xs text-zinc-600">
                      {partnerCategoryName(partner.categorySlug)}
                    </p>
                  ) : null}
                  {partner.shortDescription?.trim() ? (
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                      {partner.shortDescription.trim()}
                    </p>
                  ) : null}
                  <p className="mt-2 text-sm font-medium text-amber-800">
                    Ver página do parceiro →
                  </p>
                </div>
              </Link>
            </section>
          </div>
        </article>
      </main>
    </div>
  );
}
