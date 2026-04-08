'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { CardLinkButton } from '@/components/ui/CardButton';

type CategoryRow = { id: string; slug: string; name: string };

export default function ServicosDashboardPage() {
  const [categories, setCategories] = useState<CategoryRow[] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await api.marketplace.categoriesWithPartners();
        setCategories(data.map((c) => ({ id: c.id, slug: c.slug, name: c.name })));
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
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-50">
            <Image src="/services.png" alt="" fill className="object-contain" sizes="56px" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-zinc-900">Serviços</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Escolhe uma categoria para ver parceiros e serviços disponíveis.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sorted === null ? (
          <div className="col-span-full rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
            A carregar categorias…
          </div>
        ) : sorted.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
            Ainda não há categorias disponíveis.
          </div>
        ) : (
          sorted.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/category/${c.slug}`}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors hover:bg-zinc-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-zinc-900">{c.name}</p>
                  <p className="mt-1 text-sm text-zinc-600">Ver parceiros</p>
                </div>
                <span className="shrink-0 text-sm font-medium text-zinc-500">→</span>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="flex">
        <CardLinkButton href="/dashboard" variant="secondary">
          Voltar ao início
        </CardLinkButton>
      </div>
    </div>
  );
}

