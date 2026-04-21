"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function resolveMediaUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/uploads/")) return `${API_URL}${url}`;
  return url;
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

function formatDatePt(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-PT");
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
    ? modalHouse.imageUrls.map(resolveMediaUrl)
    : [];

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#910001] to-[#5f0001] text-white">
        <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-xs uppercase tracking-wide text-amber-100/90">Serviços</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Relocation — imóveis</h1>
          <p className="mt-3 max-w-2xl text-sm text-amber-50/90 sm:text-base">
            Anúncios de parceiros da categoria Relocation. Abre o cartão para ver fotos, vídeo e detalhes.
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
            const thumb = h.imageUrls[0] ? resolveMediaUrl(h.imageUrls[0]) : null;
            const cityLabel = CITY_LABELS[h.city] ?? h.city;
            const typoLabel = TYPOLOGY_LABELS[h.typology] ?? h.typology;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => setModalHouse(h)}
                className="group flex w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-md"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100">
                  {videoSrc ? (
                    <video
                      src={videoSrc}
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : thumb ? (
                    <Image
                      src={thumb}
                      alt=""
                      fill
                      className="object-cover transition group-hover:scale-[1.02]"
                      sizes="(max-width: 640px) 100vw, 33vw"
                      unoptimized={nextImageUnoptimized(thumb)}
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
                </div>
                <div className="flex flex-1 flex-col gap-2 px-4 py-3">
                  <h2 className="line-clamp-2 text-base font-semibold text-zinc-900">{h.title}</h2>
                  <p className="text-xs text-zinc-500">
                    {typoLabel} · {cityLabel}
                  </p>
                  <p className="text-sm font-semibold text-[#086601]">{h.priceEur} €</p>
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
            className="flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[90vh] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/3] w-full shrink-0 bg-zinc-100">
              {modalVideoSrc ? (
                <video
                  src={modalVideoSrc}
                  className="h-full w-full object-contain"
                  controls
                  playsInline
                  preload="metadata"
                />
              ) : photos.length > 0 ? (
                <>
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
                              i === photoIndex ? "bg-white" : "bg-white/50"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  ) : null}
                </>
              ) : (
                <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-zinc-400">
                  Sem fotos nem vídeo
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-3">
              <h2 id="relocation-modal-title" className="text-lg font-semibold text-zinc-900">
                {modalHouse.title}
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                {TYPOLOGY_LABELS[modalHouse.typology] ?? modalHouse.typology} ·{" "}
                {CITY_LABELS[modalHouse.city] ?? modalHouse.city} · Disponível{" "}
                {formatDatePt(modalHouse.availableFrom)}
              </p>
              <p className="mt-2 text-lg font-semibold text-[#086601]">{modalHouse.priceEur} €</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
                {modalHouse.description}
              </p>
              <p className="mt-3 text-sm text-zinc-700">
                <span className="font-medium">Requisitos: </span>
                {modalHouse.requirements}
              </p>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                <Link
                  href={`/dashboard/partner/${modalHouse.partner.id}`}
                  className="inline-flex rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  Ver parceiro
                </Link>
                <Link
                  href={`/casas/interesse?houseId=${encodeURIComponent(modalHouse.id)}&partnerId=${encodeURIComponent(modalHouse.partnerId)}&title=${encodeURIComponent(modalHouse.title)}&city=${encodeURIComponent(modalHouse.city)}&typology=${encodeURIComponent(modalHouse.typology)}&price=${encodeURIComponent(modalHouse.priceEur)}`}
                  className="inline-flex rounded-full bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2 text-sm font-semibold text-white"
                >
                  Tenho interesse
                </Link>
              </div>
            </div>

            <button
              type="button"
              className="border-t border-zinc-100 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              onClick={closeModal}
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
