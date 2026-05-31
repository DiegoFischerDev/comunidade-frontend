"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  JobOfferCard,
  JobOfferCardSkeleton,
} from "@/components/job-offers/JobOfferCard";
import { JobOfferDetailModal } from "@/components/job-offers/JobOfferDetailModal";
import { JobOfferWhatsappConfigPanel } from "@/components/job-offers/JobOfferWhatsappConfigPanel";
import { JobOffersAdminModal } from "@/components/job-offers/JobOffersAdminModal";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

type OfferRow = Awaited<ReturnType<typeof api.jobOffers.list>>[number];

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

function WarningIcon({ className }: { className?: string }) {
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
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
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
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((offer) => {
      const haystack = [
        offer.jobFunction,
        offer.title,
        offer.city,
        offer.description,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [rows, searchQuery]);

  const offerCountLabel = useMemo(() => {
    const n = filteredRows.length;
    const total = rows.length;
    const base = n === 1 ? "1 vaga" : `${n} vagas`;
    if (searchQuery.trim() && total !== n) {
      return `${base} de ${total}`;
    }
    return base;
  }, [filteredRows.length, rows.length, searchQuery]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:max-w-3xl sm:space-y-8 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800/90">
            Comunidade Rafa Portugal
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Ofertas de trabalho da semana
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 sm:text-base">
            Oportunidades partilhadas com a comunidade — republicadas a partir do
            nosso WhatsApp.
          </p>
          {!loading && !error && rows.length > 0 ? (
            <p className="mt-3 inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              {offerCountLabel} ativas
            </p>
          ) : null}
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setAdminModalOpen(true)}
            className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-amber-300 hover:bg-amber-50"
          >
            <PlusIcon className="h-4 w-4" />
            Adicionar oferta
          </button>
        ) : null}
      </header>

      {isAdmin ? <JobOfferWhatsappConfigPanel /> : null}

      <div
        role="note"
        className="flex gap-3 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 to-amber-50/40 px-4 py-4 text-sm leading-relaxed text-amber-950 shadow-sm sm:px-5"
      >
        <WarningIcon className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="font-semibold text-amber-900">Aviso importante</p>
          <p className="mt-1.5 text-amber-950/90">
            Cuidado para não cair em burlas! Nós não nos responsabilizamos por
            entrevistas, propostas ou processos de recrutamento. Todas as
            informações são da entidade empregadora. Apenas republicamos neste
            canal mensagens de ofertas recebidas pelo WhatsApp. As empresas que
            postam vagas aqui{" "}
            <strong className="font-semibold text-amber-950">
              não são parceiras oficiais verificadas
            </strong>.
          </p>
        </div>
      </div>

      {!loading && !error && rows.length > 0 ? (
        <div>
          <label
            htmlFor="job-offers-search"
            className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-600"
          >
            <svg
              className="h-3.5 w-3.5 text-amber-700/90"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z" />
            </svg>
            Filtrar ofertas
          </label>
          <div className="relative">
            <input
              id="job-offers-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Função, cidade, título…"
              className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-9 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/25"
            />
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z" />
            </svg>
            {searchQuery.trim() ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                aria-label="Limpar filtro"
              >
                ✕
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {loading ? (
        <ul className="space-y-2.5" aria-busy="true" aria-label="A carregar ofertas">
          {[0, 1, 2].map((i) => (
            <li key={i}>
              <JobOfferCardSkeleton />
            </li>
          ))}
        </ul>
      ) : error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-800">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-zinc-400 shadow-sm ring-1 ring-zinc-200">
            <svg
              className="h-7 w-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <rect x="3" y="7" width="18" height="13" rx="2" />
            </svg>
          </div>
          <p className="mt-4 text-base font-medium text-zinc-800">
            Ainda não há ofertas publicadas
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            Volta em breve — novas vagas aparecem aqui quando as recebemos.
          </p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
          <p className="font-medium text-zinc-800">Nenhuma oferta encontrada</p>
          <p className="mt-1">
            Tenta outras palavras (função, cidade ou empresa).
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="mt-3 text-sm font-medium text-amber-800 underline hover:text-amber-900"
          >
            Limpar filtro
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {filteredRows.map((offer) => (
            <li key={offer.id}>
              <JobOfferCard
                offer={offer}
                onOpenDetail={() => setDetailOffer(offer)}
              />
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
