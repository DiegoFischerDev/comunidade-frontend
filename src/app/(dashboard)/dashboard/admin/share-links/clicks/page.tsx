"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type Row = Awaited<
  ReturnType<typeof api.admin.shareLinks.clickHistory>
>["items"][number];

const PAGE_SIZE = 50;

export default function AdminShareLinkClicksPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [kind, setKind] = useState<"" | "CUSTOM_LINK" | "HOUSE">("");
  const [offset, setOffset] = useState(0);
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    setOffset(0);
    let cancelled = false;
    (async () => {
      setError("");
      setLoading(true);
      try {
        const data = await api.admin.shareLinks.clickHistory({
          ...(kind ? { kind } : {}),
          limit: PAGE_SIZE,
          offset: 0,
        });
        if (cancelled) return;
        setTotal(data.total);
        setHasMore(data.hasMore);
        setItems(data.items);
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
  }, [user, isAdmin, kind]);

  async function loadMore() {
    const next = offset + PAGE_SIZE;
    setError("");
    try {
      const data = await api.admin.shareLinks.clickHistory({
        ...(kind ? { kind } : {}),
        limit: PAGE_SIZE,
        offset: next,
      });
      setTotal(data.total);
      setHasMore(data.hasMore);
      setItems((prev) => [...prev, ...data.items]);
      setOffset(next);
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
            Ordenado do mais recente para o mais antigo. Cada linha é um redirecionamento
            registado (timestamp único).
          </p>
        </div>
        <Link
          href="/dashboard/admin/share-links"
          className="text-sm font-medium text-amber-700 hover:underline"
        >
          ← Voltar a Links WhatsApp
        </Link>
      </div>

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
        {!loading ? (
          <span className="text-sm text-zinc-500">
            {total === 0 ? "Nenhum evento" : `${total} evento${total === 1 ? "" : "s"}`}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">A carregar…</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-600">
                <tr>
                  <th className="px-4 py-3">Data / hora</th>
                  <th className="px-4 py-3">Identificador</th>
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
                  items.map((row) => (
                    <tr key={row.id} className="border-b border-zinc-100 last:border-0">
                      <td className="whitespace-nowrap px-4 py-3 text-zinc-800 tabular-nums">
                        {new Date(row.clickedAt).toLocaleString("pt-PT", {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })}
                      </td>
                      <td className="max-w-[200px] px-4 py-3">
                        <code
                          className="break-all text-xs text-zinc-700"
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
                  ))
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
