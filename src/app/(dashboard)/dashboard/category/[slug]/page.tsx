'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

type CategoryWithPartners = {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string;
  fullDescription?: string;
  backgroundImageUrl?: string;
  partners: {
    id: string;
    name: string;
    logoUrl: string | null;
    backgroundImageUrl: string | null;
    shortDescription: string | null;
  }[];
};

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const [categories, setCategories] = useState<CategoryWithPartners[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    (async () => {
      try {
        const data = await api.marketplace.categoriesWithPartners();
        setCategories(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar categorias e parceiros.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const category = categories.find((c) => c.slug === params.slug);

  if (loading) {
    return <p className="text-sm text-zinc-600">Carregando categoria…</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!category) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Categoria não encontrada
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Esta categoria pode não existir ou não ter parceiros associados ainda.
        </p>
      </div>
    );
  }

  const heroBg =
    category.backgroundImageUrl &&
    (category.backgroundImageUrl.startsWith('/uploads/')
      ? `${API_URL}${category.backgroundImageUrl}`
      : category.backgroundImageUrl);

  return (
    <div className="space-y-8">
      {/* Hero da categoria */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        {heroBg && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40"
            style={{ backgroundImage: `url(${heroBg})` }}
          />
        )}
        <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-xs uppercase tracking-wide text-blue-100">
            Categoria
          </p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
            {category.name}
          </h1>
          {(category.fullDescription || category.shortDescription) && (
            <p className="mt-3 max-w-2xl text-sm text-blue-50 sm:text-base">
              {category.fullDescription || category.shortDescription}
            </p>
          )}
        </div>
      </section>

      {category.partners.length === 0 ? (
        <p className="text-sm text-zinc-500">
          Ainda não há parceiros nesta categoria.
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {category.partners.map((partner) => {
            const partnerBg =
              partner.backgroundImageUrl &&
              (partner.backgroundImageUrl.startsWith('/uploads/')
                ? `${API_URL}${partner.backgroundImageUrl}`
                : partner.backgroundImageUrl);
            const partnerLogo =
              partner.logoUrl &&
              (partner.logoUrl.startsWith('/uploads/')
                ? `${API_URL}${partner.logoUrl}`
                : partner.logoUrl);
            return (
              <Link
                key={partner.id}
                href={`/dashboard/partner/${partner.id}`}
                className="group mx-auto flex w-full max-w-[320px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-r from-zinc-100 to-zinc-200">
                  {partnerBg && (
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${partnerBg})` }}
                    />
                  )}
                  <div className="relative z-10 flex h-full flex-col justify-end gap-2 bg-gradient-to-t from-black/50 via-black/10 to-transparent px-4 pb-3">
                    {partnerLogo ? (
                      <div className="relative h-11 w-11 overflow-hidden rounded-xl border border-white/70 bg-white shadow-md">
                        <Image
                          src={partnerLogo}
                          alt=""
                          fill
                          className="object-contain p-2"
                          sizes="44px"
                        />
                      </div>
                    ) : null}
                    <h2 className="text-sm font-semibold text-white drop-shadow">
                      {partner.name}
                    </h2>
                  </div>
                </div>
                {partner.shortDescription && (
                  <p className="whitespace-pre-line px-4 pb-4 pt-3 text-sm leading-relaxed text-zinc-600">
                    {partner.shortDescription}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

