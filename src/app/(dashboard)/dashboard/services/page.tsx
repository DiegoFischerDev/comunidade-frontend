'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string;
  fullDescription?: string;
};

export default function ServicesDashboardPage() {
  const [categories, setCategories] = useState<CategoryRow[] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await api.marketplace.categoriesWithPartners();
        setCategories(
          data.map((c) => ({
            id: c.id,
            slug: c.slug,
            name: c.name,
            shortDescription: c.shortDescription,
            fullDescription: c.fullDescription,
          })),
        );
      } catch {
        setCategories([]);
      }
    })();
  }, []);

  const sorted = useMemo(() => {
    if (!categories) return null;
    return [...categories].sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'));
  }, [categories]);

  return (
    <div className="mx-auto w-full max-w-[900px] space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Nosso time de confiança</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Aqui encontras os serviços que a Comunidade Rafa Portugal confia e recomenda. Estamos
          sempre à procura de novos parceiros para oferecer à nossa comunidade as
          melhores soluções, e os menores preços.
        </p>
      </div>

      <div className="space-y-3">
        {sorted === null ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
            A carregar categorias…
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
            Ainda não há categorias disponíveis.
          </div>
        ) : (
          sorted.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/category/${c.slug}`}
              className="group flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-zinc-900">{c.name}</p>
                {c.shortDescription ? (
                  <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{c.shortDescription}</p>
                ) : null}
              </div>
              <span
                className="shrink-0 text-xl text-zinc-400 transition group-hover:text-zinc-600"
                aria-hidden
              >
                ›
              </span>
            </Link>
          ))
        )}
      </div>

    </div>
  );
}

