"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

import { RelocationCityCombobox } from "@/components/relocation/RelocationCityCombobox";
import { RelocationHouseCard } from "@/components/relocation/RelocationHouseCard";
import {
  RELOCATION_BUSINESS_TYPE_LABELS,
  RELOCATION_BUSINESS_TYPE_OPTIONS,
  formatRelocationPriceByBusinessType,
  RELOCATION_TYPOLOGY_LABELS,
  RELOCATION_TYPOLOGY_OPTIONS,
  relocationCityDisplayName,
  type RelocationHouseRow,
} from "@/components/relocation/relocation-house-shared";
import { api } from "@/lib/api";

const RELOCATION_IMOVEIS_PATH = "/relocation/imoveis";
const RELOCATION_HOUSES_WHATSAPP_GROUP_URL =
  "https://chat.whatsapp.com/Kt4ylOIU0qMBbtfHKlyvVt?mode=gi_t";

function formatAvailableDateDdMmYyyy(iso: string): string {
  const raw = String(iso ?? "").trim();
  if (!raw) return "—";
  const day = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const [y, m, dd] = day.split("-").map(Number);
    const d = new Date(y, m - 1, dd);
    if (Number.isNaN(d.getTime())) return "—";
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/** Ex.: `400 € / mês` → `400€ / mês` (estilo lista). */
function compactPriceEurLabel(priceFormatted: string): string {
  return priceFormatted.replace(/\s+€/g, "€");
}

export default function PublicRelocationHousesListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<RelocationHouseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cidade = searchParams.get("cidade")?.trim() ?? "";
  const tipologia = searchParams.get("tipologia")?.trim() ?? "";
  const finalidade = searchParams.get("finalidade")?.trim() ?? "";
  const valorMin = searchParams.get("valorMin")?.trim() ?? "";
  const valorMax = searchParams.get("valorMax")?.trim() ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageSize = 10;

  const setRouteFilters = useCallback(
    (next: {
      cidade?: string;
      tipologia?: string;
      finalidade?: string;
      valorMin?: string;
      valorMax?: string;
      page?: number;
    }) => {
      const q = new URLSearchParams(searchParams.toString());
      const c = next.cidade !== undefined ? next.cidade : cidade;
      const t = next.tipologia !== undefined ? next.tipologia : tipologia;
      const f = next.finalidade !== undefined ? next.finalidade : finalidade;
      const min = next.valorMin !== undefined ? next.valorMin : valorMin;
      const max = next.valorMax !== undefined ? next.valorMax : valorMax;
      const nextPage = next.page !== undefined ? next.page : page;
      // Filtro por parceiro foi removido do público; garantimos que não persista na URL.
      q.delete("parceiro");
      if (c) q.set("cidade", c);
      else q.delete("cidade");
      if (t) q.set("tipologia", t);
      else q.delete("tipologia");
      if (f) q.set("finalidade", f);
      else q.delete("finalidade");
      if (min) q.set("valorMin", min);
      else q.delete("valorMin");
      if (max) q.set("valorMax", max);
      else q.delete("valorMax");
      if (nextPage && nextPage !== 1) q.set("page", String(nextPage));
      else q.delete("page");
      const s = q.toString();
      router.replace(`${RELOCATION_IMOVEIS_PATH}${s ? `?${s}` : ""}`);
    },
    [searchParams, router, cidade, tipologia, finalidade, valorMin, valorMax, page],
  );

  useEffect(() => {
    let cancelled = false;
    const id = window.setTimeout(() => {
      if (cancelled) return;
      setLoading(true);
      setError("");
      void (async () => {
        try {
          const data = await api.marketplace.relocationHouses({
            city: cidade || undefined,
            typology: tipologia || undefined,
            businessType: (finalidade as "RENT" | "SALE") || undefined,
            minPriceEur: valorMin || undefined,
            maxPriceEur: valorMax || undefined,
            page,
            pageSize,
          });
          if (!cancelled) {
            const nextRows = Array.isArray((data as any)?.items)
              ? ((data as any).items as RelocationHouseRow[])
              : // Retrocompatibilidade temporária: caso o backend ainda esteja retornando array direto.
                (Array.isArray(data) ? (data as any as RelocationHouseRow[]) : []);
            setRows(nextRows);
            setTotal(typeof (data as any)?.total === "number" ? (data as any).total : nextRows.length);
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : "Erro ao carregar imóveis.");
            setRows([]);
            setTotal(0);
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [cidade, tipologia, finalidade, valorMin, valorMax, page, pageSize]);

  const filterBar = useMemo(
    () => (
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:gap-4">
        <div className="min-w-0 flex-1">
          <RelocationCityCombobox
            id="filter-cidade"
            label="Cidade"
            value={cidade}
            onChange={(next) => setRouteFilters({ cidade: next, tipologia, finalidade, page: 1 })}
            allowEmpty
            emptyLabel="Todas"
            variant="amber"
          />
        </div>
        <div className="min-w-0 flex-1">
          <label
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500"
            htmlFor="filter-tipologia"
          >
            Tipologia
          </label>
          <select
            id="filter-tipologia"
            value={tipologia}
            onChange={(e) =>
              setRouteFilters({ cidade, tipologia: e.target.value, finalidade, page: 1 })
            }
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">Todas</option>
            {RELOCATION_TYPOLOGY_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {RELOCATION_TYPOLOGY_LABELS[key] ?? key}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-1">
          <label
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500"
            htmlFor="filter-finalidade"
          >
            Finalidade
          </label>
          <select
            id="filter-finalidade"
            value={finalidade}
            onChange={(e) =>
              setRouteFilters({ cidade, tipologia, finalidade: e.target.value, page: 1 })
            }
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">Todas</option>
            {RELOCATION_BUSINESS_TYPE_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {RELOCATION_BUSINESS_TYPE_LABELS[key] ?? key}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-1">
          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Valor (EUR)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              inputMode="numeric"
              type="number"
              min={0}
              step={1}
              value={valorMin}
              onChange={(e) =>
                setRouteFilters({
                  cidade,
                  tipologia,
                  finalidade,
                  valorMin: e.target.value,
                  page: 1,
                })
              }
              placeholder="Mín."
              aria-label="Valor mínimo"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            <input
              inputMode="numeric"
              type="number"
              min={0}
              step={1}
              value={valorMax}
              onChange={(e) =>
                setRouteFilters({
                  cidade,
                  tipologia,
                  finalidade,
                  valorMax: e.target.value,
                  page: 1,
                })
              }
              placeholder="Máx."
              aria-label="Valor máximo"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => router.replace(RELOCATION_IMOVEIS_PATH)}
          className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
        >
          Limpar filtros
        </button>
      </div>
    ),
    [cidade, tipologia, finalidade, valorMin, valorMax, setRouteFilters, router],
  );

  const safeRows = useMemo(
    () => (Array.isArray(rows) ? rows : []),
    [rows],
  );

  const featuredRows = useMemo(() => safeRows.filter((h) => h.featured), [safeRows]);
  const regularRows = useMemo(() => {
    if (featuredRows.length === 0) return safeRows;
    const ids = new Set(featuredRows.map((h) => h.id));
    return safeRows.filter((h) => !ids.has(h.id));
  }, [safeRows, featuredRows]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clampedPage = Math.min(page, totalPages);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">Imóveis Relocation</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Encontre o imóvel perfeito e conte com nosso suporte para fechar o contrato direto com o
          senhorio, sem burocracia.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <Image
                src="/whatsapp.png"
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 object-contain"
              />
              Grupo WhatsApp de imóveis
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              Receba em primeira mão oportunidades de arrendamento e novidades de relocation em
              Portugal.
            </p>
          </div>
          <a
            href={RELOCATION_HOUSES_WHATSAPP_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 sm:w-auto"
          >
            Entrar no grupo
          </a>
        </div>
      </section>

      {filterBar}

      {!loading && safeRows.length > 0 ? (
        <section
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm sm:px-5"
          aria-label="Lista resumida de imóveis"
        >
          <ul className="list-none space-y-2.5 text-sm leading-relaxed text-zinc-800">
            {safeRows.map((h) => {
              const typo = RELOCATION_TYPOLOGY_LABELS[h.typology] ?? h.typology;
              const city = relocationCityDisplayName(h.city);
              const price = compactPriceEurLabel(
                formatRelocationPriceByBusinessType(h.priceEur, h.businessType),
              );
              const when = formatAvailableDateDdMmYyyy(h.availableFrom);
              const line = `${typo} - ${city} - ${price} - ${when}`;
              return (
                <li key={`list-${h.id}`} className="border-b border-zinc-100 pb-2.5 last:border-0 last:pb-0">
                  <Link
                    href={`/dashboard/casas/${encodeURIComponent(h.id)}`}
                    className="block text-zinc-900 transition hover:text-amber-900 hover:underline decoration-amber-600/50 underline-offset-2"
                  >
                    {line}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {!loading && featuredRows.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
              Destaque
            </span>
            <h2 className="text-lg font-semibold text-zinc-900">Imóveis em destaque</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredRows.map((h) => (
              <RelocationHouseCard key={`featured-${h.id}`} house={h} />
            ))}
          </div>
        </section>
      ) : null}

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <p className="text-sm text-zinc-600">A carregar imóveis…</p>
      ) : regularRows.length === 0 ? (
        <p className="text-sm text-zinc-600">
          Nenhum imóvel com estes critérios. Tente alargar os filtros.
        </p>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {regularRows.map((h) => (
              <RelocationHouseCard key={h.id} house={h} />
            ))}
          </div>

          {totalPages > 1 ? (
            <nav
              className="flex flex-wrap items-center justify-center gap-2 pt-2"
              aria-label="Paginação de imóveis"
            >
              <button
                type="button"
                onClick={() => setRouteFilters({ page: Math.max(1, clampedPage - 1) })}
                disabled={clampedPage <= 1}
                className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="px-2 text-sm text-zinc-700">
                Página <strong>{clampedPage}</strong> de <strong>{totalPages}</strong>
              </span>
              <button
                type="button"
                onClick={() => setRouteFilters({ page: Math.min(totalPages, clampedPage + 1) })}
                disabled={clampedPage >= totalPages}
                className="cursor-pointer rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Próxima
              </button>
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}

