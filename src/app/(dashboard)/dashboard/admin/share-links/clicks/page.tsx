"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { visitorCountryDisplayName } from "@/lib/visitor-country-display";
import { HorizontalBarChart } from "@/components/admin/HorizontalBarChart";

type Row = Awaited<
  ReturnType<typeof api.admin.shareLinks.clickHistory>
>["items"][number];

type Stats = Awaited<ReturnType<typeof api.admin.shareLinks.clickStats>>;

const PAGE_SIZE = 50;

function periodDateOpts(
  periodFrom: string,
  periodTo: string,
):
  | { ok: false; reason: "partial" }
  | { ok: true; from?: string; to?: string } {
  const pf = periodFrom.trim();
  const pt = periodTo.trim();
  if ((pf && !pt) || (!pf && pt)) return { ok: false, reason: "partial" };
  if (!pf && !pt) return { ok: true };
  return { ok: true, from: pf, to: pt };
}

export default function AdminShareLinkClicksPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [kind, setKind] = useState<"" | "CUSTOM_LINK" | "HOUSE">("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");

  const filterOpts = useCallback(() => {
    const dates = periodDateOpts(periodFrom, periodTo);
    if (!dates.ok) return null;
    return {
      ...(kind ? { kind } : {}),
      ...(dates.from && dates.to ? { from: dates.from, to: dates.to } : {}),
    };
  }, [kind, periodFrom, periodTo]);

  const fetchPage = useCallback(
    async (nextOffset: number, append: boolean) => {
      const opts = filterOpts();
      if (!opts) return;
      const data = await api.admin.shareLinks.clickHistory({
        ...opts,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      setTotal(data.total);
      setHasMore(data.hasMore);
      if (append) {
        setItems((prev) => [...prev, ...data.items]);
      } else {
        setItems(data.items);
      }
      setOffset(nextOffset);
    },
    [filterOpts],
  );

  useEffect(() => {
    if (!user || !isAdmin) {
      setLoading(false);
      setStatsLoading(false);
      return;
    }
    const opts = filterOpts();
    if (!opts) {
      setItems([]);
      setTotal(0);
      setHasMore(false);
      setOffset(0);
      setStats(null);
      setError("");
      setLoading(false);
      setStatsLoading(false);
      return;
    }

    setOffset(0);
    let cancelled = false;
    (async () => {
      setError("");
      setLoading(true);
      setStatsLoading(true);
      try {
        const [_, nextStats] = await Promise.all([
          fetchPage(0, false),
          api.admin.shareLinks.clickStats(opts),
        ]);
        if (!cancelled) setStats(nextStats);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao carregar.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setStatsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, filterOpts, fetchPage]);

  async function loadMore() {
    if (!filterOpts()) return;
    setError("");
    try {
      await fetchPage(offset + PAGE_SIZE, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar.");
    }
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Histórico de cliques</h1>
        <p className="mt-2 text-muted">Acesso restrito a administradores.</p>
      </div>
    );
  }

  const dates = periodDateOpts(periodFrom, periodTo);
  const periodInvalid = !dates.ok;

  function labelRow(row: Row): string {
    if (row.kind === "CUSTOM_LINK" && row.customLink) {
      return row.customLink.title;
    }
    if (row.kind === "HOUSE" && row.house) {
      return `${row.house.title} (#${row.house.houseId})`;
    }
    return "—";
  }

  function sublabelRow(row: Row): string {
    if (row.kind === "CUSTOM_LINK" && row.customLink) {
      return `slug: ${row.customLink.slug}`;
    }
    if (row.kind === "HOUSE" && row.house) {
      return row.house.partnerName;
    }
    return "";
  }

  const countryBars =
    stats?.byCountry.map((c) => {
      const name = visitorCountryDisplayName(c.countryCode);
      return {
        key: c.countryCode ?? "unknown",
        label: name ?? "País desconhecido",
        sublabel: c.countryCode ? c.countryCode : null,
        count: c.count,
      };
    }) ?? [];

  const destinationBars =
    stats?.byDestination.map((d) => ({
      key: `${d.kind}:${d.id}`,
      label: d.label,
      sublabel: d.sublabel,
      count: d.count,
      barClassName:
        d.kind === "HOUSE" ? "bg-sky-700" : "bg-brand-primary",
    })) ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Histórico de cliques</h1>
          <p className="mt-1 text-sm text-muted">
            Ordenado do mais recente para o mais antigo. Intervalo de datas opcional (UTC,
            inclusive — mesmo critério da página de links).
          </p>
        </div>
        <Link
          href="/dashboard/admin/share-links"
          className="text-sm font-medium text-brand-primary hover:underline"
        >
          ← Voltar a Links rastreados
        </Link>
      </div>

      <section>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            <span className="block text-xs font-medium text-muted">De</span>
            <input
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="mt-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="block text-sm">
            <span className="block text-xs font-medium text-muted">Até</span>
            <input
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              className="mt-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setPeriodFrom("");
              setPeriodTo("");
            }}
            className="cursor-pointer rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-page"
          >
            Limpar período
          </button>
        </div>
        {periodInvalid ? (
          <p className="mt-2 text-xs text-brand-primary">
            Preenche data inicial e final, ou limpa ambas para ver todo o histórico.
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-foreground/90">
          <span>Filtrar:</span>
          <select
            className="rounded-md border border-border bg-card px-3 py-2 text-sm"
            value={kind}
            onChange={(e) =>
              setKind(e.target.value as "" | "CUSTOM_LINK" | "HOUSE")
            }
          >
            <option value="">Todos</option>
            <option value="CUSTOM_LINK">Link personalizado</option>
            <option value="HOUSE">Imóvel</option>
          </select>
        </label>
        {!loading && !periodInvalid ? (
          <span className="text-sm text-muted">
            {total === 0 ? "Nenhum evento" : `${total} evento${total === 1 ? "" : "s"}`}
            {dates.from && dates.to ? (
              <span className="ml-1 text-muted/80">
                ({dates.from} — {dates.to})
              </span>
            ) : null}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {!periodInvalid && (statsLoading || (stats && stats.total > 0)) ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {statsLoading ? (
            <>
              <p className="text-sm text-muted lg:col-span-2">A carregar gráficos…</p>
            </>
          ) : (
            <>
              <HorizontalBarChart
                title="Cliques por país"
                description="Top países no período e filtro actuais. Percentagem sobre o total filtrado."
                items={countryBars}
                totalForPercent={stats?.total}
                emptyMessage="Sem cliques com país conhecido neste filtro."
              />
              <HorizontalBarChart
                title="Cliques por destino"
                description="Top links personalizados e imóveis. Verde = personalizado; azul = imóvel."
                items={destinationBars}
                totalForPercent={stats?.total}
                emptyMessage="Sem destinos neste filtro."
              />
            </>
          )}
        </div>
      ) : null}

      {loading && !periodInvalid ? (
        <p className="text-sm text-muted">A carregar…</p>
      ) : !periodInvalid ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-page text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Data / hora</th>
                  <th className="px-4 py-3">Identificador (legado)</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Destino</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-muted">
                      Sem cliques registados (com os filtros actuais).
                    </td>
                  </tr>
                ) : (
                  items.map((row) => {
                    const countryName = visitorCountryDisplayName(row.visitorCountryCode);
                    return (
                    <tr key={row.id} className="border-b border-border/60 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-foreground tabular-nums">
                        {new Date(row.clickedAt).toLocaleString("pt-PT", {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })}
                      </td>
                      <td className="max-w-[min(280px,40vw)] px-4 py-3">
                        <div className="text-xs text-muted">
                          País:{" "}
                          {countryName ? (
                            <>
                              <span className="font-medium text-foreground">{countryName}</span>
                              <span className="text-muted">
                                {" "}
                                ({row.visitorCountryCode})
                              </span>
                            </>
                          ) : (
                            <span className="text-muted/80">—</span>
                          )}
                        </div>
                        <code
                          className="mt-1 block break-all text-xs text-foreground/90"
                          title={row.visitorKey ?? undefined}
                        >
                          {row.visitorKey && row.visitorKey.length > 0
                            ? row.visitorKey
                            : "—"}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            row.kind === "HOUSE"
                              ? "bg-sky-100 text-sky-900"
                              : "bg-violet-100 text-violet-900"
                          }`}
                        >
                          {row.kind === "HOUSE" ? "Imóvel" : "Personalizado"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{labelRow(row)}</div>
                        {sublabelRow(row) ? (
                          <div className="mt-0.5 text-xs text-muted">{sublabelRow(row)}</div>
                        ) : null}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {hasMore ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-page"
              >
                Carregar mais
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
