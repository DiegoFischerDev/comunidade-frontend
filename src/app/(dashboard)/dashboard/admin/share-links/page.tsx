"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type Overview = Awaited<ReturnType<typeof api.admin.shareLinks.overview>>;

export default function AdminShareLinksPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"custom" | "houses">("custom");

  const [title, setTitle] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [phrase, setPhrase] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const o = await api.admin.shareLinks.overview();
    setData(o);
  }, []);

  useEffect(() => {
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    (async () => {
      setError("");
      setLoading(true);
      try {
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao carregar.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isAdmin, load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      await api.admin.shareLinks.createCustom({
        title: title.trim(),
        whatsapp: whatsapp.trim(),
        whatsappPhrase: phrase.trim(),
      });
      setTitle("");
      setWhatsapp("");
      setPhrase("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar link.");
    } finally {
      setCreating(false);
    }
  }

  function copyText(text: string) {
    void navigator.clipboard.writeText(text);
  }

  const origin =
    typeof window !== "undefined" ? window.location.origin.replace(/\/$/, "") : "";

  const hintEntryBase = useMemo(() => {
    if (!origin) return "https://seudominio.com/whatsapp?t=…";
    return `${origin}/whatsapp?t=…`;
  }, [origin]);

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Links de redirecionamento</h1>
        <p className="mt-2 text-zinc-600">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Links de redirecionamento</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Partilha sempre o link do site (entrada). Ex.:{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">{hintEntryBase}</code> ou{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">
            {origin ? `${origin}/imovel?id=…` : "/imovel?id=…"}
          </code>
          . Cada abertura regista um clique com data (para relatórios futuros).
        </p>
        </div>
        <Link
          href="/dashboard/admin/share-links/clicks"
          className="shrink-0 text-sm font-medium text-amber-700 hover:underline"
        >
          Histórico de cliques →
        </Link>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-medium text-zinc-900">Novo link (contacto / parceiro)</h2>
        <form onSubmit={handleCreate} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-zinc-700">Título</span>
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Parceiro João — Lisboa"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-zinc-700">WhatsApp do destino</span>
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+351 912 345 678"
              required
              autoComplete="tel"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-zinc-700">Frase pré-preenchida no WhatsApp</span>
            <textarea
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              rows={3}
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="Mensagem que abre ao clicar no link"
              required
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="rounded-md bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {creating ? "A criar…" : "Gerar link"}
            </button>
          </div>
        </form>
      </section>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="flex gap-2 border-b border-zinc-200">
        <button
          type="button"
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === "custom"
              ? "border-amber-600 text-zinc-900"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
          onClick={() => setTab("custom")}
        >
          Links personalizados
        </button>
        <button
          type="button"
          className={`border-b-2 px-3 py-2 text-sm font-medium ${
            tab === "houses"
              ? "border-amber-600 text-zinc-900"
              : "border-transparent text-zinc-500 hover:text-zinc-800"
          }`}
          onClick={() => setTab("houses")}
        >
          Imóveis (anúncios)
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">A carregar…</p>
      ) : data && tab === "custom" ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Cliques</th>
                <th className="px-4 py-3">Link de entrada</th>
                <th className="px-4 py-3">Criado</th>
              </tr>
            </thead>
            <tbody>
              {data.customLinks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                    Ainda não há links personalizados.
                  </td>
                </tr>
              ) : (
                data.customLinks.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-zinc-900">{row.title}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        slug: <code>{row.slug}</code>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top font-semibold tabular-nums">
                      {row.clickCount}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="max-w-[min(420px,55vw)] truncate rounded bg-zinc-100 px-2 py-1 text-xs">
                          {row.entryUrl}
                        </code>
                        <button
                          type="button"
                          className="text-xs font-medium text-amber-700 hover:underline"
                          onClick={() => copyText(row.entryUrl)}
                        >
                          Copiar
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-zinc-600">
                      {new Date(row.createdAt).toLocaleString("pt-PT")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : data && tab === "houses" ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Imóvel</th>
                <th className="px-4 py-3">Parceiro</th>
                <th className="px-4 py-3">Cliques</th>
                <th className="px-4 py-3">Link de entrada</th>
              </tr>
            </thead>
            <tbody>
              {data.houseLinks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                    Nenhum anúncio encontrado.
                  </td>
                </tr>
              ) : (
                data.houseLinks.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100 last:border-0">
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-zinc-900">{row.title}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        ref. #{row.houseId} · {row.priceEur}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-zinc-700">{row.partnerName}</td>
                    <td className="px-4 py-3 align-top font-semibold tabular-nums">
                      {row.clickCount}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="max-w-[min(420px,55vw)] truncate rounded bg-zinc-100 px-2 py-1 text-xs">
                          {row.entryUrl}
                        </code>
                        <button
                          type="button"
                          className="text-xs font-medium text-amber-700 hover:underline"
                          onClick={() => copyText(row.entryUrl)}
                        >
                          Copiar
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">
                        Mensagem: {row.messagePreview}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
