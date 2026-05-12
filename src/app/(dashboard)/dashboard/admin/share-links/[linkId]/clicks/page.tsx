"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { visitorCountryDisplayName } from "@/lib/visitor-country-display";

type ClickRow = Awaited<
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

export default function AdminShareLinkDetailClicksPage() {
  const params = useParams();
  const linkId = typeof params?.linkId === "string" ? params.linkId : "";
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [meta, setMeta] = useState<{
    id: string;
    title: string;
    slug: string;
    entryUrl: string;
  } | null>(null);
  const [metaError, setMetaError] = useState("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<ClickRow[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [clearing, setClearing] = useState(false);
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");

  const loadMeta = useCallback(async (): Promise<boolean> => {
    if (!linkId) return false;
    setMetaError("");
    try {
      const m = await api.admin.shareLinks.getCustom(linkId);
      setMeta(m);
      return true;
    } catch (err) {
      setMeta(null);
      setMetaError(err instanceof Error ? err.message : "Link não encontrado.");
      return false;
    }
  }, [linkId]);

  const loadClicks = useCallback(
    async (fromOffset: number, append: boolean) => {
      if (!linkId) return;
      const dates = periodDateOpts(periodFrom, periodTo);
      if (!dates.ok) return;
      setListError("");
      try {
        const data = await api.admin.shareLinks.clickHistory({
          partnerShareLinkId: linkId,
          ...(dates.from && dates.to ? { from: dates.from, to: dates.to } : {}),
          limit: PAGE_SIZE,
          offset: fromOffset,
        });
        setTotal(data.total);
        setHasMore(data.hasMore);
        if (append) {
          setItems((prev) => [...prev, ...data.items]);
        } else {
          setItems(data.items);
        }
        setOffset(fromOffset);
      } catch (err) {
        setListError(err instanceof Error ? err.message : "Erro ao carregar cliques.");
      }
    },
    [linkId, periodFrom, periodTo],
  );

  useEffect(() => {
    if (!user || !isAdmin || !linkId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const ok = await loadMeta();
      if (cancelled) return;
      if (ok) {
        const dates = periodDateOpts(periodFrom, periodTo);
        if (!dates.ok) {
          setItems([]);
          setTotal(0);
          setHasMore(false);
        } else {
          await loadClicks(0, false);
        }
      } else {
        setItems([]);
        setTotal(0);
        setHasMore(false);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin, linkId, periodFrom, periodTo, loadMeta, loadClicks]);

  async function loadMore() {
    const dates = periodDateOpts(periodFrom, periodTo);
    if (!dates.ok) return;
    const next = offset + PAGE_SIZE;
    await loadClicks(next, true);
  }

  async function handleClearClicks() {
    if (!linkId || !meta) return;
    if (
      !confirm(
        `Zerar todos os ${total} clique(s) registados para «${meta.title}»? O link mantém-se; só o histórico de cliques é apagado.`,
      )
    ) {
      return;
    }
    setClearing(true);
    setListError("");
    try {
      await api.admin.shareLinks.clearCustomClicks(linkId);
      await loadClicks(0, false);
      await loadMeta();
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Erro ao zerar dados.");
    } finally {
      setClearing(false);
    }
  }

  function formatVisitorLabel(key: string | null): string {
    if (key && key.length > 0) return key;
    return "— (registo antigo)";
  }

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Cliques do link</h1>
        <p className="mt-2 text-zinc-600">Acesso restrito a administradores.</p>
      </div>
    );
  }

  if (!linkId) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <p className="text-sm text-zinc-600">Identificador do link em falta.</p>
      </div>
    );
  }

  const dates = periodDateOpts(periodFrom, periodTo);
  const periodInvalid = !dates.ok;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Cliques do link</h1>
          {meta ? (
            <>
              <p className="mt-1 text-lg font-medium text-zinc-800">{meta.title}</p>
              <p className="mt-1 text-sm text-zinc-500">
                slug: <code className="rounded bg-zinc-100 px-1">{meta.slug}</code>
              </p>
            </>
          ) : metaError ? (
            <p className="mt-2 text-sm text-red-700">{metaError}</p>
          ) : loading ? (
            <p className="mt-2 text-sm text-zinc-500">A carregar…</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/admin/share-links"
            className="text-sm font-medium text-amber-700 hover:underline"
          >
            ← Voltar a links
          </Link>
          {meta && total > 0 ? (
            <button
              type="button"
              disabled={clearing}
              onClick={() => void handleClearClicks()}
              className="cursor-pointer rounded-md border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
            >
              {clearing ? "A apagar…" : "Zerar dados"}
            </button>
          ) : null}
        </div>
      </div>

      {meta && !metaError ? (
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
      ) : null}

      {meta && !metaError && !periodInvalid ? (
        <p className="text-sm text-zinc-600">
          Cada linha corresponde a um dispositivo/browser que abriu o link (após a deduplicação
          por cookie). Total: <strong className="font-semibold text-zinc-900">{total}</strong>
          {dates.from && dates.to ? (
            <span className="text-zinc-500">
              {" "}
              (período: {dates.from} — {dates.to})
            </span>
          ) : (
            <span className="text-zinc-500"> (todo o período)</span>
          )}
        </p>
      ) : null}

      {listError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {listError}
        </div>
      ) : null}

      {loading && !meta ? (
        <p className="text-sm text-zinc-500">A carregar…</p>
      ) : metaError ? null : periodInvalid ? null : (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-600">
                <tr>
                  <th className="px-4 py-3">Data / hora</th>
                  <th className="px-4 py-3">Identificador (visitante)</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-10 text-center text-zinc-500">
                      Nenhum clique registado para este link.
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
                      <td className="px-4 py-3">
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
                          className="mt-1 block break-all text-xs text-zinc-800"
                          title={row.visitorKey ?? undefined}
                        >
                          {formatVisitorLabel(row.visitorKey)}
                        </code>
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
      )}
    </div>
  );
}
