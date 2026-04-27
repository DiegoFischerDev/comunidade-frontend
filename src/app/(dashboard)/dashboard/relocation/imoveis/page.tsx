"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { RelocationHouseCard } from "@/components/relocation/RelocationHouseCard";
import {
  RELOCATION_CITY_LABELS,
  RELOCATION_CITY_OPTIONS,
  RELOCATION_TYPOLOGY_LABELS,
  RELOCATION_TYPOLOGY_OPTIONS,
  type RelocationHouseRow,
} from "@/components/relocation/relocation-house-shared";
import { CardLinkButton } from "@/components/ui/CardButton";
import { api } from "@/lib/api";

type RelocationPartner = {
  id: string;
  name: string;
};

export default function RelocationHousesListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<RelocationHouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [partners, setPartners] = useState<RelocationPartner[]>([]);

  const parceiro = searchParams.get("parceiro")?.trim() ?? "";
  const cidade = searchParams.get("cidade")?.trim() ?? "";
  const tipologia = searchParams.get("tipologia")?.trim() ?? "";

  const setRouteFilters = useCallback(
    (next: { parceiro?: string; cidade?: string; tipologia?: string }) => {
      const q = new URLSearchParams(searchParams.toString());
      const p = next.parceiro !== undefined ? next.parceiro : parceiro;
      const c = next.cidade !== undefined ? next.cidade : cidade;
      const t = next.tipologia !== undefined ? next.tipologia : tipologia;
      if (p) q.set("parceiro", p);
      else q.delete("parceiro");
      if (c) q.set("cidade", c);
      else q.delete("cidade");
      if (t) q.set("tipologia", t);
      else q.delete("tipologia");
      const s = q.toString();
      router.replace(`/dashboard/relocation/imoveis${s ? `?${s}` : ""}`);
    },
    [searchParams, router, parceiro, cidade, tipologia],
  );

  useEffect(() => {
    (async () => {
      try {
        const data = await api.marketplace.categoriesWithPartners();
        const rel = data.find((c) => c.slug === "relocation");
        setPartners(
          (rel?.partners ?? []).map((p) => ({ id: p.id, name: p.name })),
        );
      } catch {
        setPartners([]);
      }
    })();
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");
    (async () => {
      try {
        const data = await api.marketplace.relocationHouses({
          partnerId: parceiro || undefined,
          city: cidade || undefined,
          typology: tipologia || undefined,
        });
        setRows(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar imóveis.",
        );
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [parceiro, cidade, tipologia]);

  const filterBar = useMemo(
    () => (
      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-end sm:gap-4">
        <div className="min-w-0 flex-1">
          <label
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500"
            htmlFor="filter-parceiro"
          >
            Parceiro relocation
          </label>
          <select
            id="filter-parceiro"
            value={parceiro}
            onChange={(e) =>
              setRouteFilters({ parceiro: e.target.value, cidade, tipologia })
            }
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">Todos</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-1">
          <label
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500"
            htmlFor="filter-cidade"
          >
            Cidade
          </label>
          <select
            id="filter-cidade"
            value={cidade}
            onChange={(e) =>
              setRouteFilters({ parceiro, cidade: e.target.value, tipologia })
            }
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">Todas</option>
            {RELOCATION_CITY_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {RELOCATION_CITY_LABELS[key] ?? key}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0 flex-1">
          <label
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500"
            htmlFor="filter-tipologia"
          >
            Tipologia
          </label>
          <select
            id="filter-tipologia"
            value={tipologia}
            onChange={(e) =>
              setRouteFilters({ parceiro, cidade, tipologia: e.target.value })
            }
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">Todas</option>
            {RELOCATION_TYPOLOGY_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {RELOCATION_TYPOLOGY_LABELS[key] ?? key}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() =>
            router.replace("/dashboard/relocation/imoveis")
          }
          className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
        >
          Limpar filtros
        </button>
      </div>
    ),
    [parceiro, cidade, tipologia, partners, setRouteFilters, router],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardLinkButton
          href="/dashboard/relocation"
          variant="primary"
          className="w-fit shadow-sm"
        >
          <span className="opacity-90" aria-hidden>
            ←
          </span>
          Relocation
        </CardLinkButton>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
          Todos os imóveis
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Encontre o imóvel perfeito e conte com nosso suporte para fechar o contrato direto com o senhorio, sem burocracia.
        </p>
      </div>

      {filterBar}

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-600">A carregar imóveis…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-600">
          Nenhum imóvel com estes critérios. Tente alargar os filtros.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((h) => (
            <RelocationHouseCard key={h.id} house={h} />
          ))}
        </div>
      )}
    </div>
  );
}
