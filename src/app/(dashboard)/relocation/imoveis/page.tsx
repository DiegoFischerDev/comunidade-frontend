"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";

import { RelocationCityCombobox } from "@/components/relocation/RelocationCityCombobox";
import { RelocationHouseCard } from "@/components/relocation/RelocationHouseCard";
import {
  RELOCATION_BUSINESS_TYPE_LABELS,
  RELOCATION_BUSINESS_TYPE_OPTIONS,
  RELOCATION_TYPOLOGY_LABELS,
  RELOCATION_TYPOLOGY_OPTIONS,
  type RelocationHouseRow,
} from "@/components/relocation/relocation-house-shared";
import { CardLinkButton } from "@/components/ui/CardButton";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";

type RelocationPartner = {
  id: string;
  name: string;
};

const RELOCATION_IMOVEIS_PATH = "/relocation/imoveis";
const RELOCATION_HOUSES_WHATSAPP_GROUP_URL =
  "https://chat.whatsapp.com/Kt4ylOIU0qMBbtfHKlyvVt?mode=gi_t";

export default function RelocationHousesListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const isAdmin = !authLoading && user?.role === "ADMIN";
  const [rows, setRows] = useState<RelocationHouseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [partners, setPartners] = useState<RelocationPartner[]>([]);

  const parceiro = searchParams.get("parceiro")?.trim() ?? "";
  const cidade = searchParams.get("cidade")?.trim() ?? "";
  const tipologia = searchParams.get("tipologia")?.trim() ?? "";
  const finalidade = searchParams.get("finalidade")?.trim() ?? "";

  const setRouteFilters = useCallback(
    (next: { parceiro?: string; cidade?: string; tipologia?: string; finalidade?: string }) => {
      const q = new URLSearchParams(searchParams.toString());
      const p = next.parceiro !== undefined ? next.parceiro : parceiro;
      const c = next.cidade !== undefined ? next.cidade : cidade;
      const t = next.tipologia !== undefined ? next.tipologia : tipologia;
      const f = next.finalidade !== undefined ? next.finalidade : finalidade;
      if (p) q.set("parceiro", p);
      else q.delete("parceiro");
      if (c) q.set("cidade", c);
      else q.delete("cidade");
      if (t) q.set("tipologia", t);
      else q.delete("tipologia");
      if (f) q.set("finalidade", f);
      else q.delete("finalidade");
      const s = q.toString();
      router.replace(`${RELOCATION_IMOVEIS_PATH}${s ? `?${s}` : ""}`);
    },
    [searchParams, router, parceiro, cidade, tipologia, finalidade],
  );

  useEffect(() => {
    if (authLoading) return;
    if (user?.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!isAdmin) return;
    void (async () => {
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
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      setRows([]);
      return;
    }
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const data = await api.marketplace.relocationHouses({
          partnerId: parceiro || undefined,
          city: cidade || undefined,
          typology: tipologia || undefined,
          businessType: (finalidade as "RENT" | "SALE") || undefined,
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
  }, [isAdmin, parceiro, cidade, tipologia, finalidade]);

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
              setRouteFilters({ parceiro: e.target.value, cidade, tipologia, finalidade })
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
          <RelocationCityCombobox
            id="filter-cidade"
            label="Cidade"
            value={cidade}
            onChange={(next) =>
              setRouteFilters({ parceiro, cidade: next, tipologia, finalidade })
            }
            allowEmpty
            emptyLabel="Todas"
            variant="amber"
          />
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
              setRouteFilters({ parceiro, cidade, tipologia: e.target.value, finalidade })
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
        <div className="min-w-0 flex-1">
          <label
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500"
            htmlFor="filter-finalidade"
          >
            Finalidade
          </label>
          <select
            id="filter-finalidade"
            value={finalidade}
            onChange={(e) =>
              setRouteFilters({ parceiro, cidade, tipologia, finalidade: e.target.value })
            }
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="">Todas</option>
            {RELOCATION_BUSINESS_TYPE_OPTIONS.map((key) => (
              <option key={key} value={key}>
                {RELOCATION_BUSINESS_TYPE_LABELS[key] ?? key}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => router.replace(RELOCATION_IMOVEIS_PATH)}
          className="shrink-0 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
        >
          Limpar filtros
        </button>
      </div>
    ),
    [parceiro, cidade, tipologia, finalidade, partners, setRouteFilters, router],
  );

  const featuredRows = useMemo(
    () => rows.filter((h) => h.featured).slice(0, 3),
    [rows],
  );
  const regularRows = useMemo(() => {
    if (featuredRows.length === 0) return rows;
    const ids = new Set(featuredRows.map((h) => h.id));
    return rows.filter((h) => !ids.has(h.id));
  }, [rows, featuredRows]);

  if (authLoading) {
    return (
      <div className="p-6 text-sm text-zinc-600" role="status">
        A carregar…
      </div>
    );
  }

  if (user?.role !== "ADMIN") {
    return (
      <div className="p-6 text-sm text-zinc-600" role="status">
        Acesso reservado a administradores. A redirecionar…
      </div>
    );
  }

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

      <section className="rounded-2xl border border-zinc-200 bg-white px-4 py-4 shadow-sm sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <Image src="/whatsapp.png" alt="" width={24} height={24} className="h-6 w-6 object-contain" />
              Grupo WhatsApp de imóveis
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              Receba em primeira mão oportunidades de arrendamento e novidades de relocation em Portugal.
            </p>
          </div>
          <a
            href={RELOCATION_HOUSES_WHATSAPP_GROUP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 sm:w-auto"
          >
            Entrar no grupo
          </a>
        </div>
      </section>

      {filterBar}

      {!loading && featuredRows.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-900">
              Destaque
            </span>
            <h2 className="text-lg font-semibold text-zinc-900">Imóveis em destaque</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredRows.map((h) => (
              <RelocationHouseCard key={`featured-${h.id}`} house={h} />
            ))}
          </div>
        </section>
      ) : null}

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-600">A carregar imóveis…</p>
      ) : regularRows.length === 0 ? (
        <p className="text-sm text-zinc-600">
          Nenhum imóvel com estes critérios. Tente alargar os filtros.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {regularRows.map((h) => (
            <RelocationHouseCard key={h.id} house={h} />
          ))}
        </div>
      )}
    </div>
  );
}
