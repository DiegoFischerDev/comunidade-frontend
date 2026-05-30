"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AddHouseModal } from "@/components/house/AddHouseModal";
import { isActivePublished } from "@/components/house/HousePublicationStatusBadge";
import { AddAdvertisingBalanceModal } from "@/components/house/AddAdvertisingBalanceModal";
import { AdvertisingBalanceCard } from "@/components/house/AdvertisingBalanceCard";
import { PartnerWhatsappScanPanel } from "@/components/whatsapp-scan/PartnerWhatsappScanPanel";
import { PartnerHousesList, type HouseListSelection } from "@/components/house/PartnerHousesList";
import { PublishHouseConfirmModal } from "@/components/house/PublishHouseConfirmModal";
import { PublishHousesBulkConfirmModal } from "@/components/house/PublishHousesBulkConfirmModal";
import { api } from "@/lib/api";
import { formatHouseEntradaShort, formatHouseEntradaWithTotal } from "@/lib/house-entrance";
import { useAuth } from "@/contexts/AuthContext";
import { CardButton } from "@/components/ui/CardButton";
type HouseRow = Awaited<ReturnType<typeof api.partner.houses.list>>[number];

const BULK_PUBLISH_DELAY_MS = 10_000;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function TabIconPublished({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function TabIconHidden({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  );
}

function TabIconTrash({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.008 0L9.22 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

const TAB_ICONS = {
  PUBLISHED: TabIconPublished,
  HIDDEN: TabIconHidden,
  TRASH: TabIconTrash,
} as const;

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

export default function PartnerHousesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<HouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [tab, setTab] = useState<"PUBLISHED" | "HIDDEN" | "TRASH">("PUBLISHED");
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
  const [deletingById, setDeletingById] = useState<Record<string, boolean>>({});
  const [restoringById, setRestoringById] = useState<Record<string, boolean>>({});
  const [canManageHouses, setCanManageHouses] = useState<boolean | null>(null);
  const [showUpdatedBanner, setShowUpdatedBanner] = useState(false);
  const [showHouseModal, setShowHouseModal] = useState(false);
  const [editHouseId, setEditHouseId] = useState<string | null>(null);
  const [balanceEurCents, setBalanceEurCents] = useState(0);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [publishHouse, setPublishHouse] = useState<HouseRow | null>(null);
  const [bulkPublishHouses, setBulkPublishHouses] = useState<HouseRow[] | null>(null);
  const [publishingById, setPublishingById] = useState<Record<string, boolean>>({});
  const [showTopupSuccessBanner, setShowTopupSuccessBanner] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const bulkPublishCancelRef = useRef(false);

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
        const ok = me.categorySlug === "relocation";
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

  const counts = useMemo(
    () => ({
      PUBLISHED: rows.filter((r) => r.publicationStatus === "PUBLISHED").length,
      HIDDEN: rows.filter((r) => r.publicationStatus === "HIDDEN").length,
      TRASH: rows.filter((r) => r.publicationStatus === "TRASH").length,
    }),
    [rows],
  );

  const filtered = useMemo(() => {
    const byTab = rows.filter((r) => r.publicationStatus === tab);
    const q = filter.trim().toLowerCase();
    const list = q
      ? byTab.filter((r) => {
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
        })
      : byTab;

    return [...list].sort((a, b) => {
      const aPublished = isActivePublished(a.publicationStatus, a.publishedUntil) ? 1 : 0;
      const bPublished = isActivePublished(b.publicationStatus, b.publishedUntil) ? 1 : 0;
      if (bPublished !== aPublished) return bPublished - aPublished;
      return b.houseId - a.houseId;
    });
  }, [rows, filter, tab]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [tab]);

  const selectedCount = selectedIds.size;
  const filteredIds = useMemo(() => filtered.map((r) => r.id), [filtered]);
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));
  const someFilteredSelected =
    filtered.some((r) => selectedIds.has(r.id)) && !allFilteredSelected;

  const selection: HouseListSelection = useMemo(
    () => ({
      selectedIds,
      onToggle: (id: string) => {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
      },
      onToggleAll: () => {
        setSelectedIds((prev) => {
          if (allFilteredSelected) {
            const next = new Set(prev);
            for (const id of filteredIds) next.delete(id);
            return next;
          }
          const next = new Set(prev);
          for (const id of filteredIds) next.add(id);
          return next;
        });
      },
      allSelected: allFilteredSelected,
      someSelected: someFilteredSelected,
    }),
    [selectedIds, allFilteredSelected, someFilteredSelected, filteredIds],
  );

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  async function handlePublishConfirm() {
    if (!publishHouse) return;
    const id = publishHouse.id;
    setPublishingById((s) => ({ ...s, [id]: true }));
    try {
      const res = await api.partner.houses.publish(id);
      setPublishHouse(null);
      setPublishingById((s) => ({ ...s, [id]: false }));
      const data = await api.partner.houses.list();
      setRows(data);
      setBalanceEurCents(res.balanceEurCents);
    } catch (err) {
      setPublishingById((s) => ({ ...s, [id]: false }));
      throw err;
    }
  }

  async function handleUnpublish() {
    if (!publishHouse) return;
    const id = publishHouse.id;
    setPublishingById((s) => ({ ...s, [id]: true }));
    try {
      await api.partner.houses.unpublish(id);
      setPublishHouse(null);
      setPublishingById((s) => ({ ...s, [id]: false }));
      const data = await api.partner.houses.list();
      setRows(data);
    } catch (err) {
      setPublishingById((s) => ({ ...s, [id]: false }));
      throw err;
    }
  }

  async function handleTrashHouse(id: string) {
    const ok = window.confirm(
      "Mover este imóvel para a lixeira? Poderás restaurá-lo nos próximos 10 dias; depois será excluído automaticamente.",
    );
    if (!ok) return;
    setDeletingById((s) => ({ ...s, [id]: true }));
    setError("");
    try {
      await api.partner.houses.trash(id);
      const data = await api.partner.houses.list();
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível mover o imóvel para a lixeira.");
    } finally {
      setDeletingById((s) => ({ ...s, [id]: false }));
    }
  }

  async function handleRestoreHouse(id: string) {
    setRestoringById((s) => ({ ...s, [id]: true }));
    setError("");
    try {
      await api.partner.houses.restore(id);
      const data = await api.partner.houses.list();
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível restaurar o imóvel.");
    } finally {
      setRestoringById((s) => ({ ...s, [id]: false }));
    }
  }

  function openBulkPublishModal() {
    const selected = filtered.filter((r) => selectedIds.has(r.id));
    if (selected.length === 0) return;
    setBulkPublishHouses(selected);
  }

  async function handleBulkPublishConfirm() {
    const houses = bulkPublishHouses;
    if (!houses?.length) return;
    const ids = houses.map((r) => r.id);
    setBulkPublishHouses(null);

    bulkPublishCancelRef.current = false;
    setBulkBusy(true);
    setError("");

    for (let i = 0; i < ids.length; i++) {
      if (bulkPublishCancelRef.current) break;
      const id = ids[i]!;
      setPublishingById((s) => ({ ...s, [id]: true }));
      try {
        const res = await api.partner.houses.publish(id);
        setBalanceEurCents(res.balanceEurCents);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : `Falha ao publicar o imóvel (${i + 1} de ${ids.length}).`,
        );
        break;
      } finally {
        setPublishingById((s) => ({ ...s, [id]: false }));
      }

      if (i < ids.length - 1 && !bulkPublishCancelRef.current) {
        await sleep(BULK_PUBLISH_DELAY_MS);
      }
    }

    try {
      const data = await api.partner.houses.list();
      setRows(data);
    } catch {
      /* ignore */
    }
    setBulkBusy(false);
    clearSelection();
  }

  async function handleBulkDelete() {
    const ids = filtered.filter((r) => selectedIds.has(r.id)).map((r) => r.id);
    if (ids.length === 0) return;

    const isTrash = tab === "TRASH";
    const ok = window.confirm(
      isTrash
        ? `Excluir definitivamente ${ids.length} imóvel(is)? As fotos e vídeos serão removidos do servidor. Esta ação não pode ser desfeita.`
        : `Mover ${ids.length} imóvel(is) para a lixeira? Poderás restaurá-los nos próximos 10 dias.`,
    );
    if (!ok) return;

    setBulkBusy(true);
    setError("");

    for (const id of ids) {
      setDeletingById((s) => ({ ...s, [id]: true }));
      try {
        if (isTrash) {
          await api.partner.houses.delete(id);
        } else {
          await api.partner.houses.trash(id);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : isTrash
              ? "Não foi possível excluir um dos imóveis."
              : "Não foi possível mover um dos imóveis para a lixeira.",
        );
        break;
      } finally {
        setDeletingById((s) => ({ ...s, [id]: false }));
      }
    }

    try {
      const data = await api.partner.houses.list();
      setRows(data);
    } catch {
      /* ignore */
    }
    setBulkBusy(false);
    clearSelection();
  }

  async function handleBulkRestore() {
    const ids = filtered.filter((r) => selectedIds.has(r.id)).map((r) => r.id);
    if (ids.length === 0) return;

    const ok = window.confirm(
      `Restaurar ${ids.length} imóvel(is) para a lista de ocultos?`,
    );
    if (!ok) return;

    setBulkBusy(true);
    setError("");

    for (const id of ids) {
      setRestoringById((s) => ({ ...s, [id]: true }));
      try {
        await api.partner.houses.restore(id);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível restaurar um dos imóveis.",
        );
        break;
      } finally {
        setRestoringById((s) => ({ ...s, [id]: false }));
      }
    }

    try {
      const data = await api.partner.houses.list();
      setRows(data);
    } catch {
      /* ignore */
    }
    setBulkBusy(false);
    clearSelection();
  }

  async function handleDeleteForever(id: string) {
    const ok = window.confirm(
      "Excluir definitivamente este imóvel? As fotos e o vídeo serão removidos do servidor. Esta ação não pode ser desfeita.",
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
    <div className="min-w-0 max-w-full overflow-x-hidden">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Minhas casas</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Gere os teus anúncios e publica-os no site e nos grupos WhatsApp com o saldo de publicidade.
        </p>
      </div>

      <AdvertisingBalanceCard
        balanceEurCents={balanceEurCents}
        onAddBalance={() => setShowTopupModal(true)}
      />

      <PartnerWhatsappScanPanel />

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
          <div className="mt-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="shrink-0 sm:order-2 sm:ml-auto">
              <CardButton
                type="button"
                variant="primary"
                disabled={bulkBusy}
                className="w-full sm:w-auto"
                onClick={() => {
                  setEditHouseId(null);
                  setShowHouseModal(true);
                }}
              >
                Adicionar casa
              </CardButton>
            </div>
            <div className="min-w-0 flex-1 sm:order-1 sm:max-w-md">
              <label className="block text-xs font-medium text-zinc-700">Filtrar</label>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Pesquisar por Id, título, cidade, tipologia, preço…"
                disabled={bulkBusy}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
              />
            </div>
          </div>

          <div className="mt-4 min-w-0 border-b border-zinc-200">
            <nav
              className="-mb-px flex w-full min-w-0 justify-between gap-0.5 sm:justify-start sm:gap-2"
              aria-label="Abas de imóveis"
            >
              {(
                [
                  { key: "PUBLISHED", label: "Publicados" },
                  { key: "HIDDEN", label: "Ocultos" },
                  { key: "TRASH", label: "Lixeira" },
                ] as const
              ).map((t) => {
                const active = tab === t.key;
                const Icon = TAB_ICONS[t.key];
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`-mb-px inline-flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1 whitespace-nowrap border-b-2 px-1.5 py-2 text-xs font-medium transition-colors sm:flex-none sm:justify-start sm:gap-1.5 sm:px-3 sm:py-2.5 sm:text-sm ${
                      active
                        ? "border-blue-600 text-blue-700"
                        : "border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                    {t.label}
                    <span
                      className={`rounded-full px-1 py-0.5 text-[10px] tabular-nums sm:px-1.5 sm:text-xs ${
                        active ? "bg-blue-100 text-blue-700" : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {counts[t.key]}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {selectedCount > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
              <span className="text-sm font-medium text-blue-900">
                {selectedCount} selecionado{selectedCount === 1 ? "" : "s"}
              </span>
              {tab !== "TRASH" ? (
                <CardButton
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={bulkBusy}
                  onClick={openBulkPublishModal}
                >
                  Publicar selecionados
                </CardButton>
              ) : (
                <CardButton
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={bulkBusy}
                  onClick={() => void handleBulkRestore()}
                >
                  Restaurar selecionados
                </CardButton>
              )}
              <CardButton
                type="button"
                variant="danger"
                size="sm"
                disabled={bulkBusy}
                onClick={() => void handleBulkDelete()}
              >
                {tab === "TRASH" ? "Excluir selecionados" : "Mover para lixeira"}
              </CardButton>
              <button
                type="button"
                disabled={bulkBusy}
                onClick={clearSelection}
                className="text-sm font-medium text-blue-800 underline-offset-2 hover:underline disabled:opacity-50"
              >
                Limpar seleção
              </button>
              {bulkBusy ? (
                <>
                  <span className="text-xs text-blue-700">
                    {Object.values(publishingById).some(Boolean)
                      ? "A publicar em sequência (10 s entre cada)…"
                      : Object.values(restoringById).some(Boolean)
                        ? "A restaurar…"
                        : "A processar…"}
                  </span>
                  {Object.values(publishingById).some(Boolean) ? (
                    <button
                      type="button"
                      onClick={() => {
                        bulkPublishCancelRef.current = true;
                      }}
                      className="text-xs font-medium text-red-700 underline-offset-2 hover:underline"
                    >
                      Cancelar publicação
                    </button>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
              {tab === "PUBLISHED"
                ? "Nenhum imóvel publicado."
                : tab === "HIDDEN"
                  ? "Nenhum imóvel oculto."
                  : "A lixeira está vazia."}
            </p>
          ) : (
            <PartnerHousesList
              rows={filtered}
              tab={tab}
              publishingById={publishingById}
              deletingById={deletingById}
              restoringById={restoringById}
              selection={selection}
              bulkBusy={bulkBusy}
              onPublish={(house) => {
                if (bulkBusy || Object.values(publishingById).some(Boolean)) return;
                setPublishHouse(house);
              }}
              onEdit={(id) => {
                setEditHouseId(id);
                setShowHouseModal(true);
              }}
              onTrash={handleTrashHouse}
              onRestore={handleRestoreHouse}
              onDeleteForever={handleDeleteForever}
            />
          )}
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
        onUnpublish={handleUnpublish}
      />

      <PublishHousesBulkConfirmModal
        open={bulkPublishHouses != null}
        houses={bulkPublishHouses ?? []}
        balanceEurCents={balanceEurCents}
        publishDelayMs={BULK_PUBLISH_DELAY_MS}
        onClose={() => setBulkPublishHouses(null)}
        onConfirm={handleBulkPublishConfirm}
      />
    </div>
  );
}

