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
import { WHATSAPP_GROUP_OFERTAS_TRABALHO_URL } from "@/lib/community-whatsapp-groups";

function WhatsappBrandIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
      />
    </svg>
  );
}

type OfferRow = Awaited<ReturnType<typeof api.jobOffers.list>>[number];

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
  const [adminModalEditOffer, setAdminModalEditOffer] =
    useState<OfferRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDeleteOffer = useCallback(
    async (offer: OfferRow) => {
      const label = offer.jobFunction.trim() || offer.title.trim() || "esta oferta";
      if (
        !window.confirm(
          `Excluir a oferta «${label}»? Esta ação não pode ser desfeita.`,
        )
      ) {
        return;
      }
      setDeletingId(offer.id);
      setError("");
      try {
        await api.admin.jobOffers.delete(offer.id);
        setRows((prev) => prev.filter((r) => r.id !== offer.id));
        setDetailOffer((current) =>
          current?.id === offer.id ? null : current,
        );
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Não foi possível excluir a oferta.",
        );
      } finally {
        setDeletingId(null);
      }
    },
    [],
  );

  const openCreateOfferModal = useCallback(() => {
    setAdminModalEditOffer(null);
    setAdminModalOpen(true);
  }, []);

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
      <header>
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
      </header>

      <section
        className="relative overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-white via-emerald-50/50 to-amber-50/40 shadow-md ring-1 ring-emerald-100/70"
        aria-labelledby="job-offers-grupao-heading"
      >
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#25D366]/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-[#d58901]/10 blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-6">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-md ring-2 ring-[#25D366]/30">
              <WhatsappBrandIcon className="h-9 w-9 text-[#25D366]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800/85">
                WhatsApp · comunidade
              </p>
              <h2
                id="job-offers-grupao-heading"
                className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl"
              >
                Grupão de ofertas de emprego
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem]">
                Junta-te ao grupo para receber vagas em tempo real e partilhar
                oportunidades com a comunidade Rafa Portugal.
              </p>
            </div>
          </div>
          <a
            href={WHATSAPP_GROUP_OFERTAS_TRABALHO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full shrink-0 items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#20bd5a] hover:shadow active:scale-[0.99] sm:w-auto sm:self-center sm:px-6"
          >
            <WhatsappBrandIcon className="h-5 w-5 shrink-0 text-white" />
            Entrar no Grupão
          </a>
        </div>
      </section>

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

      {isAdmin ? (
        <button
          type="button"
          onClick={openCreateOfferModal}
          className="w-full cursor-pointer rounded-xl bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 sm:w-auto"
        >
          Adicionar oferta de trabalho
        </button>
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
                isAdmin={isAdmin}
                onEdit={
                  isAdmin
                    ? () => {
                        setAdminModalEditOffer(offer);
                        setAdminModalOpen(true);
                      }
                    : undefined
                }
                onDelete={
                  isAdmin
                    ? () => void handleDeleteOffer(offer)
                    : undefined
                }
                deleting={deletingId === offer.id}
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
          onClose={() => {
            setAdminModalOpen(false);
            setAdminModalEditOffer(null);
          }}
          onChanged={() => void load()}
          offerToEdit={adminModalEditOffer}
        />
      ) : null}
    </div>
  );
}
