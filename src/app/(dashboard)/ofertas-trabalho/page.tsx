"use client";

import { useCallback, useEffect, useState } from "react";

import { JobOfferDetailModal } from "@/components/job-offers/JobOfferDetailModal";
import { JobOffersAdminModal } from "@/components/job-offers/JobOffersAdminModal";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

type OfferRow = Awaited<ReturnType<typeof api.jobOffers.list>>[number];

function formatListDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export default function JobOffersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [rows, setRows] = useState<OfferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailOffer, setDetailOffer] = useState<OfferRow | null>(null);
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.jobOffers.list();
      setRows(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erro ao carregar ofertas de trabalho.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800/90">
            Comunidade Rafa Portugal
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Ofertas de trabalho
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 sm:text-base">
            Oportunidades partilhadas com a comunidade.
          </p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setAdminModalOpen(true)}
            className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 shadow-sm hover:border-amber-300 hover:bg-amber-50"
          >
            <PlusIcon className="h-4 w-4" />
            Adicionar oferta
          </button>
        ) : null}
      </header>

      {loading ? (
        <ul className="space-y-3">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              className="h-20 animate-pulse rounded-xl border border-zinc-200 bg-zinc-100"
            />
          ))}
        </ul>
      ) : error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
          Ainda não há ofertas de trabalho publicadas.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((offer) => (
            <li
              key={offer.id}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm sm:px-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-zinc-500">
                    {formatListDate(offer.publishedAt)}
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-zinc-900 sm:text-lg">
                    {offer.title}
                  </h2>
                  <p className="mt-0.5 text-sm text-zinc-600">{offer.city}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailOffer(offer)}
                  className="shrink-0 rounded-lg bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2 text-sm font-semibold text-white"
                >
                  Saber mais
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <JobOfferDetailModal
        offer={detailOffer}
        onClose={() => setDetailOffer(null)}
      />

      {isAdmin ? (
        <JobOffersAdminModal
          open={adminModalOpen}
          onClose={() => setAdminModalOpen(false)}
          onChanged={() => void load()}
        />
      ) : null}
    </div>
  );
}
