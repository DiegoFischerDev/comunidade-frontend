"use client";

import Image from "next/image";
import Link from "next/link";

import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";

export type RecommendedServiceCardData = {
  id: string;
  title: string;
  cardImageUrl: string | null;
  redirectPath: string;
};

function cardImageUnoptimized(src: string): boolean {
  if (!src.startsWith("http")) return false;
  try {
    const h = new URL(src).hostname;
    return !h.includes("localhost") && !h.includes("127.0.0.1");
  } catch {
    return true;
  }
}

export function RecommendedServiceCard({ service }: { service: RecommendedServiceCardData }) {
  const imageSrc = service.cardImageUrl
    ? resolveUploadsUrl(service.cardImageUrl)
    : null;

  return (
    <li>
      <Link
        href={service.redirectPath}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/90 bg-card shadow-sm transition duration-200 hover:shadow-md hover:border-brand-accent/40 hover:shadow-lg hover:shadow-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/25 focus-visible:ring-offset-2"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-brand-primary/90 via-brand-primary-light to-brand-accent/80">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt=""
              fill
              className="object-cover transition duration-300 group-hover:scale-[1.03]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              unoptimized={cardImageUnoptimized(imageSrc)}
            />
          ) : (
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 80%, rgba(255,255,255,0.35) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.2) 0%, transparent 45%)",
              }}
              aria-hidden
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <p className="text-lg font-bold leading-snug text-white drop-shadow-sm sm:text-xl">
              {service.title}
            </p>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-between gap-3 px-4 py-4">
          <p className="text-xs leading-snug text-muted">
            Parceiro de confiança da comunidade
          </p>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full brand-cta-primary px-4 py-2 text-xs font-semibold uppercase tracking-wide shadow-sm transition group-hover:brightness-105">
            Contactar
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden
            >
              <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </Link>
    </li>
  );
}
