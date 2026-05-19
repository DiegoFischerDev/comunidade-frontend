"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { visitorCountryDisplayName } from "@/lib/visitor-country-display";

type Row = Awaited<
  ReturnType<typeof api.admin.shareLinks.clickHistory>
>["items"][number];

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
  const [error, setError] = useState("");

  const fetchPage = useCallback(
    async (nextOffset: number, append: boolean) => {
      const dates = periodDateOpts(periodFrom, periodTo);
      if (!dates.ok) return;
      const data = await api.admin.shareLinks.clickHistory({
        ...(kind ? { kind } : {}),
        ...(dates.from && dates.to ? { from: dates.from, to: dates.to } : {}),
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
    [kind, periodFrom, periodTo],
  );

  useEffect(() => {
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    const dates = periodDateOpts(periodFrom, periodTo);
    if (!dates.ok) {
      setItems([]);
      setTotal(0);
      setHasMore(false);
      setOffset(0);
      setError("");
      setLoading(false);
      return;
    }

    setOffset(0);
    let cancelled = false;
    (async () => {
      setError("");
      setLoading(true);
      try {
        await fetchPage(0, false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao carregar.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, kind, periodFrom, periodTo, fetchPage]);

  async function loadMore() {
    const dates = periodDateOpts(periodFrom, periodTo);
    if (!dates.ok) return;
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
        <h1 className="text-2xl font-semibold text-zinc-900">Histórico de cliques</h1>
        <p className="mt-2 text-zinc-600">Acesso restrito a administradores.</p>
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

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Histórico de cliques</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Ordenado do mais recente para o mais antigo. Intervalo de datas opcional (UTC,
            inclusive — mesmo critério da página de links).
          </p>
        </div>
        <Link
          href="/dashboard/admin/share-links"
          className="text-sm font-medium text-amber-700 hover:underline"
        >
          ← Voltar a Links rastreados
        </Link>
      </div>

      <section>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            <span className="block text-xs font-medium text-zinc-600">De</span>
            <input
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </label>
          <label className="block text-sm">
            <span className="block text-xs font-medium text-zinc-600">Até</span>
            <input
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setPeriodFrom("");
              setPeriodTo("");
            }}
            className="cursor-pointer rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            Limpar período
          </button>
        </div>
        {periodInvalid ? (
          <p className="mt-2 text-xs text-amber-800">
            Preenche data inicial e final, ou limpa ambas para ver todo o histórico.
          </p>
        ) : null}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <span>Filtrar:</span>
          <select
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
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
          <span className="text-sm text-zinc-500">
            {total === 0 ? "Nenhum evento" : `${total} evento${total === 1 ? "" : "s"}`}
            {dates.from && dates.to ? (
              <span className="ml-1 text-zinc-400">
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

      {loading && !periodInvalid ? (
        <p className="text-sm text-zinc-500">A carregar…</p>
      ) : !periodInvalid ? (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-600">
                <tr>
                  <th className="px-4 py-3">Data / hora</th>
                  <th className="px-4 py-3">Identificador (visitante)</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Destino</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-zinc-500">
                      Sem cliques registados (com os filtros actuais).
                    </td>
                  </tr>
                ) : (
                  items.map((row) => {
                    const countryName = visitorCountryDisplayName(row.visitorCountryCode);
                    return (
                    <tr key={row.id} className="border-b border-zinc-100 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-800 tabular-nums">
                        {new Date(row.clickedAt).toLocaleString("pt-PT", {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })}
                      </td>
                      <td className="max-w-[min(280px,40vw)] px-4 py-3">
                        <div className="text-xs text-zinc-600">
                          País:{" "}
                          {countryName ? (
                            <>
                              <span className="font-medium text-zinc-800">{countryName}</span>
                              <span className="text-zinc-500">
                                {" "}
                                ({row.visitorCountryCode})
                              </span>
                            </>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </div>
                        <code
                          className="mt-1 block break-all text-xs text-zinc-700"
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
                        <div className="font-medium text-zinc-900">{labelRow(row)}</div>
                        {sublabelRow(row) ? (
                          <div className="mt-0.5 text-xs text-zinc-500">{sublabelRow(row)}</div>
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
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
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
