"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AddHouseModal } from "@/components/house/AddHouseModal";
import {
  formatAdvertisingBalanceEur,
  HousePublicationStatusBadge,
} from "@/components/house/HousePublicationStatusBadge";
import { AddAdvertisingBalanceModal } from "@/components/house/AddAdvertisingBalanceModal";
import { PublishHouseConfirmModal } from "@/components/house/PublishHouseConfirmModal";
import { api } from "@/lib/api";
import { formatHouseEntradaShort, formatHouseEntradaWithTotal, orderHouseImagesWithCoverFirst } from "@/lib/house-entrance";
import { resolveUploadsUrl } from "@/lib/resolve-uploads-url";
import { useAuth } from "@/contexts/AuthContext";
import { CardButton } from "@/components/ui/CardButton";

type HouseRow = Awaited<ReturnType<typeof api.partner.houses.list>>[number];

const CITY_LABELS: Record<string, string> = {
  INTERIOR: "Interior",
  LISBOA: "Lisboa",
  PORTO: "Porto",
  BRAGA: "Braga",
  COIMBRA: "Coimbra",
  AVEIRO: "Aveiro",
  FARO: "Faro",
  ALGARVE: "Algarve",
  EVORA: "Évora",
  VISEU: "Viseu",
};

const TYPOLOGY_LABELS: Record<string, string> = {
  T0: "T0",
  T1: "T1",
  T2: "T2",
  T3: "T3",
  T4: "T4",
  T5: "T5",
  QUARTO_AP_COMPARTILHADO: "Quarto em Ap compartilhado",
};
const BUSINESS_TYPE_LABELS: Record<"RENT" | "SALE", string> = {
  RENT: "Arrendamento",
  SALE: "Venda",
};

function formatDatePt(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-PT");
}

function houseWhatsAppSendDatesLabel(h: {
  whatsappSends?: { sentAt: string }[];
  whatsappSentAt: string | null;
}): string {
  const fromArray = (h.whatsappSends ?? [])
    .map((x) => x.sentAt)
    .filter((x): x is string => typeof x === "string" && x.trim() !== "")
    .map((iso) => new Date(iso).toLocaleDateString("pt-PT"));
  if (fromArray.length > 0) return fromArray.reverse().join("\n");
  if (h.whatsappSentAt) return new Date(h.whatsappSentAt).toLocaleDateString("pt-PT");
  return "—";
}

function getHouseListThumbSrc(h: {
  imageUrls: string[];
  coverImageUrl?: string | null;
  videoUrl: string | null;
  videoPosterUrl?: string | null;
}): { imageSrc: string | null; videoSrc: string | null } {
  const ordered = orderHouseImagesWithCoverFirst(h.imageUrls ?? [], h.coverImageUrl);
  const imageSrc = ordered[0] ? resolveUploadsUrl(ordered[0]) : null;
  const videoSrc = h.videoUrl ? resolveUploadsUrl(h.videoUrl) : null;
  const fallbackThumb =
    !imageSrc && h.videoPosterUrl ? resolveUploadsUrl(h.videoPosterUrl) : null;
  return { imageSrc: imageSrc ?? fallbackThumb, videoSrc: imageSrc ? null : videoSrc };
}

