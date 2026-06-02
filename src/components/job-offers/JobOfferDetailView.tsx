"use client";

import Link from "next/link";

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
          className="inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900"
        >
          <span aria-hidden>←</span>
          {backLabel}
        </Link>
      </div>

      <header className="rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-sm ring-1 ring-zinc-900/5 sm:p-6">
        <span className="inline-flex items-center rounded-lg bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700">
          {offer.city}
        </span>
        <h1 className="mt-3 text-2xl font-bold leading-snug text-zinc-900 sm:text-3xl">
          {offer.jobFunction}
        </h1>
        {offer.company.trim() ? (
          <p className="mt-2 text-sm font-semibold text-zinc-800 sm:text-base">
            🏢 {offer.company}
          </p>
        ) : null}
        {offer.title.trim() ? (
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            {offer.title}
          </p>
        ) : null}
        <p className="mt-3 text-xs text-zinc-500">
          Publicado em {formatPublishedAt(offer.publishedAt)}
        </p>
      </header>

      {offer.advertiserContacts.length > 0 ? (
        <section className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 px-4 py-4 sm:px-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
            Candidaturas
          </h2>
          <ul className="mt-2 space-y-1.5 text-sm text-zinc-800">
            {offer.advertiserContacts.map((c, i) => (
              <li key={`${c.type}-${c.value}-${i}`}>{formatContactLabel(c)}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {showSummary ? (
        <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 sm:px-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
            Resumo
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
            {summaryTrim}
          </p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 sm:px-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
          Mensagem original
        </h2>
        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
          {offer.sourceMessage.trim() || offer.description.trim() || "—"}
        </div>
      </section>
    </article>
  );
}
