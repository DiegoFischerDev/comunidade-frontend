"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";

type PartnerItem = { id: string; name: string; logoUrl: string | null };

function shouldUnoptimizedLogo(src: string) {
  return (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.includes("/uploads/")
  );
}

function nameInitial(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  return t.charAt(0).toUpperCase();
}

/** 3 colunas (mobile) / 5 colunas (md+), com gap-3 entre itens. */
const ITEM_WIDTH =
  "w-[calc((100cqw-1.5rem)/3)] md:w-[calc((100cqw-3rem)/5)] min-w-0";

export function PartnerLogosMarquee() {
  const [partners, setPartners] = useState<PartnerItem[]>([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    (async () => {
      try {
        const data = await api.marketplace.categoriesWithPartners();
        if (cancelled) return;
        const map = new Map<string, PartnerItem>();
        for (const c of data) {
          for (const p of c.partners) {
            const resolved =
              p.logoUrl?.trim() ? resolveUploadsUrl(p.logoUrl) || null : null;
            const next: PartnerItem = {
              id: p.id,
              name: p.name,
              logoUrl: resolved,
            };
            const prev = map.get(p.id);
            if (!prev) {
              map.set(p.id, next);
            } else if (!prev.logoUrl && resolved) {
              map.set(p.id, { ...prev, logoUrl: resolved });
            }
          }
        }
        setPartners([...map.values()].sort((a, b) => a.name.localeCompare(b.name, "pt")));
      } catch (err) {
        console.error("[PartnerLogosMarquee] categoriesWithPartners failed", err);
        if (!cancelled) {
          setPartners([]);
          setLoadError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <section className="w-full border-t border-zinc-200/80 py-4" aria-live="polite">
        <p className="text-center text-xs text-zinc-600">
          Não foi possível carregar a lista de parceiros. Verifica a ligação ou configura a API
          (NEXT_PUBLIC_API_URL).
        </p>
      </section>
    );
  }

  if (partners.length === 0) {
    return null;
  }

  const loopItems = [...partners, ...partners];

  return (
    <section
      className="w-full border-t border-zinc-200/80 py-5"
      aria-labelledby="dashboard-partner-logos-heading"
    >
      <div className="mx-auto mb-3 max-w-7xl px-3 sm:px-4">
        <h2
          id="dashboard-partner-logos-heading"
          className="text-center text-xs font-semibold uppercase tracking-wider text-zinc-500"
        >
          Nosso time de confiança
        </h2>
      </div>
      <div
        className="partner-logos-wrap @container/partners relative mx-auto w-full max-w-7xl overflow-hidden px-2 sm:px-4 [container-type:inline-size]"
      >
        <div
          className="partner-logos-track flex w-max items-stretch gap-3"
          style={{ willChange: "transform" }}
        >
          {loopItems.map((p, i) => (
            <Link
              key={`${p.id}-${i}`}
              href={`/dashboard/partner/${p.id}`}
              className={`${ITEM_WIDTH} group flex shrink-0 flex-col items-center gap-1.5 py-0.5 opacity-90 transition hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2`}
              aria-label={`Ver parceiro ${p.name}`}
            >
              <div className="flex h-12 w-full items-center justify-center sm:h-14">
                {p.logoUrl ? (
                  <Image
                    src={p.logoUrl}
                    alt=""
                    width={180}
                    height={72}
                    className="h-9 w-full max-h-full object-contain object-center grayscale transition-[filter,opacity] duration-300 ease-out group-hover:grayscale-0 sm:h-12"
                    unoptimized={shouldUnoptimizedLogo(p.logoUrl)}
                  />
                ) : (
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-sm font-semibold text-zinc-600 sm:h-12 sm:w-12 sm:text-base"
                    aria-hidden
                  >
                    {nameInitial(p.name)}
                  </span>
                )}
              </div>
              <span
                className="line-clamp-2 w-full text-center text-[10px] font-medium leading-tight text-zinc-600 sm:text-xs"
                title={p.name}
              >
                {p.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
