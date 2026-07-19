"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  visitorCountryDisplayName,
  countryCodeToFlagEmoji,
} from "@/lib/visitor-country-display";
import { HorizontalBarChart } from "@/components/admin/HorizontalBarChart";
import { VerticalBarChart } from "@/components/admin/VerticalBarChart";

type Stats = Awaited<ReturnType<typeof api.admin.shareLinks.clickStats>>;

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
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filterOpts = useCallback(() => {
    const dates = periodDateOpts(periodFrom, periodTo);
    if (!dates.ok) return null;
    return {
      ...(kind ? { kind } : {}),
      ...(dates.from && dates.to ? { from: dates.from, to: dates.to } : {}),
    };
  }, [kind, periodFrom, periodTo]);

  useEffect(() => {
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    const opts = filterOpts();
    if (!opts) {
      setStats(null);
      setError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setError("");
      setLoading(true);
      try {
        const nextStats = await api.admin.shareLinks.clickStats(opts);
        if (!cancelled) setStats(nextStats);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao carregar.");
          setStats(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, filterOpts]);

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Métricas</h1>
        <p className="mt-2 text-muted">Acesso restrito a administradores.</p>
      </div>
    );
  }

  const dates = periodDateOpts(periodFrom, periodTo);
  const periodInvalid = !dates.ok;
  const total = stats?.total ?? 0;

  const countryBars = (stats?.byCountry ?? []).map((c) => {
    const name = visitorCountryDisplayName(c.countryCode);
    return {
      key: c.countryCode ?? "unknown",
      label: name ?? "País desconhecido",
      sublabel: c.countryCode ? c.countryCode : null,
      count: c.count,
      leadingEmoji: countryCodeToFlagEmoji(c.countryCode),
    };
  });

  const customLinkBars = (stats?.byCustomLink ?? []).map((d) => ({
    key: d.id,
    label: d.label,
    sublabel: d.sublabel,
    count: d.count,
    leadingImageUrl: d.imageUrl,
  }));

  const houseBars = (stats?.byHouse ?? []).map((d) => ({
    key: d.id,
    label: d.label.length > 18 ? `${d.label.slice(0, 16)}…` : d.label,
    sublabel: d.sublabel,
    count: d.count,
    leadingImageUrl: d.imageUrl,
    barClassName: "bg-sky-700",
  }));

  const monthBars = (stats?.byMonth ?? []).map((m) => ({
    key: m.month,
    label: m.label,
    count: m.count,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Métricas</h1>
          <p className="mt-1 text-sm text-muted">
            Resumo em gráficos. Intervalo de datas opcional (UTC, inclusive) para país,
            links e imóveis; o gráfico mensal usa sempre os últimos 12 meses.
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
            {total === 0
              ? "Nenhum evento no filtro"
              : `${total} evento${total === 1 ? "" : "s"} no filtro`}
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

      {!periodInvalid ? (
        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted">A carregar gráficos…</p>
          ) : (
            <>
              <VerticalBarChart
                title="Cliques por mês"
                description="Últimos 12 meses (UTC). Respeita o filtro de tipo; ignora o intervalo de datas da página."
                items={monthBars}
                emptyMessage="Sem cliques nos últimos 12 meses."
              />
              <VerticalBarChart
                title="Cliques por imóvel"
                description="Imóveis com mais cliques no período e filtro actuais."
                items={houseBars}
                withLeading
                emptyMessage="Sem imóveis neste filtro."
              />
              <div className="grid gap-4 lg:grid-cols-2">
                <HorizontalBarChart
                  title="Cliques por país"
                  description="Países com mais cliques no período e filtro actuais. Percentagem sobre o total filtrado."
                  items={countryBars}
                  totalForPercent={stats?.total}
                  withLeading
                  emptyMessage="Sem cliques com país conhecido neste filtro."
                />
                <HorizontalBarChart
                  title="Cliques por link personalizado"
                  description="Links personalizados com mais cliques."
                  items={customLinkBars}
                  totalForPercent={stats?.total}
                  withLeading
                  emptyMessage="Sem links personalizados neste filtro."
                />
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
