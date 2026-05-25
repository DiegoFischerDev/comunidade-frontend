"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { RelocationCityCombobox } from "@/components/relocation/RelocationCityCombobox";
import { RelocationHouseCard } from "@/components/relocation/RelocationHouseCard";
import {
  RELOCATION_BUSINESS_TYPE_OPTIONS,
  RELOCATION_TYPOLOGY_LABELS,
  RELOCATION_TYPOLOGY_OPTIONS,
  relocationCityDisplayName,
  type RelocationHouseRow,
} from "@/components/relocation/relocation-house-shared";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { RELOCATION_HOUSES_WHATSAPP_GROUP_URL } from "@/lib/community-whatsapp-groups";

/** Ícone WhatsApp oficial (mesmo SVG do menu do dashboard). */
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

const RELOCATION_IMOVEIS_PATH = "/relocation/imoveis";
const LIST_SECTION_TITLE = "Imóveis disponíveis";

type BusinessTypeTab = (typeof RELOCATION_BUSINESS_TYPE_OPTIONS)[number];

const BUSINESS_TYPE_TAB_CLASS: Record<BusinessTypeTab, string> = {
  RENT: "Arrendamento",
  SALE: "Venda",
};

const TYPOLOGY_SORT_INDEX = new Map<string, number>(
  RELOCATION_TYPOLOGY_OPTIONS.map((k, i) => [k, i]),
);

/** Valor só com montante + € (sem «/ mês»). */
function listLinePriceEur(priceEur: string): string {
  const t = priceEur
    .trim()
    .replace(/\s*€\s*$/i, "")
    .replace(/\s*\/\s*m[eê]s?\s*$/i, "")
    .trim();
  return `${t.replace(/\s+/g, " ")}€`;
}

/** Mês por extenso em português (ex.: «junho», «novembro») a partir de `availableFrom`. */
function availableFromMonthNamePt(iso: string): string {
  const raw = String(iso ?? "").trim();
  if (!raw) return "—";
  const day = raw.slice(0, 10);
  let d: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    const [y, m, dd] = day.split("-").map(Number);
    d = new Date(y, m - 1, dd);
  } else {
    d = new Date(raw);
  }
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT", { month: "long" }).toLowerCase();
}

function formatRelocationAvailableListLine(h: RelocationHouseRow): string {
  const typo = RELOCATION_TYPOLOGY_LABELS[h.typology] ?? h.typology;
  const city = relocationCityDisplayName(h.city);
  const price = listLinePriceEur(h.priceEur);
  const monthPt = availableFromMonthNamePt(h.availableFrom);
  return `${typo} - ${city} - ${price} - ${monthPt}`;
}

/** Host + path + query, sem `https://` (para partilhar no clipboard). */
function relocationImoveisClipboardUrlNoProtocol(): string {
  if (typeof window !== "undefined") {
    return `${window.location.host}${window.location.pathname}${window.location.search}`;
  }
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "")
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
  return `${base || "comunidade.rafaportugal.com"}${RELOCATION_IMOVEIS_PATH}`;
}

