"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { formatHouseEntradaShort } from "@/lib/house-entrance";
import { useAuth } from "@/contexts/AuthContext";
import { CardLinkButton } from "@/components/ui/CardButton";

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
  T1: "T1",
  T2: "T2",
  T3: "T3",
  T4: "T4",
  T5: "T5",
  QUARTO_AP_COMPARTILHADO: "Quarto em Ap compartilhado",
};

function formatDatePt(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pt-PT");
}

export default function PartnerHousesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<HouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [savingById, setSavingById] = useState<Record<string, boolean>>({});
  const [canManageHouses, setCanManageHouses] = useState<boolean | null>(null);
  const [showUpdatedBanner, setShowUpdatedBanner] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("updated") === "1") {
      setShowUpdatedBanner(true);
      router.replace("/dashboard/casas", { scroll: false });
    }
  }, [router]);

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
        const data = await api.partner.houses.list();
        if (!cancelled) setRows(data);
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
        r.title,
        r.city,
        CITY_LABELS[r.city] ?? "",
        r.typology,
        TYPOLOGY_LABELS[r.typology] ?? "",
        r.priceEur,
        r.relocationFeeEur,
        String(r.caucoesCount),
        String(r.rendasEntradaCount),
        formatHouseEntradaShort(r.caucoesCount, r.rendasEntradaCount),
        r.furnished ? "mobilado sim" : "mobilado não",
        r.status,
      ]
        .join(" ")
        .toLowerCase();
      return text.includes(q);
    });
  }, [rows, filter]);

  async function handleUpdateStatus(id: string, status: "AVAILABLE" | "UNAVAILABLE") {
    setSavingById((s) => ({ ...s, [id]: true }));
    try {
      const updated = await api.partner.houses.updateStatus(id, status);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: updated.status } : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar status.");
    } finally {
      setSavingById((s) => ({ ...s, [id]: false }));
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
            Aqui ficam guardadas as informações dos imóveis que publicaste no grupo do WhatsApp.
          </p>
        </div>
        <div className="shrink-0">
          <CardLinkButton href="/dashboard/casas/nova" variant="primary">
            Publicar imóvel
          </CardLinkButton>
        </div>
      </div>

      {showUpdatedBanner && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Imóvel atualizado. A mensagem no WhatsApp não foi reenviada.
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
            <Link
              href="/dashboard/casas/nova"
              className="inline-flex rounded-full bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2 text-sm font-semibold text-white"
            >
              Publicar o primeiro
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6">
            <label className="block text-xs font-medium text-zinc-700">Filtrar</label>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Pesquisar por título, cidade, tipologia, preço…"
              className="mt-1 w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Título</th>
                  <th className="px-4 py-3 text-left font-medium">Cidade</th>
                  <th className="px-4 py-3 text-left font-medium">Tipologia</th>
                  <th className="px-4 py-3 text-left font-medium">Mobilado</th>
                  <th className="px-4 py-3 text-left font-medium">Disponível em</th>
                  <th className="px-4 py-3 text-left font-medium">Preço</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Entrada (taxa relocation, cauções e rendas)
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-900">
                        {r.title}
                        {r.videoUrl ? (
                          <span className="ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-700">
                            Vídeo
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">
                        Enviado: {r.whatsappSentAt ? formatDatePt(r.whatsappSentAt) : "—"}
                        {r.whatsappError ? (
                          <span className="ml-2 text-red-600">Falha no WhatsApp</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{CITY_LABELS[r.city] ?? r.city}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      {TYPOLOGY_LABELS[r.typology] ?? r.typology}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{r.furnished ? "Sim" : "Não"}</td>
                    <td className="px-4 py-3 text-zinc-700">{formatDatePt(r.availableFrom)}</td>
                    <td className="px-4 py-3 text-zinc-700">{r.priceEur}</td>
                    <td className="px-4 py-3 text-zinc-700">
                      <div className="text-xs text-zinc-500">Taxa: {r.relocationFeeEur} €</div>
                      <div>{formatHouseEntradaShort(r.caucoesCount, r.rendasEntradaCount)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={r.status}
                        disabled={savingById[r.id]}
                        onChange={(e) =>
                          handleUpdateStatus(r.id, e.target.value as "AVAILABLE" | "UNAVAILABLE")
                        }
                        className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900"
                      >
                        <option value="AVAILABLE">Disponível</option>
                        <option value="UNAVAILABLE">Indisponível</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/casas/${r.id}/edit`}
                        className="text-sm font-medium text-blue-700 underline-offset-2 hover:underline"
                      >
                        Editar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

