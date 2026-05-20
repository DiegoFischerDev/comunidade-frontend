"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { RecommendedServiceCard } from "@/components/relocation/RecommendedServiceCard";

type ServiceRow = Awaited<ReturnType<typeof api.recommendedServices.list>>[number];

export default function RelocationServicosPage() {
  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError("");
      try {
        const data = await api.recommendedServices.list();
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erro ao carregar serviços.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-10">
      <header className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-800/90">
          Relocation Portugal
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Serviços que indico
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 sm:text-base">
          Parceiros de confiança para não cair em golpes.
        </p>
      </header>

      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100"
            />
          ))}
        </div>
      ) : error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-8 text-center text-sm text-zinc-600">
          Ainda não há serviços publicados.
        </p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => (
            <RecommendedServiceCard
              key={s.id}
              service={{
                id: s.id,
                title: s.title,
                cardImageUrl: s.cardImageUrl,
                redirectPath: s.redirectPath,
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
