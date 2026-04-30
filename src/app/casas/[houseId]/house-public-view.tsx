import Image from "next/image";
import Link from "next/link";

import type { PublicHousePageData } from "@/lib/house-public-server";
import { formatHouseEntradaWithTotal } from "@/lib/house-entrance";
import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";
import { isOurImageHostname } from "@/lib/site-url";

import { HouseStatusBadge } from "@/components/house/HouseStatusBadge";

import { HouseContactSection } from "./house-contact-section";
import { HousePhotoGallery } from "./house-photo-gallery";

const CITY_LABELS: Record<string, string> = {
  INTERIOR: "Interior",
  LISBOA: "Lisboa",
  PORTO: "Porto",
  BRAGA: "Braga",
  COIMBRA: "Coimbra",
  AVEIRO: "Aveiro",
  FARO: "Faro",
  ALGARVE: "Algarve",
  EVORA: "Évora",
  VISEU: "Viseu",
};

const TYPOLOGY_LABELS: Record<string, string> = {
  T1: "T1",
  T2: "T2",
  T3: "T3",
  T4: "T4",
  T5: "T5",
  QUARTO_AP_COMPARTILHADO: "Quarto em Ap compartilhado",
};

function formatRentPerMonth(priceEur: string): string {
  const t = priceEur
    .trim()
    .replace(/\s*€\s*$/i, "")
    .replace(/\s*\/\s*m[eê]s?\s*$/i, "")
    .trim();
  return `${t} € / mês`;
}

function formatRelocationFeeEur(raw: string): string {
  const t = raw.trim().replace(/\s*€\s*$/i, "").trim();
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
};

export function HousePublicView({ house, apiBaseUrl, variant = "standalone" }: Props) {
  const { partner } = house;
  const cityLabel = CITY_LABELS[house.city] ?? house.city;
  const typoLabel = TYPOLOGY_LABELS[house.typology] ?? house.typology;
  const entrada = formatHouseEntradaWithTotal(
    house.caucoesCount,
    house.rendasEntradaCount,
    house.priceEur,
  );

  const videoSrc = house.videoUrl ? resolveUploadsUrl(house.videoUrl) : null;
  const rawUrls = house.imageUrls ?? [];
  const rawCover =
    house.coverImageUrl && rawUrls.includes(house.coverImageUrl)
      ? house.coverImageUrl
      : rawUrls[0] ?? null;
  const photos = rawUrls.map(resolveUploadsUrl).filter(Boolean);
  const heroImageSrc = rawCover ? resolveUploadsUrl(rawCover) : null;

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
                href="/dashboard/relocation"
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
              href="/dashboard/relocation"
              className="inline-flex font-medium text-amber-800 underline-offset-4 hover:underline"
            >
              ← Catálogo Relocation
            </Link>
          </nav>
        ) : null}
        <article className="overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-xl shadow-zinc-200/50">
          <div
            className={`relative w-full bg-zinc-100 ${
              !heroImageSrc && videoSrc
                ? "flex min-h-[min(50vh,420px)] items-center justify-center bg-black"
                : "aspect-[16/10] sm:aspect-[2/1]"
            }`}
          >
            {!heroImageSrc && videoSrc ? (
              <video
                src={videoSrc}
                className="max-h-[min(85vh,920px)] w-auto max-w-full object-contain"
                controls
                playsInline
                preload="metadata"
              />
            ) : heroImageSrc ? (
              <Image
                src={heroImageSrc}
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
                priority
                unoptimized={nextImageUnoptimized(heroImageSrc)}
              />
            ) : (
              <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-zinc-500">
                Sem fotos nem vídeo
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-3 sm:p-4">
              <HouseStatusBadge status={house.status} variant="overlay" className="lg:text-3xl" />
            </div>
          </div>

          {heroImageSrc && videoSrc ? (
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
                <HouseStatusBadge status={house.status} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{house.title}</h1>
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
                  Renda mensal
                </dt>
                <dd className="mt-1 text-lg font-semibold text-emerald-950">{formatRentPerMonth(house.priceEur)}</dd>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50/90 px-4 py-3 sm:col-span-2">
                <div className="space-y-1.5 text-base text-zinc-900">
                  <p>
                    <span className="font-medium text-zinc-800">Taxa relocation:</span>{" "}
                    {formatRelocationFeeEur(house.relocationFeeEur)}
                  </p>
                  <p>
                    <span className="font-medium text-zinc-800">Entrada:</span> {entrada}
                  </p>
                </div>
              </div>
            </dl>

            {photos.length > 0 ? <HousePhotoGallery photos={photos} /> : null}

            <section>
              <h2 className="text-sm font-semibold text-zinc-900">Descrição</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{house.description}</p>
            </section>

            <HouseContactSection
              houseId={house.id}
              partnerId={house.partnerId}
              title={house.title}
              city={house.city}
              typology={house.typology}
              priceEur={house.priceEur}
              furnished={house.furnished}
              status={house.status}
            />
          </div>
        </article>

        <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
            {logoSrc ? (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-100 bg-zinc-50 p-2 shadow-sm">
                <img src={logoSrc} alt="" className="max-h-full max-w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 text-xs text-zinc-400">
                Logo
              </div>
            )}
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
                {partner.category?.name ?? "Parceiro"}
              </p>
              <h2 className="mt-1 text-xl font-semibold text-zinc-900">{partner.name}</h2>
              <Link
                href={isDashboard ? `/dashboard/partner/${partner.id}` : `/partner/${partner.id}`}
                className="mt-3 inline-flex text-sm font-medium text-amber-800 underline-offset-4 hover:underline"
              >
                Ver perfil completo do parceiro
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
