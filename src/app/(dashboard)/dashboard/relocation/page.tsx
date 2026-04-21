"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import { formatHouseEntradaShort, orderHouseImagesWithCoverFirst } from "@/lib/house-entrance";
import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";

type HouseRow = Awaited<ReturnType<typeof api.marketplace.relocationHouses>>[number];

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

function resolveMediaUrl(url: string) {
  return resolveUploadsUrl(url);
}

/** Domínios fora de `remotePatterns` (ex. R2): usar next/image sem otimização. */
function nextImageUnoptimized(resolvedUrl: string) {
  if (!resolvedUrl.startsWith("http")) return false;
  try {
    const h = new URL(resolvedUrl).hostname;
    return !(h.endsWith("rafaapelomundo.com") || h === "localhost");
  } catch {
    return true;
  }
}

/** Renda: mostrar valor + "€ / mês" (evita duplicar € se já vier no texto). */
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

/** Mensagem alinhada à página pública do imóvel / contacto WhatsApp. */
function buildRelocationWhatsAppText(h: HouseRow): string {
  const cityLabel = CITY_LABELS[h.city] ?? h.city;
  const typologyLabel = TYPOLOGY_LABELS[h.typology] ?? h.typology;
  const mobilado = h.furnished ? "mobilado" : "não mobilado";
  return `Olá, gostaria de mais informações sobre o imóvel ${typologyLabel} (${mobilado}) por ${h.priceEur} em ${cityLabel} com título ${h.title}.`;
}

