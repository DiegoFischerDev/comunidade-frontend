'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';

type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string;
  fullDescription?: string;
  backgroundImageUrl?: string;
};

export default function ServicesDashboardPage() {
  const [categories, setCategories] = useState<CategoryRow[] | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
            backgroundImageUrl: c.backgroundImageUrl,
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
        <h1 className="text-2xl font-semibold text-zinc-900">Serviços</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Aqui encontras os serviços que a Comunidade Rafa Portugal confia e recomenda. Estamos
          sempre à procura de novos parceiros para oferecer à nossa comunidade as
          melhores soluções, e os menores preços. Aqueles que sao membros VIP tem direito a desconto de 10€ em todos os serviços.
        </p>
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
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-colors hover:bg-zinc-50"
            >
              <div className="relative aspect-[16/9] w-full bg-zinc-100">
                {c.backgroundImageUrl ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                      backgroundImage: `url("${
                        c.backgroundImageUrl.startsWith('/uploads/')
                          ? `${API_URL}${c.backgroundImageUrl}`
                          : c.backgroundImageUrl
                      }")`,
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Image src="/services2.png" alt="" width={40} height={40} className="opacity-60" />
                  </div>
                )}
              </div>
              <div className="p-5">
                <p className="text-base font-semibold text-zinc-900">{c.name}</p>
                {c.shortDescription ? (
                  <p className="mt-1 line-clamp-3 text-sm text-zinc-600">{c.shortDescription}</p>
                ) : (
                  <p className="mt-1 text-sm text-zinc-600">Ver parceiros e serviços</p>
                )}
              </div>
            </Link>
          ))
        )}
      </div>

    </div>
  );
}

