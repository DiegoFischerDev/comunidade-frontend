"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { HouseStatusBadge } from "@/components/house/HouseStatusBadge";
import { api } from "@/lib/api";
import { formatHouseEntradaShort, orderHouseImagesWithCoverFirst } from "@/lib/house-entrance";
import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";
import { isOurImageHostname } from "@/lib/site-url";

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

/**
 * URL para fundo da categoria — alinhado a `resolveUploadsUrl` e ao card em `/dashboard/services`.
 */
function categoryBackgroundImageUrl(stored: string | null | undefined): string | null {
  const raw = stored?.trim();
  if (!raw) return null;
  const u = resolveUploadsUrl(raw);
  return u || null;
}

/** Domínios fora de `remotePatterns` (ex. R2): usar next/image sem otimização. */
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

/**
 * Abre o WhatsApp no mesmo tique do clique. Não pode haver `await` antes de
 * `window.open` — no mobile o popup fica fora do “user gesture” e o Safari bloqueia.
 * O registo de lead corre em segundo plano.
 */
function openRelocationPartnerWhatsApp(h: HouseRow): void {
  const digits = (h.partner.whatsapp ?? "").replace(/\D/g, "");
  if (!digits) {
    window.alert("Não foi possível obter o WhatsApp deste parceiro.");
    return;
  }
  void api.marketplace.registerLead(h.partnerId).catch(() => {
    /* não bloqueia o contacto */
  });
  const text = buildRelocationWhatsAppText(h);
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  const opened = window.open(url, "_blank", "noopener,noreferrer");
  if (opened == null) {
    window.location.assign(url);
  }
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
  const [heroCoverUrl, setHeroCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [cat, categories] = await Promise.all([
          api.marketplace.relocationCategory().catch(() => null),
          api.marketplace.categoriesWithPartners().catch(() => []),
        ]);
        let url = categoryBackgroundImageUrl(cat?.backgroundImageUrl);
        if (!url) {
          const fromList = categories.find((c) => c.slug === "relocation");
          url = categoryBackgroundImageUrl(fromList?.backgroundImageUrl);
        }
        setHeroCoverUrl(url);
      } catch {
        setHeroCoverUrl(null);
      }
    })();
  }, []);

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

  return (
    <div className="space-y-8">
      <section className="relative isolate min-h-[11rem] overflow-hidden rounded-2xl text-white sm:min-h-[13rem]">
        {heroCoverUrl ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center bg-zinc-200"
              style={{ backgroundImage: `url(${JSON.stringify(heroCoverUrl)})` }}
              aria-hidden
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-[#1a0505]/92 via-[#5f0001]/78 to-[#3d0001]/65"
              aria-hidden
            />
          </>
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#910001] to-[#5f0001]"
            aria-hidden
          />
        )}
        <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-xs uppercase tracking-wide text-amber-100/90">Serviços</p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
            Relocation — Aluguel de imóveis em Portugal
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-amber-50/90 sm:text-base">
            Chegue a Portugal com tudo pronto: casa garantida, chave na mão e serviços essenciais como água, luz e
            internet já instalados. Cuidamos de todo o processo para que você comece sua nova vida com tranquilidade,
            segurança e zero complicação.
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
            const orderedUrls = orderHouseImagesWithCoverFirst(h.imageUrls ?? [], h.coverImageUrl);
            const primaryImageSrc = orderedUrls[0] ? resolveMediaUrl(orderedUrls[0]) : null;
            const cityLabel = CITY_LABELS[h.city] ?? h.city;
            const typoLabel = TYPOLOGY_LABELS[h.typology] ?? h.typology;
            const isListedButNotForContact = h.status !== "AVAILABLE";
            return (
              <article
                key={h.id}
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
                      unoptimized={nextImageUnoptimized(primaryImageSrc)}
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
                    <div className="flex h-full min-h-[8rem] items-center justify-center text-sm text-zinc-400">
                      Sem média
                    </div>
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
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-400">
                      Renda mensal
                    </p>
                    <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-zinc-900">
                      {formatRentPerMonth(h.priceEur)}
                    </p>
                  </div>

                  <p className="text-xs text-zinc-500">{availabilityLabel(h.availableFrom)}</p>

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
                        className="inline-flex flex-1 min-w-[8rem] justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 sm:flex-initial"
                      >
                        Ver imóvel
                      </Link>
                      <button
                        type="button"
                        onClick={() => openRelocationPartnerWhatsApp(h)}
                        className="inline-flex cursor-pointer flex-1 min-w-[8rem] justify-center rounded-lg bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 sm:flex-initial"
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
          })}
        </div>
      )}
    </div>
  );
}