async function openRelocationPartnerWhatsApp(h: HouseRow): Promise<void> {
  const digits = (h.partner.whatsapp ?? "").replace(/\D/g, "");
  if (!digits) {
    window.alert("Não foi possível obter o WhatsApp deste parceiro.");
    return;
  }
  try {
    await api.marketplace.registerLead(h.partnerId);
  } catch {
    /* não bloqueia o contacto */
  }
  const text = buildRelocationWhatsAppText(h);
  window.open(
    `https://wa.me/${digits}?text=${encodeURIComponent(text)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

/**
 * Compara só a data (YYYY-MM-DD do ISO) para evitar desvios de timezone.
 * Se a data de disponibilidade é hoje ou passada → "Atualmente disponível".
 */
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

export default function RelocationHousesPage() {
  const [rows, setRows] = useState<HouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalHouse, setModalHouse] = useState<HouseRow | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.marketplace.relocationHouses();
        setRows(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar imóveis.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    setPhotoIndex(0);
  }, [modalHouse?.id]);

  const closeModal = useCallback(() => setModalHouse(null), []);

  const modalVideoSrc = modalHouse?.videoUrl
    ? resolveMediaUrl(modalHouse.videoUrl)
    : null;
  const photos = modalHouse?.imageUrls?.length
    ? orderHouseImagesWithCoverFirst(modalHouse.imageUrls, modalHouse.coverImageUrl).map(resolveMediaUrl)
    : [];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#910001] to-[#5f0001] text-white">
        <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-xs uppercase tracking-wide text-amber-100/90">Serviços</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Relocation — imóveis</h1>
          <p className="mt-3 max-w-2xl text-sm text-amber-50/90 sm:text-base">
            Anúncios de parceiros da categoria Relocation. Os disponíveis aparecem primeiro; dentro desse grupo,
            ordenamos por data de disponibilidade mais futura. Os indisponíveis ficam no fim da lista.
          </p>
        </div>
      </section>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-600">Carregando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-600">Ainda não há imóveis disponíveis nesta listagem.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((h) => {
            const videoSrc = h.videoUrl ? resolveMediaUrl(h.videoUrl) : null;
            const cardImages = orderHouseImagesWithCoverFirst(h.imageUrls ?? [], h.coverImageUrl)
              .slice(0, 4)
              .map((u) => resolveMediaUrl(u));
            const cityLabel = CITY_LABELS[h.city] ?? h.city;
            const typoLabel = TYPOLOGY_LABELS[h.typology] ?? h.typology;
            const isUnavailable = h.status === "UNAVAILABLE";
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => setModalHouse(h)}
                className={`group flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  isUnavailable
                    ? "border-zinc-200 bg-zinc-50 opacity-90 hover:border-zinc-300"
                    : "border-zinc-200 bg-white hover:border-amber-200"
                }`}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100">
                  {cardImages.length > 0 ? (
                    cardImages.length === 1 ? (
                      <Image
                        src={cardImages[0]}
                        alt=""
                        fill
                        className="object-cover transition group-hover:scale-[1.02]"
                        sizes="(max-width: 640px) 100vw, 33vw"
                        unoptimized={nextImageUnoptimized(cardImages[0])}
                      />
                    ) : (
                      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-px bg-zinc-300 p-px">
                        {[0, 1, 2, 3].map((i) => {
                          const src = cardImages[i];
                          return (
                            <div key={i} className="relative min-h-0 bg-zinc-100">
                              {src ? (
                                <Image
                                  src={src}
                                  alt=""
                                  fill
                                  className="object-cover transition group-hover:scale-[1.02]"
                                  sizes="(max-width: 640px) 50vw, 17vw"
                                  unoptimized={nextImageUnoptimized(src)}
                                />
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : videoSrc ? (
                    <video
                      src={videoSrc}
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                      Sem média
                    </div>
                  )}
                  {videoSrc ? (
                    <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                      Vídeo
                    </span>
                  ) : null}
                  {isUnavailable ? (
                    <span className="pointer-events-none absolute left-2 top-2 rounded bg-zinc-800/85 px-2 py-0.5 text-[10px] font-medium text-white">
                      Indisponível
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-2 px-4 py-3">
                  <h2 className="line-clamp-2 text-base font-semibold text-zinc-900">{h.title}</h2>
                  <p className="text-xs text-zinc-500">
                    {typoLabel} · {cityLabel}
                  </p>
                  <p className="text-sm font-semibold text-[#086601]">{formatRentPerMonth(h.priceEur)}</p>
                  <p className="text-xs text-zinc-600">{availabilityLabel(h.availableFrom)}</p>
                  <p className="line-clamp-3 text-xs leading-snug text-zinc-600">
                    <span className="font-medium text-zinc-700">Taxa relocation:</span>{" "}
                    {formatRelocationFeeEur(h.relocationFeeEur)}
                    <br />
                    <span className="font-medium text-zinc-700">Entrada:</span>{" "}
                    {formatHouseEntradaShort(h.caucoesCount, h.rendasEntradaCount)}
                  </p>
                  <p className="text-xs text-zinc-500">{h.partner.name}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {modalHouse ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal
          aria-labelledby="relocation-modal-title"
          onClick={closeModal}
        >
          <div
            className="relative flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[90vh] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-lg leading-none text-zinc-700 shadow-md ring-1 ring-black/5 hover:bg-white"
              onClick={closeModal}
              aria-label="Fechar"
            >
              <span aria-hidden>×</span>
            </button>
            <div className="w-full shrink-0 bg-zinc-100">
              {photos.length > 0 ? (
                <div className="relative mx-auto h-[min(36vh,260px)] w-full overflow-hidden sm:h-[min(40vh,300px)]">
                  <Image
                    src={photos[photoIndex]!}
                    alt=""
                    fill
                    className="object-contain"
                    sizes="100vw"
                    unoptimized={nextImageUnoptimized(photos[photoIndex]!)}
                  />
                  {photos.length > 1 ? (
                    <>
                      <button
                        type="button"
                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-2 py-1 text-sm shadow"
                        onClick={() =>
                          setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)
                        }
                        aria-label="Foto anterior"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-2 py-1 text-sm shadow"
                        onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                        aria-label="Foto seguinte"
                      >
                        ›
                      </button>
                      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                        {photos.map((_, i) => (
                          <span
                            key={i}
                            className={`h-1.5 w-1.5 rounded-full ${
                              i === photoIndex ? "bg-zinc-800" : "bg-zinc-800/35"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
              {modalVideoSrc ? (
                <div
                  className={`relative w-full overflow-hidden bg-black ${
                    photos.length ? "border-t border-zinc-200" : ""
                  }`}
                >
                  <video
                    src={modalVideoSrc}
                    className="mx-auto max-h-[min(36vh,260px)] w-full object-contain sm:max-h-[min(40vh,300px)]"
                    controls
                    playsInline
                    preload="metadata"
                  />
                </div>
              ) : null}
              {!photos.length && !modalVideoSrc ? (
                <div className="flex h-[min(28vh,200px)] min-h-[140px] items-center justify-center text-sm text-zinc-400">
                  Sem fotos nem vídeo
                </div>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
              <h2 id="relocation-modal-title" className="text-lg font-semibold text-zinc-900">
                {modalHouse.title}
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                {TYPOLOGY_LABELS[modalHouse.typology] ?? modalHouse.typology} ·{" "}
                {CITY_LABELS[modalHouse.city] ?? modalHouse.city}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Mobilado: {modalHouse.furnished ? "sim" : "não"}
              </p>
              <p className="mt-2 text-sm text-zinc-700">{availabilityLabel(modalHouse.availableFrom)}</p>
              <p className="mt-2 text-lg font-semibold text-[#086601]">
                {formatRentPerMonth(modalHouse.priceEur)}
              </p>
              <div className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
                <p>
                  <span className="font-medium text-zinc-800">Taxa relocation:</span>{" "}
                  {formatRelocationFeeEur(modalHouse.relocationFeeEur)}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-zinc-800">Entrada:</span>{" "}
                  {formatHouseEntradaShort(modalHouse.caucoesCount, modalHouse.rendasEntradaCount)}
                </p>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                {modalHouse.description}
              </p>
            </div>

            <div className="shrink-0 border-t border-zinc-100 bg-white">
              <div className="flex flex-wrap justify-end gap-2 px-4 py-3">
                {modalHouse.status === "AVAILABLE" ? (
                  <>
                    <Link
                      href={`/casas/${encodeURIComponent(modalHouse.id)}`}
                      className="inline-flex rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:bg-zinc-50"
                    >
                      Ver anúncio
                    </Link>
                    <button
                      type="button"
                      onClick={() => void openRelocationPartnerWhatsApp(modalHouse)}
                      className="inline-flex rounded-full bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-105"
                    >
                      Contactar relocation
                    </button>
                  </>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-600">
                    Anúncio indisponível — contacto não disponível
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
