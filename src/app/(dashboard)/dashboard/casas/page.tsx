"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AddHouseModal } from "@/components/house/AddHouseModal";
import { isActivePublished } from "@/components/house/HousePublicationStatusBadge";
import { AddAdvertisingBalanceModal } from "@/components/house/AddAdvertisingBalanceModal";
import { AdvertisingBalanceCard } from "@/components/house/AdvertisingBalanceCard";
import { PartnerHousesList } from "@/components/house/PartnerHousesList";
import { PublishHouseConfirmModal } from "@/components/house/PublishHouseConfirmModal";
import { api } from "@/lib/api";
import { formatHouseEntradaShort, formatHouseEntradaWithTotal } from "@/lib/house-entrance";
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
    const list = q
      ? rows.filter((r) => {
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
      : rows;

    return [...list].sort((a, b) => {
      const aPublished = isActivePublished(a.publicationStatus, a.publishedUntil) ? 1 : 0;
      const bPublished = isActivePublished(b.publicationStatus, b.publishedUntil) ? 1 : 0;
      if (bPublished !== aPublished) return bPublished - aPublished;
      return b.houseId - a.houseId;
    });
  }, [rows, filter]);

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
          <div className="mt-6 flex items-end gap-3">
            <div className="min-w-0 flex-1 max-w-md">
              <label className="block text-xs font-medium text-zinc-700">Filtrar</label>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Pesquisar por Id, título, cidade, tipologia, preço…"
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="ml-auto shrink-0">
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

          <PartnerHousesList
            rows={filtered}
            publishingById={publishingById}
            deletingById={deletingById}
            onPublish={(house) => {
              if (Object.values(publishingById).some(Boolean)) return;
              setPublishHouse(house);
            }}
            onEdit={(id) => {
              setEditHouseId(id);
              setShowHouseModal(true);
            }}
            onDelete={handleDeleteHouse}
          />
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
    </div>
  );
}

