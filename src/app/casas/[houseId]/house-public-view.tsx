import Image from "next/image";
import Link from "next/link";

import { CatalogCarousel } from "@/components/CatalogCarousel";
import type { PublicHousePageData } from "@/lib/house-public-server";
import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";

import { HouseContactSection } from "./house-contact-section";

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
    return !(h.endsWith("rafaapelomundo.com") || h === "localhost");
  } catch {
    return true;
  }
}

type Props = {
  house: PublicHousePageData;
  apiBaseUrl: string;
};

export function HousePublicView({ house, apiBaseUrl }: Props) {
  const { partner } = house;
  const cityLabel = CITY_LABELS[house.city] ?? house.city;
  const typoLabel = TYPOLOGY_LABELS[house.typology] ?? house.typology;

  const videoSrc = house.videoUrl ? resolveUploadsUrl(house.videoUrl) : null;
  const photos = (house.imageUrls ?? []).map(resolveUploadsUrl).filter(Boolean);

  const heroBgImage =
    partner.backgroundImageUrl &&
    (partner.backgroundImageUrl.startsWith("/uploads/")
      ? `${apiBaseUrl}${partner.backgroundImageUrl}`
      : partner.backgroundImageUrl);

  const logoSrc =
    partner.logoUrl && partner.logoUrl.startsWith("/uploads/")
      ? `${apiBaseUrl}${partner.logoUrl}`
      : partner.logoUrl;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="text-sm font-semibold text-zinc-900">
            Comunidade RPM
          </Link>
          <Link
            href="/dashboard/relocation"
            className="text-sm font-medium text-amber-800 hover:underline"
          >
            Imóveis relocation
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="relative aspect-[16/10] w-full bg-zinc-100 sm:aspect-[21/9]">
            {videoSrc ? (
              <video
                src={videoSrc}
                className="h-full w-full object-cover"
                controls
                playsInline
                preload="metadata"
              />
            ) : photos[0] ? (
              <Image
                src={photos[0]}
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
                priority
                unoptimized={nextImageUnoptimized(photos[0])}
              />
            ) : (
              <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-zinc-500">
                Sem fotos nem vídeo
              </div>
            )}
            {house.status === "UNAVAILABLE" ? (
              <span className="absolute left-3 top-3 rounded bg-zinc-900/85 px-2.5 py-1 text-xs font-medium text-white">
                Indisponível
              </span>
            ) : null}
          </div>

          <div className="space-y-4 p-5 sm:p-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-amber-800">Relocation</p>
              <h1 className="mt-1 text-2xl font-semibold text-zinc-900 sm:text-3xl">{house.title}</h1>
              <p className="mt-2 text-sm text-zinc-600">
                {typoLabel} · {cityLabel}
              </p>
              <p className="mt-2 text-sm text-zinc-700">{availabilityLabel(house.availableFrom)}</p>
              <p className="mt-3 text-xl font-semibold text-[#086601]">{formatRentPerMonth(house.priceEur)}</p>
            </div>

            {!videoSrc && photos.length > 1 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.slice(1).map((src, i) => (
                  <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-zinc-100">
                    <Image
                      src={src}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 200px"
                      unoptimized={nextImageUnoptimized(src)}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            <div className="rounded-xl bg-zinc-50 px-4 py-3 text-sm text-zinc-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Rendas e cauções para entrada
              </p>
              <p className="mt-1">{house.requirements}</p>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-zinc-900">Descrição</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">{house.description}</p>
            </div>

            <HouseContactSection
              houseId={house.id}
              partnerId={house.partnerId}
              title={house.title}
              city={house.city}
              typology={house.typology}
              priceEur={house.priceEur}
              status={house.status}
            />
          </div>
        </section>

        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          {heroBgImage && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40"
              style={{ backgroundImage: `url(${heroBgImage})` }}
            />
          )}
          <div className="relative z-10 flex flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:px-10 sm:py-12">
            {logoSrc ? (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/90 p-2 shadow-md sm:h-24 sm:w-24">
                <img src={logoSrc} alt={partner.name} className="max-h-full max-w-full object-contain" />
              </div>
            ) : null}
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-100">
                {partner.category?.name ?? "Parceiro relocation"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{partner.name}</h2>
              {partner.shortDescription ? (
                <p className="mt-3 max-w-2xl text-sm text-emerald-50 sm:text-base">{partner.shortDescription}</p>
              ) : null}
              <div className="mt-4">
                <Link
                  href={`/partner/${partner.id}`}
                  className="inline-flex rounded-full border border-white/40 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20"
                >
                  Ver página do parceiro
                </Link>
              </div>
            </div>
          </div>
        </section>

        {partner.fullDescription ? (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">Sobre {partner.name}</h2>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
              <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">{partner.fullDescription}</p>
            </div>
          </section>
        ) : null}

        {partner.catalogImageUrls && partner.catalogImageUrls.length > 0 ? (
          <section>
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">Galeria do parceiro</h2>
            <CatalogCarousel images={partner.catalogImageUrls} apiBaseUrl={apiBaseUrl} />
          </section>
        ) : null}

        <section>
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">Serviços do parceiro</h2>
          {partner.services.length === 0 ? (
            <p className="text-sm text-zinc-500">Este parceiro ainda não cadastrou serviços.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {partner.services.map((service) => (
                <article
                  key={service.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <h3 className="text-sm font-semibold text-zinc-900">{service.title}</h3>
                  {service.description ? (
                    <p className="mt-2 text-sm text-zinc-700">{service.description}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-zinc-600">
                    {service.priceOnRequest
                      ? "Valor sob consulta"
                      : service.price
                        ? `${service.price} €`
                        : "—"}
                  </p>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