export default function PartnerHousesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<HouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
  const [deletingById, setDeletingById] = useState<Record<string, boolean>>({});
  const [canManageHouses, setCanManageHouses] = useState<boolean | null>(null);
  const [showUpdatedBanner, setShowUpdatedBanner] = useState(false);
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [editHouseId, setEditHouseId] = useState<string | null>(null);
  const [balanceEurCents, setBalanceEurCents] = useState(0);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [publishHouse, setPublishHouse] = useState<HouseRow | null>(null);
  const [publishingById, setPublishingById] = useState<Record<string, boolean>>({});
  const [showTopupSuccessBanner, setShowTopupSuccessBanner] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("updated") === "1") {
      setShowUpdatedBanner(true);
      router.replace("/dashboard/casas", { scroll: false });
    }
    if (q.get("create") === "1") {
      setEditHouseId(null);
      setShowHouseModal(true);
      router.replace("/dashboard/casas", { scroll: false });
    }
    const editId = q.get("edit")?.trim();
    if (editId) {
      setEditHouseId(editId);
      setShowHouseModal(true);
      router.replace("/dashboard/casas", { scroll: false });
    }
    if (q.get("topup") === "success") {
      setShowTopupSuccessBanner(true);
      router.replace("/dashboard/casas", { scroll: false });
    }
  }, [router]);

  async function refreshBalance() {
    try {
      const b = await api.partner.advertising.getBalance();
      setBalanceEurCents(b.balanceEurCents);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (!user) return;
    if (user.role !== "PARTNER") {
      setLoading(false);
      setCanManageHouses(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const me = await api.partner.me();
        const ok = me.category?.slug === "relocation";
        if (!cancelled) setCanManageHouses(ok);
        if (!ok) return;
        const [data, balance] = await Promise.all([
          api.partner.houses.list(),
          api.partner.advertising.getBalance(),
        ]);
        if (!cancelled) {
          setRows(data);
          setBalanceEurCents(balance.balanceEurCents);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao carregar casas.");
          setCanManageHouses(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const text = [
        String(r.houseId),
        r.title,
        r.city,
        CITY_LABELS[r.city] ?? "",
        r.typology,
        r.businessType,
        BUSINESS_TYPE_LABELS[r.businessType] ?? "",
        TYPOLOGY_LABELS[r.typology] ?? "",
        r.priceEur,
        r.relocationFeeEur,
        String(r.caucoesCount),
        String(r.rendasEntradaCount),
        formatHouseEntradaShort(r.caucoesCount, r.rendasEntradaCount),
        formatHouseEntradaWithTotal(r.caucoesCount, r.rendasEntradaCount, r.priceEur),
        r.furnished ? "mobilado sim" : "mobilado não",
        r.publicationStatus,
        r.publicationStatus === "PUBLISHED" ? "publicado" : "oculto",
        String(r._count?.redirectClicks ?? 0),
        houseWhatsAppSendDatesLabel(r),
        r.whatsappError ? "falha whatsapp" : "",
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [rows, filter]);

  async function handlePublishConfirm() {
    if (!publishHouse) return;
    const id = publishHouse.id;
    setPublishingById((s) => ({ ...s, [id]: true }));
    try {
      const res = await api.partner.houses.publish(id);
      const data = await api.partner.houses.list();
      setRows(data);
      setBalanceEurCents(res.balanceEurCents);
      setPublishHouse(null);
    } catch (err) {
      setPublishingById((s) => ({ ...s, [id]: false }));
      throw err;
    } finally {
      setPublishingById((s) => ({ ...s, [id]: false }));
    }
  }

  async function handleDeleteHouse(id: string) {
    const ok = window.confirm(
      "Excluir este imóvel? As fotos e o vídeo serão removidos. Esta ação não pode ser desfeita.",
    );
    if (!ok) return;
    setDeletingById((s) => ({ ...s, [id]: true }));
    setError("");
    try {
      await api.partner.houses.delete(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível excluir o imóvel.");
    } finally {
      setDeletingById((s) => ({ ...s, [id]: false }));
    }
  }

  if (!user) return null;

  if (user.role !== "PARTNER") {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Minhas casas</h1>
        <p className="mt-2 text-sm text-zinc-600">Esta área é exclusiva para parceiros.</p>
      </div>
    );
  }

  if (loading || canManageHouses === null) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Minhas casas</h1>
        <p className="mt-4 text-sm text-zinc-600">Carregando…</p>
      </div>
    );
  }

  if (!canManageHouses) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Minhas casas</h1>
        <p className="mt-2 max-w-lg text-sm text-zinc-600">
          Esta área é apenas para parceiros na categoria <strong>Relocation</strong>. Se precisares de
          alterar a tua categoria, contacta a equipa.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Minhas casas</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Gere os teus anúncios e publica-os no site e nos grupos WhatsApp com o saldo de publicidade.
          </p>
        </div>
        <div className="shrink-0">
          <CardButton
            type="button"
            variant="primary"
            onClick={() => {
              setEditHouseId(null);
              setShowHouseModal(true);
            }}
          >
            Adicionar casa
          </CardButton>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
            Saldo atual de publicidade
          </p>
          <p className="text-xl font-bold text-amber-950">
            {formatAdvertisingBalanceEur(balanceEurCents)}
          </p>
        </div>
        <CardButton type="button" variant="primary" onClick={() => setShowTopupModal(true)}>
          Adicionar saldo
        </CardButton>
      </div>

      {showTopupSuccessBanner && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Pagamento recebido. O saldo foi atualizado.
        </div>
      )}

      {showUpdatedBanner && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Imóvel atualizado. As alterações refletem-se na página pública do anúncio.
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">Carregando…</p>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6">
          <p className="text-sm text-zinc-600">
            Ainda não publicaste nenhum imóvel.
          </p>
          <div className="mt-4">
            <CardButton
              type="button"
              variant="primary"
              onClick={() => {
                setEditHouseId(null);
                setShowHouseModal(true);
              }}
            >
              Adicionar o primeiro
            </CardButton>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <label className="block text-xs font-medium text-zinc-700">Filtrar</label>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Pesquisar por Id, título, cidade, tipologia, preço…"
              className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left font-medium">Id</th>
                  <th className="w-[76px] px-4 py-3 text-left font-medium">Thumb</th>
                  <th className="px-4 py-3 text-left font-medium">Título</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-medium tabular-nums">
                    Clicks
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Cidade</th>
                  <th className="px-4 py-3 text-left font-medium">Tipologia</th>
                  <th className="px-4 py-3 text-left font-medium">Disponível em</th>
                  <th className="px-4 py-3 text-left font-medium">Preço</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Entrada (taxa relocation, cauções e rendas)
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Enviado em</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-zinc-600">
                      {r.houseId}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/casas/${r.houseId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Ver anúncio ${r.title}`}
                        className="relative block h-10 w-14 overflow-hidden rounded-md border border-zinc-200 bg-zinc-100"
                      >
                        {(() => {
                          const { imageSrc, videoSrc } = getHouseListThumbSrc(r);
                          if (imageSrc) {
                            return (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={imageSrc}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            );
                          }
                          if (videoSrc) {
                            return (
                              <video
                                src={videoSrc}
                                className="h-full w-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            );
                          }
                          return (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-400">
                              —
                            </div>
                          );
                        })()}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-900">
                        {r.title}
                        {r.videoUrl ? (
                          <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700">
                            Vídeo
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-zinc-900">
                      {r._count?.redirectClicks ?? 0}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{CITY_LABELS[r.city] ?? r.city}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      {TYPOLOGY_LABELS[r.typology] ?? r.typology}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{formatDatePt(r.availableFrom)}</td>
                    <td className="px-4 py-3 text-zinc-700">{r.priceEur}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      <div className="text-xs text-zinc-500">Taxa: {r.relocationFeeEur} €</div>
                      <div>{formatHouseEntradaWithTotal(r.caucoesCount, r.rendasEntradaCount, r.priceEur)}</div>
                    </td>
                    <td
                      className="whitespace-pre-line px-4 py-3 align-top text-xs text-zinc-700"
                      title={r.whatsappError?.trim() ? r.whatsappError : undefined}
                    >
                      {houseWhatsAppSendDatesLabel(r)}
                      {r.whatsappError?.trim() ? (
                        <span className="mt-1 block text-red-600">Falha no envio</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <HousePublicationStatusBadge
                        publicationStatus={r.publicationStatus}
                        publishedUntil={r.publishedUntil}
                      />
                    </td>
                    <td className="px-4 py-3 text-right align-top">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          title="Publicar / reenviar"
                          aria-label="Publicar imóvel"
                          disabled={publishingById[r.id]}
                          onClick={() => setPublishHouse(r)}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditHouseId(r.id);
                            setShowHouseModal(true);
                          }}
                          title="Editar anúncio"
                          aria-label="Editar anúncio"
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50"
                        >
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            viewBox="0 0 24 24"
                            aria-hidden
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          title="Eliminar anúncio"
                          aria-label="Eliminar anúncio"
                          disabled={deletingById[r.id]}
                          onClick={() => handleDeleteHouse(r.id)}
                          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingById[r.id] ? (
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
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                              aria-hidden
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.008 0L9.22 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <AddHouseModal
        open={showHouseModal}
        houseId={editHouseId}
        onClose={() => {
          setShowHouseModal(false);
          setEditHouseId(null);
        }}
        onSuccess={async () => {
          try {
            const data = await api.partner.houses.list();
            setRows(data);
            if (editHouseId) setShowUpdatedBanner(true);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Erro ao carregar casas.");
          }
        }}
        mode="partner"
      />

      <AddAdvertisingBalanceModal
        open={showTopupModal}
        onClose={() => setShowTopupModal(false)}
        onSuccess={refreshBalance}
      />

      <PublishHouseConfirmModal
        open={publishHouse != null}
        house={publishHouse}
        balanceEurCents={balanceEurCents}
        onClose={() => setPublishHouse(null)}
        onConfirm={handlePublishConfirm}
      />
    </div>
  );
}

