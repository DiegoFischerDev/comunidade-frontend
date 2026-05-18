"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

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
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
          Serviços que indico
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Parceiros de confiança para imigrar com tranquilidade.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">A carregar…</p>
      ) : error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-zinc-600">Ainda não há serviços publicados.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((s) => (
            <li key={s.id}>
              <Link
                href={s.redirectPath}
                className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-4 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-zinc-900">{s.title}</p>
                  {s.linkTitle !== s.title ? (
                    <p className="mt-0.5 truncate text-xs text-zinc-500">{s.linkTitle}</p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full bg-gradient-to-r from-[#1a4d2e] to-[#7cb518] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white">
                  Contactar
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