export default function PublicRelocationHousesListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [rows, setRows] = useState<RelocationHouseRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listCopyDone, setListCopyDone] = useState(false);

  const cidade = searchParams.get("cidade")?.trim() ?? "";
  const tipologia = searchParams.get("tipologia")?.trim() ?? "";
  const finalidadeRaw = searchParams.get("finalidade")?.trim() ?? "";
  const finalidade: BusinessTypeTab =
    finalidadeRaw === "SALE" ? "SALE" : "RENT";
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
    const f = searchParams.get("finalidade")?.trim();
    if (f === "RENT" || f === "SALE") return;
    const q = new URLSearchParams(searchParams.toString());
    q.set("finalidade", "RENT");
    router.replace(`${RELOCATION_IMOVEIS_PATH}${q.toString() ? `?${q}` : ""}`);
  }, [searchParams, router]);

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
            businessType: finalidade,
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
      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div
          role="tablist"
          aria-label="Finalidade do imóvel"
          className="flex w-full max-w-md rounded-xl border border-zinc-200 bg-zinc-100 p-1"
        >
          {RELOCATION_BUSINESS_TYPE_OPTIONS.map((key) => {
            const selected = finalidade === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() =>
                  setRouteFilters({
                    cidade,
                    tipologia,
                    finalidade: key,
                    valorMin,
                    valorMax,
                    page: 1,
                  })
                }
                className={
                  selected
                    ? "flex-1 rounded-lg bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition"
                    : "flex-1 rounded-lg px-4 py-2.5 text-sm font-medium text-zinc-600 transition hover:bg-white/80 hover:text-zinc-900"
                }
              >
                {BUSINESS_TYPE_TAB_CLASS[key]}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
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
            onClick={() =>
              setRouteFilters({
                cidade: "",
                tipologia: "",
                valorMin: "",
                valorMax: "",
                finalidade,
                page: 1,
              })
            }
            className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
          >
            Limpar filtros
          </button>
        </div>
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

  const availableListRowsSorted = useMemo(() => {
    return safeRows
      .sort((a, b) => {
        const ia = TYPOLOGY_SORT_INDEX.get(a.typology) ?? 999;
        const ib = TYPOLOGY_SORT_INDEX.get(b.typology) ?? 999;
        if (ia !== ib) return ia - ib;
        return relocationCityDisplayName(a.city).localeCompare(
          relocationCityDisplayName(b.city),
          "pt",
        );
      });
  }, [safeRows]);

  const handleCopyAvailableList = useCallback(async () => {
    const lines = availableListRowsSorted.map(
      (h) => `🏠 ${formatRelocationAvailableListLine(h)}`,
    );
    const url = relocationImoveisClipboardUrlNoProtocol();
    const text =
      lines.length > 0
        ? `${LIST_SECTION_TITLE}\n\n${lines.join("\n")}\n\n${url}`
        : `${LIST_SECTION_TITLE}\n\n${url}`;
    try {
      await navigator.clipboard.writeText(text);
      setListCopyDone(true);
      window.setTimeout(() => setListCopyDone(false), 2000);
    } catch {
      setListCopyDone(false);
    }
  }, [availableListRowsSorted]);

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

      <section
        className="relative overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-white via-emerald-50/50 to-amber-50/40 shadow-md ring-1 ring-emerald-100/70"
        aria-labelledby="relocation-grupao-heading"
      >
        <div
          className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#25D366]/10 blur-3xl"
          aria-hidden
        />
        <div className="pointer-events-none absolute -bottom-16 -left-12 h-40 w-40 rounded-full bg-[#d58901]/10 blur-2xl" aria-hidden />
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
                id="relocation-grupao-heading"
                className="mt-1 text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl"
              >
                Grupão de relocation
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-600 sm:text-[0.9375rem]">
                Junta-te ao grupo para receber oportunidades de arrendamento em tempo real.
              </p>
            </div>
          </div>
          <a
            href={RELOCATION_HOUSES_WHATSAPP_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full shrink-0 items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#20bd5a] hover:shadow active:scale-[0.99] sm:w-auto sm:self-center sm:px-6"
          >
            <WhatsappBrandIcon className="h-5 w-5 shrink-0 text-white" />
            Entrar no Grupão
          </a>
        </div>
      </section>

      {filterBar}

      {!loading ? (
        <section
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm sm:px-5"
          aria-label="Lista resumida de imóveis disponíveis"
        >
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-zinc-900">
              {LIST_SECTION_TITLE}
              <span className="ml-2 text-sm font-medium text-zinc-500">
                · {BUSINESS_TYPE_TAB_CLASS[finalidade]}
              </span>
            </h2>
            {isAdmin ? (
              <button
                type="button"
                onClick={() => void handleCopyAvailableList()}
                className="inline-flex w-full shrink-0 items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-50 sm:w-auto"
              >
                {listCopyDone ? "Copiado!" : "Copiar"}
              </button>
            ) : null}
          </div>
          {availableListRowsSorted.length === 0 ? (
            <p className="text-sm text-zinc-600">
              Nenhum imóvel para {BUSINESS_TYPE_TAB_CLASS[finalidade].toLowerCase()} com estes
              filtros nesta página.
            </p>
          ) : (
            <ul className="list-none space-y-2.5 text-sm leading-relaxed text-zinc-800">
              {availableListRowsSorted.map((h) => {
                const line = formatRelocationAvailableListLine(h);
                return (
                  <li
                    key={`list-${h.id}`}
                    className="border-b border-zinc-100 pb-2.5 last:border-0 last:pb-0"
                  >
                    <Link
                      href={`/dashboard/casas/${encodeURIComponent(h.id)}`}
                      className="block cursor-pointer select-text text-zinc-900 transition hover:text-amber-900 hover:underline decoration-amber-600/50 underline-offset-2"
                    >
                      🏠 {line}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
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
          Nenhum imóvel para {BUSINESS_TYPE_TAB_CLASS[finalidade].toLowerCase()} com estes
          critérios. Tente alargar os filtros.
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

