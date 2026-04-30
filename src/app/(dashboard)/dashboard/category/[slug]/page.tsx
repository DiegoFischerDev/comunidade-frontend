'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PartnerEngagementBar } from '@/components/PartnerEngagementBar';
import { CardLinkButton } from '@/components/ui/CardButton';
import { getPublicSiteUrl } from '@/lib/site-url';
import { useAuth } from '@/contexts/AuthContext';
import { OPEN_MEMBERSHIP_MODAL_EVENT } from '@/components/FloatingWhatsAppButton';
import { OPEN_AUTH_LOGIN_EVENT } from '@/lib/auth-ui-events';

type PartnerService = {
  id: string;
  title: string;
  price: string | null;
  priceOnRequest: boolean;
};

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
    engagement: {
      likeCount: number;
      dislikeCount: number;
      commentCount: number;
      shareCount: number;
    };
  }[];
};

export default function CategoryPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [categories, setCategories] = useState<CategoryWithPartners[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [partnerServicesById, setPartnerServicesById] = useState<
    Record<string, PartnerService[] | undefined>
  >({});

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const siteBase = getPublicSiteUrl();

  useEffect(() => {
    if (user?.tier === 'MEMBER') return;
    if (!user) {
      window.dispatchEvent(new Event(OPEN_AUTH_LOGIN_EVENT));
      router.replace('/dashboard/services');
      return;
    }
    window.dispatchEvent(new Event(OPEN_MEMBERSHIP_MODAL_EVENT));
    router.replace('/dashboard/services');
  }, [user, router]);

  useEffect(() => {
    if (params.slug === 'relocation') {
      router.replace('/dashboard/relocation');
    }
  }, [params.slug, router]);

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

  // Se a categoria tiver apenas um parceiro, não há necessidade de mostrar esta página.
  useEffect(() => {
    if (!category) return;
    if (category.partners.length !== 1) return;
    const only = category.partners[0];
    if (!only?.id) return;
    router.replace(`/dashboard/partner/${only.id}`);
  }, [category, router]);

  useEffect(() => {
    if (!category) return;
    let cancelled = false;

    (async () => {
      const ids = category.partners.map((p) => p.id);
      const missingIds = ids.filter((id) => partnerServicesById[id] === undefined);
      if (missingIds.length === 0) return;

      try {
        const results = await Promise.allSettled(
          missingIds.map(async (id) => {
            const details = await api.marketplace.partnerDetails(id);
            return { id, services: details.services as PartnerService[] };
          }),
        );

        if (cancelled) return;
        setPartnerServicesById((prev) => {
          const next = { ...prev };
          for (const r of results) {
            if (r.status === 'fulfilled') {
              next[r.value.id] = r.value.services;
            }
          }
          return next;
        });
      } catch {
        // silencioso: não bloqueia a lista de parceiros
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [category, partnerServicesById]);

  const formatServicePrice = (s: PartnerService) => {
    if (s.priceOnRequest) return 'Sob consulta';
    if (s.price) return `${s.price} €`;
    return '—';
  };

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

  if (category.partners.length === 1) {
    return <p className="text-sm text-zinc-600">A redirecionar para o parceiro…</p>;
  }

  const heroBg =
    category.backgroundImageUrl &&
    (category.backgroundImageUrl.startsWith('/uploads/')
      ? `${API_URL}${category.backgroundImageUrl}`
      : category.backgroundImageUrl);

  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <CardLinkButton
          href="/dashboard/services"
          variant="primary"
          className="shadow-sm"
        >
          <span className="opacity-90" aria-hidden>
            ←
          </span>
          Outros serviços
        </CardLinkButton>
      </div>

      {/* Hero da categoria */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#910001] to-[#5f0001] text-white">
        {heroBg && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40"
              style={{ backgroundImage: `url(${heroBg})` }}
            />
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[#5f0001]/40 via-[#3a0000]/70 to-[#0f0000]/95"
              aria-hidden
            />
          </>
        )}
        <div className="relative z-10 px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-xs uppercase tracking-wide text-amber-100/90">
            Categoria
          </p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
            {category.name}
          </h1>
          {(category.fullDescription || category.shortDescription) && (
            <p className="mt-3 max-w-2xl text-sm text-amber-50/90 sm:text-base">
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
              <div
                key={partner.id}
                className="group flex w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md"
              >
                <Link
                  href={`/dashboard/partner/${partner.id}`}
                  className="block"
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
                        <div className="relative h-20 w-20 shrink-0">
                          <Image
                            src={partnerLogo}
                            alt=""
                            fill
                            className="object-contain drop-shadow-lg"
                            sizes="80px"
                          />
                        </div>
                      ) : null}
                      <h2 className="text-sm font-semibold text-white drop-shadow">
                        {partner.name}
                      </h2>
                    </div>
                  </div>
                </Link>
                <div className="flex flex-1 flex-col px-4 pb-4 pt-3">
                  <Link
                    href={`/dashboard/partner/${partner.id}`}
                    className="block min-h-0 flex-1"
                  >
                    {partner.shortDescription ? (
                      <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600">
                        {partner.shortDescription}
                      </p>
                    ) : null}

                    {partnerServicesById[partner.id]?.length ? (
                      <div className="mt-3 space-y-1.5">
                        {partnerServicesById[partner.id]!.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-start justify-between gap-3 text-xs text-zinc-700"
                          >
                            <span className="min-w-0 flex-1 truncate">
                              {s.title}
                            </span>
                            <span className="shrink-0 font-semibold text-zinc-900">
                              {formatServicePrice(s)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </Link>
                  <PartnerEngagementBar
                    partnerId={partner.id}
                    sharePageUrl={`${siteBase}/partner/${partner.id}`}
                    variant="card"
                    initial={partner.engagement}
                    partnerName={partner.name}
                    partnerLogoUrl={typeof partnerLogo === 'string' ? partnerLogo : null}
                    className="mt-3 border-t border-zinc-100 pt-3"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

