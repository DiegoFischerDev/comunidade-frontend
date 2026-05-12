"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

type Overview = Awaited<ReturnType<typeof api.admin.shareLinks.overview>>;

function CopyLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
    </svg>
  );
}

/** Apresentação legível do número guardado (apenas dígitos). */
function formatWhatsappDigits(digits: string): string {
  const d = String(digits ?? "").replace(/\D/g, "");
  if (!d) return "—";
  if (d.length === 12 && d.startsWith("351")) {
    const r = d.slice(3);
    return `+351 ${r.slice(0, 3)} ${r.slice(3, 6)} ${r.slice(6)}`;
  }
  if (d.length === 9 && /^9\d{8}$/.test(d)) {
    return `+351 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  }
  return d;
}

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
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [busyDeleteCustomId, setBusyDeleteCustomId] = useState<string | null>(null);

  /** Período opcional (AAAA-MM-DD). Ambas vazias = totais desde sempre. */
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo] = useState("");

  const reloadOverview = useCallback(async () => {
    const pf = periodFrom.trim();
    const pt = periodTo.trim();
    if ((pf && !pt) || (!pf && pt)) return;
    const o = await api.admin.shareLinks.overview(
      pf && pt ? { from: pf, to: pt } : {},
    );
    setData(o);
  }, [periodFrom, periodTo]);

  useEffect(() => {
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }
    const pf = periodFrom.trim();
    const pt = periodTo.trim();
    if ((pf && !pt) || (!pf && pt)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setError("");
      setLoading(true);
      try {
        const o = await api.admin.shareLinks.overview(
          pf && pt ? { from: pf, to: pt } : {},
        );
        if (!cancelled) setData(o);
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
  }, [user, isAdmin, periodFrom, periodTo]);

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
      setAddModalOpen(false);
      await reloadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar link.");
    } finally {
      setCreating(false);
    }
  }

  const closeAddModal = useCallback(() => {
    setAddModalOpen(false);
    setError("");
  }, []);

  useEffect(() => {
    if (!addModalOpen) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") closeAddModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addModalOpen, closeAddModal]);

  function copyText(text: string) {
    void navigator.clipboard.writeText(text);
  }

  async function handleDeleteCustomLink(id: string, title: string) {
    if (
      !confirm(
        `Eliminar o link «${title}»? O histórico de cliques deste link será removido.`,
      )
    ) {
      return;
    }
    setBusyDeleteCustomId(id);
    setError("");
    try {
      await api.admin.shareLinks.deleteCustom(id);
      await reloadOverview();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao eliminar o link.");
    } finally {
      setBusyDeleteCustomId(null);
    }
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

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-medium text-zinc-900">Cliques por período</p>
        <p className="mt-1 text-xs text-zinc-500">
          Sem datas: totais acumulados. Com &quot;De&quot; e &quot;Até&quot;: apenas cliques nesse intervalo (datas em UTC).
          A lista ordena sempre por mais cliques primeiro.
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
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
        {((periodFrom.trim() && !periodTo.trim()) ||
          (!periodFrom.trim() && periodTo.trim())) ? (
          <p className="mt-2 text-xs text-amber-800">
            Preenche data inicial e final, ou limpa ambas para ver totais.
          </p>
        ) : null}
      </section>

      {error && !addModalOpen ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {addModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAddModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-link-modal-title"
            className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-xl border border-zinc-200 bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id="share-link-modal-title" className="text-lg font-medium text-zinc-900">
                Novo link (contacto / parceiro)
              </h2>
              <button
                type="button"
                onClick={() => closeAddModal()}
                className="cursor-pointer rounded-md p-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                aria-label="Fechar"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {error ? (
              <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </div>
            ) : null}
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
              <label className="block sm:col-span-2">
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
              <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => closeAddModal()}
                  className="cursor-pointer rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="cursor-pointer rounded-md bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {creating ? "A criar…" : "Gerar link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-zinc-200">
        <div className="flex gap-2">
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
        {tab === "custom" ? (
          <button
            type="button"
            onClick={() => {
              setError("");
              setAddModalOpen(true);
            }}
            className="mb-1 cursor-pointer rounded-md bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-95"
          >
            Adicionar link
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">A carregar…</p>
      ) : data && tab === "custom" ? (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase text-zinc-600">
              <tr>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3 align-bottom">
                  <span className="block">Cliques</span>
                  {data.clickPeriod ? (
                    <span className="mt-1 block text-[10px] font-normal normal-case tracking-normal text-zinc-500">
                      {data.clickPeriod.from} — {data.clickPeriod.to}
                    </span>
                  ) : (
                    <span className="mt-1 block text-[10px] font-normal normal-case tracking-normal text-zinc-500">
                      total
                    </span>
                  )}
                </th>
                <th className="px-4 py-3">Whatsapp</th>
                <th className="px-4 py-3">Link de entrada</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.customLinks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-500">
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
                      <div className="font-medium tabular-nums text-zinc-900">
                        {formatWhatsappDigits(row.whatsappDigits)}
                      </div>
                      <p
                        className="mt-2 max-w-[min(280px,40vw)] text-xs leading-snug text-zinc-500"
                        title={row.whatsappPhrase}
                      >
                        frase:{" "}
                        <span className="text-zinc-700">{row.whatsappPhrase}</span>
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="max-w-[min(420px,55vw)] truncate rounded bg-zinc-100 px-2 py-1 text-xs">
                          {row.entryUrl}
                        </code>
                        <button
                          type="button"
                          title="Copiar link"
                          aria-label="Copiar link"
                          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-zinc-200 bg-white text-amber-700 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
                          onClick={() => copyText(row.entryUrl)}
                        >
                          <CopyLinkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <button
                        type="button"
                        title="Eliminar link"
                        aria-label="Eliminar link"
                        disabled={busyDeleteCustomId === row.id}
                        onClick={() => void handleDeleteCustomLink(row.id, row.title)}
                        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-white text-red-700 shadow-sm transition-colors hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {busyDeleteCustomId === row.id ? (
                          <svg
                            className="h-4 w-4 animate-spin"
                            viewBox="0 0 24 24"
                            fill="none"
                            aria-hidden
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        ) : (
                          <TrashIcon className="h-4 w-4" />
                        )}
                      </button>
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
                <th className="px-4 py-3 align-bottom">
                  <span className="block">Cliques</span>
                  {data.clickPeriod ? (
                    <span className="mt-1 block text-[10px] font-normal normal-case tracking-normal text-zinc-500">
                      {data.clickPeriod.from} — {data.clickPeriod.to}
                    </span>
                  ) : (
                    <span className="mt-1 block text-[10px] font-normal normal-case tracking-normal text-zinc-500">
                      total
                    </span>
                  )}
                </th>
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
                          title="Copiar link"
                          aria-label="Copiar link"
                          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-zinc-200 bg-white text-amber-700 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
                          onClick={() => copyText(row.entryUrl)}
                        >
                          <CopyLinkIcon className="h-4 w-4" />
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
