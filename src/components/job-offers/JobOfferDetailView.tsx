"use client";

import Image from "next/image";
import Link from "next/link";

import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";

export type JobOfferContact = {
  type: "email" | "phone" | "url";
  value: string;
};

export type JobOfferDetailData = {
  id: string;
  title: string;
  jobFunction: string;
  city: string;
  company: string;
  summary: string;
  description: string;
  sourceMessage: string;
  advertiserContacts: JobOfferContact[];
  publishedAt: string;
  imageUrl?: string | null;
};

function formatPublishedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatContactLabel(c: JobOfferContact): string {
  if (c.type === "email") return `📧 ${c.value}`;
  if (c.type === "phone") return `📲 ${c.value}`;
  return `🔗 ${c.value}`;
}

type Props = {
  offer: JobOfferDetailData;
  backHref?: string;
  backLabel?: string;
};

export function JobOfferDetailView({
  offer,
  backHref = "/ofertas-trabalho",
  backLabel = "Voltar às ofertas",
}: Props) {
  const imageSrc = resolveUploadsUrl(offer.imageUrl);
  const summaryTrim = offer.summary.trim();
  const showSummary =
    summaryTrim.length > 0 &&
    summaryTrim !== offer.sourceMessage.trim() &&
    summaryTrim !== offer.description.trim();

  return (
    <article className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:max-w-3xl sm:px-6 sm:py-8">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:text-brand-primary"
        >
          <span aria-hidden>←</span>
          {backLabel}
        </Link>
      </div>

      {imageSrc ? (
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-border/90 bg-primary-1 shadow-sm sm:aspect-[16/10]">
          <Image
            src={imageSrc}
            alt={`Anúncio: ${offer.jobFunction}`}
            fill
            className="object-contain object-top"
            sizes="(max-width: 768px) 100vw, 672px"
            priority
            unoptimized
          />
        </div>
      ) : null}

      <header className="rounded-2xl border border-border/90 bg-card p-5 shadow-sm sm:p-6">
        <span className="inline-flex items-center rounded-lg bg-primary-1 px-2.5 py-1 text-xs font-medium text-foreground/90">
          {offer.city}
        </span>
        <h1 className="mt-3 text-2xl font-bold leading-snug text-foreground sm:text-3xl">
          {offer.jobFunction}
        </h1>
        {offer.company.trim() ? (
          <p className="mt-2 text-sm font-semibold text-foreground sm:text-base">
            🏢 {offer.company}
          </p>
        ) : null}
        {offer.title.trim() ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {offer.title}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-muted">
          Publicado em {formatPublishedAt(offer.publishedAt)}
        </p>
      </header>

      {offer.advertiserContacts.length > 0 ? (
        <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 px-4 py-4 sm:px-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
            Candidaturas
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm text-foreground">
            {offer.advertiserContacts.map((c, i) => (
              <li key={`${c.type}-${c.value}-${i}`}>{formatContactLabel(c)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {showSummary ? (
        <section className="rounded-2xl border border-border bg-card px-4 py-4 sm:px-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
            Resumo
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {summaryTrim}
          </p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-border bg-card px-4 py-4 sm:px-5">
        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {offer.sourceMessage.trim() || offer.description.trim() || "—"}
        </div>
      </section>
    </article>
  );
}
