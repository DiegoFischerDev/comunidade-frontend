'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  isFrontendOnlyMarketplaceCategorySlug,
  prependLocalMarketplaceCategories,
} from '@/lib/marketplace-local-categories';

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
        const mapped = data.map((c) => ({
          id: c.id,
          slug: c.slug,
          name: c.name,
          shortDescription: c.shortDescription,
          fullDescription: c.fullDescription,
        }));
        setCategories(prependLocalMarketplaceCategories(mapped));
      } catch {
        setCategories([]);
      }
    })();
  }, []);

  /** Categorias só-front primeiro (ordem fixa); restantes por nome. */
  const sorted = useMemo(() => {
    if (!categories) return null;
    const locals = categories.filter((c) => isFrontendOnlyMarketplaceCategorySlug(c.slug));
    const rest = categories
      .filter((c) => !isFrontendOnlyMarketplaceCategorySlug(c.slug))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-PT'));
    return [...locals, ...rest];
  }, [categories]);

  return (
    <div className="mx-auto w-full max-w-[980px] space-y-6">
      <div className="overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-[#fff9ee] via-white to-white p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-100/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
          Parceiros verificados
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-zinc-900 sm:text-3xl">Serviços da comunidade</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 sm:text-base">
          Aqui encontras os serviços que a Comunidade Rafa Portugal confia e recomenda. Estamos sempre à procura de
          novos parceiros para oferecer as melhores soluções e os menores preços.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {sorted === null ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm sm:col-span-2">
            A carregar categorias…
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm sm:col-span-2">
            Ainda não há categorias disponíveis.
          </div>
        ) : (
          sorted.map((c, index) => (
            <Link
              key={c.id}
              href={`/dashboard/category/${c.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
            >
              <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-bl-full bg-gradient-to-br from-amber-100/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative flex min-w-0 items-start gap-3">
                <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-600 transition group-hover:bg-amber-100 group-hover:text-amber-900">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-zinc-900">{c.name}</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                    {(c.shortDescription?.trim() || c.fullDescription?.trim() || 'Sem descrição no momento.').slice(
                      0,
                      220,
                    )}
                  </p>
                  <span className="mt-3 inline-flex items-center text-sm font-medium text-amber-800">
                    {isFrontendOnlyMarketplaceCategorySlug(c.slug) ? 'Saber mais' : 'Ver parceiros'}
                    <span className="ml-1 transition-transform group-hover:translate-x-0.5" aria-hidden>
                      →
                    </span>
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

    </div>
  );
}

