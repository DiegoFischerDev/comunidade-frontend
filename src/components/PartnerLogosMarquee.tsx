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
      <section
        className="w-full border-t border-zinc-200/80 bg-amber-50/50 py-4"
        aria-live="polite"
      >
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
      className="w-full border-t border-zinc-200/80 bg-white/60 py-5"
      aria-labelledby="dashboard-partner-logos-heading"
    >
      <div className="mx-auto mb-3 max-w-7xl px-3 sm:px-4">
        <h2
          id="dashboard-partner-logos-heading"
          className="text-center text-xs font-semibold uppercase tracking-wider text-zinc-500"
        >
          Parceiros
        </h2>
      </div>
      <div className="partner-logos-wrap relative overflow-hidden">
        <div
          className="partner-logos-track flex w-max items-center gap-8 sm:gap-12 md:gap-16"
          style={{ willChange: "transform" }}
        >
          {loopItems.map((p, i) => (
            <Link
              key={`${p.id}-${i}`}
              href={`/dashboard/partner/${p.id}`}
              className="group flex h-12 max-w-[min(12rem,40vw)] shrink-0 items-center justify-center opacity-90 transition hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2 sm:h-14"
              title={p.name}
              aria-label={`Ver parceiro ${p.name}`}
            >
              {p.logoUrl ? (
                <Image
                  src={p.logoUrl}
                  alt=""
                  width={180}
                  height={72}
                  className="h-10 w-auto max-w-full object-contain sm:h-12"
                  unoptimized={shouldUnoptimizedLogo(p.logoUrl)}
                />
              ) : (
                <span
                  className="line-clamp-2 min-h-10 w-full max-w-[12rem] rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-center text-xs font-medium leading-tight text-zinc-800 sm:min-h-12 sm:max-w-[14rem] sm:text-sm"
                >
                  {p.name}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
