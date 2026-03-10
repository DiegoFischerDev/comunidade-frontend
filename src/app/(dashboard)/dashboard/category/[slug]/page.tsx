'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';

type CategoryWithPartners = {
  id: string;
  slug: string;
  name: string;
  partners: {
    id: string;
    name: string;
    logoUrl: string | null;
    shortDescription: string | null;
  }[];
};

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const [categories, setCategories] = useState<CategoryWithPartners[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">
        {category.name}
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Parceiros desta categoria.
      </p>

      {category.partners.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          Ainda não há parceiros nesta categoria.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {category.partners.map((partner) => (
            <div
              key={partner.id}
              className="flex flex-col rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
            >
              {partner.logoUrl && (
                <div className="mb-3 flex justify-center">
                  {/* poderia ser <Image>, mas mantemos simples */}
                  <img
                    src={partner.logoUrl}
                    alt={partner.name}
                    className="h-12 object-contain"
                  />
                </div>
              )}
              <h2 className="text-base font-semibold text-zinc-900">
                {partner.name}
              </h2>
              {partner.shortDescription && (
                <p className="mt-1 text-sm text-zinc-600 line-clamp-3">
                  {partner.shortDescription}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

