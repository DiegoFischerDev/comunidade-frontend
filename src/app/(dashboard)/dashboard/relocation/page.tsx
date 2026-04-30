"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { PartnerEngagementBar } from "@/components/PartnerEngagementBar";
import { RelocationHouseCard } from "@/components/relocation/RelocationHouseCard";
import { type RelocationHouseRow } from "@/components/relocation/relocation-house-shared";
import { CardLinkButton } from "@/components/ui/CardButton";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";
import { getPublicSiteUrl, isOurImageHostname } from "@/lib/site-url";

type RelocationPartner = {
  id: string;
  name: string;
  logoUrl: string | null;
  backgroundImageUrl: string | null;
  shortDescription: string | null;
  engagement: {
    likeCount: number;
    dislikeCount: number;
    commentCount: number;
    shareCount: number;
  };
};

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

const PREVIEW_HOUSES = 3;

export default function RelocationHousesPage() {
  const { user } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const siteBase = getPublicSiteUrl();
  const [rows, setRows] = useState<RelocationHouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [heroCoverUrl, setHeroCoverUrl] = useState<string | null>(null);
  const [relocationPartners, setRelocationPartners] = useState<RelocationPartner[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [cat, categories] = await Promise.all([
          api.marketplace.relocationCategory().catch(() => null),
          api.marketplace.categoriesWithPartners().catch(() => []),
        ]);
        const rel = categories.find((c) => c.slug === "relocation");
        setRelocationPartners(rel?.partners ?? []);
        let url = categoryBackgroundImageUrl(cat?.backgroundImageUrl);
        if (!url) {
          url = categoryBackgroundImageUrl(rel?.backgroundImageUrl);
        }
        setHeroCoverUrl(url);
      } catch {
        setHeroCoverUrl(null);
        setRelocationPartners([]);
      } finally {
        setPartnersLoading(false);
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

  const previewRows = rows.slice(0, PREVIEW_HOUSES);
  const hasFullListingLink = rows.length > 0;
  const isMember = user?.tier === "MEMBER";

  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <CardLinkButton
          href="/dashboard/services"
          variant="primary"
          className="shadow-sm"
        >
          <span className="opacity-90" aria-hidden>
            ←
          </span>
          Outros serviços
        </CardLinkButton>
      </div>

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

      {isMember ? (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">Relocations indicados por Rafa</h2>
          {partnersLoading ? (
            <p className="text-sm text-zinc-600">A carregar…</p>
          ) : relocationPartners.length === 0 ? (
            <p className="text-sm text-zinc-600">Ainda não há indicações nesta secção.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {relocationPartners.map((partner) => {
                const partnerBg =
                  partner.backgroundImageUrl &&
                  (partner.backgroundImageUrl.startsWith("/uploads/")
                    ? `${API_URL}${partner.backgroundImageUrl}`
                    : partner.backgroundImageUrl);
                const partnerLogo =
                  partner.logoUrl &&
                  (partner.logoUrl.startsWith("/uploads/")
                    ? `${API_URL}${partner.logoUrl}`
                    : partner.logoUrl);
                return (
                  <div
                    key={partner.id}
                    className="group flex w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
                  >
                    <Link href={`/dashboard/partner/${partner.id}`} className="block">
                      <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-r from-zinc-100 to-zinc-200">
                        {partnerBg ? (
                          <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${partnerBg})` }}
                          />
                        ) : null}
                        <div className="relative z-10 flex h-full flex-col justify-end gap-2 bg-gradient-to-t from-black/50 via-black/10 to-transparent px-4 pb-3">
                          {partnerLogo ? (
                            <div className="relative h-20 w-20 shrink-0">
                              <Image
                                src={partnerLogo}
                                alt=""
                                fill
                                className="object-contain drop-shadow-lg"
                                sizes="80px"
                                unoptimized={nextImageUnoptimized(partnerLogo)}
                              />
                            </div>
                          ) : null}
                          <h3 className="text-sm font-semibold text-white drop-shadow">{partner.name}</h3>
                        </div>
                      </div>
                    </Link>
                    <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                      <Link
                        href={`/dashboard/partner/${partner.id}`}
                        className="block min-h-0 flex-1"
                      >
                        {partner.shortDescription ? (
                          <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600">
                            {partner.shortDescription}
                          </p>
                        ) : null}
                      </Link>
                      <PartnerEngagementBar
                        partnerId={partner.id}
                        sharePageUrl={`${siteBase}/partner/${partner.id}`}
                        variant="card"
                        initial={partner.engagement}
                        partnerName={partner.name}
                        partnerLogoUrl={typeof partnerLogo === "string" ? partnerLogo : null}
                        className="mt-3 border-t border-zinc-100 pt-3"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-900 sm:text-xl">Imóveis disponíveis</h2>
        {loading ? (
          <p className="text-sm text-zinc-600">A carregar imóveis…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-zinc-600">Ainda não há imóveis disponíveis nesta listagem.</p>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {previewRows.map((h) => (
                <RelocationHouseCard key={h.id} house={h} />
              ))}
            </div>
            {hasFullListingLink ? (
              <div className="flex justify-center pt-1">
                <CardLinkButton
                  href="/relocation/imoveis"
                  variant="primary"
                  className="min-w-[14rem] shadow-sm"
                >
                  Ver todos os imóveis
                </CardLinkButton>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
