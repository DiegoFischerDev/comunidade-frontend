'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import {
  isFrontendOnlyMarketplaceCategorySlug,
  mergeMarketplaceCategoriesWithPartners,
} from '@/lib/marketplace-local-categories';
import { PartnerEngagementBar } from '@/components/PartnerEngagementBar';
import { CardLinkButton } from '@/components/ui/CardButton';
import { getPublicSiteUrl } from '@/lib/site-url';
import { useAuth } from '@/contexts/AuthContext';
import { OPEN_MEMBERSHIP_MODAL_EVENT } from '@/components/FloatingWhatsAppButton';

const WISE_INVITE_URL = 'https://wise.com/invite/ihpc/diegof949';
const BANK_ASSIST_WHATSAPP_HREF =
  'https://wa.me/351924214880?text=' +
  encodeURIComponent(
    'Olá! Venho pela Comunidade Rafa Portugal e gostaria de ajuda gratuita para abrir conta em Portugal.',
  );

function AberturaDeContaServiceCards() {
  const { user } = useAuth();
  const isVipMember = user?.tier === 'MEMBER';

  return (
    <div className="mx-auto grid w-full max-w-lg gap-4 sm:max-w-xl md:max-w-[42rem] md:grid-cols-2 md:gap-3">
      <article className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:border-emerald-200 hover:shadow-md md:max-w-none">
        <div className="relative h-36 w-full bg-gradient-to-br from-[#9fe870]/35 via-white to-[#163300]/10 sm:h-40 md:h-28">
          <Image
            src="/card_wise.png"
            alt="Cartão Wise"
            fill
            className="object-contain p-4 md:p-3"
            sizes="(max-width: 768px) 100vw, 384px"
          />
        </div>
        <div className="flex flex-1 flex-col gap-2 border-t border-zinc-100 p-3.5 md:gap-2 md:p-3">
          <h2 className="text-base font-semibold text-zinc-900">Conta Wise</h2>
          <p className="text-xs leading-relaxed text-zinc-600 md:text-[13px]">
            Wise é uma das formas mais baratas de converter reais para euros.{' '}
            <span className="font-semibold text-zinc-800">UMA DICA IMPORTANTE:</span> após abrir a conta, transforma a
            conta Wise numa conta de investimento ativando o «Rende+». Assim, além de o saldo render todos os meses,
            também pagas menos IOF nas conversões.
          </p>
          <a
            href={WISE_INVITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto inline-flex w-full items-center justify-center rounded-lg bg-[#163300] px-3 py-2 text-xs font-semibold text-[#9fe870] transition hover:bg-[#112400] md:py-2 md:text-sm"
          >
            Abrir conta na Wise (convite)
          </a>
        </div>
      </article>

      <article className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:border-amber-200/80 hover:shadow-md md:max-w-none">
        <div className="relative h-36 w-full bg-[#39ff14]/15 sm:h-40 md:h-28">
          <Image
            src="/iban.png"
            alt="Conta bancária com IBAN em Portugal"
            fill
            className="object-contain p-4 md:p-3"
            sizes="(max-width: 768px) 100vw, 384px"
          />
        </div>
        <div className="flex flex-1 flex-col gap-2 border-t border-zinc-100 p-3.5 md:gap-2 md:p-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 className="text-base font-semibold text-zinc-900">Banco em Portugal (IBAN)</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-950 md:text-xs">
              <Image src="/icon_vip.png" alt="" width={16} height={16} className="h-4 w-4 object-contain" />
              Membro VIP
            </span>
          </div>
          <p className="text-xs leading-relaxed text-zinc-600 md:text-[13px]">
            Assessoria gratuita para{' '}
            <span className="font-medium text-zinc-800">brasileiros</span> que querem abrir conta em banco de Portugal e
            obter IBAN.
          </p>
          {isVipMember ? (
            <a
              href={BANK_ASSIST_WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 md:text-sm"
            >
              Pedir ajuda no WhatsApp
            </a>
          ) : (
            <div className="mt-auto space-y-2 rounded-lg border border-dashed border-amber-300 bg-amber-50/80 p-3 md:p-2.5">
              <p className="text-xs text-amber-950 md:text-[13px]">
                O contacto para esta assessoria gratuita está disponível apenas para{' '}
                <span className="font-semibold">Membros VIP</span>.
              </p>
              <button
                type="button"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent(OPEN_MEMBERSHIP_MODAL_EVENT))
                }
                className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-3 py-2 text-xs font-semibold text-white transition hover:opacity-95 md:text-sm"
              >
                Tornar-me Membro VIP
              </button>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}

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
    if (params.slug === 'relocation') {
      router.replace('/relocation/imoveis');
    }
  }, [params.slug, router]);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.marketplace.categoriesWithPartners();
        setCategories(mergeMarketplaceCategoriesWithPartners(data));
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
          href="/dashboard"
          variant="primary"
          className="shadow-sm"
        >
          <span className="opacity-90" aria-hidden>
            ←
          </span>
          Início
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
        isFrontendOnlyMarketplaceCategorySlug(category.slug) ? (
          category.slug === 'abertura-de-conta' ? (
            <AberturaDeContaServiceCards />
          ) : (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-5 py-6 text-sm leading-relaxed text-zinc-800 shadow-sm">
              <p className="font-semibold text-emerald-950">Serviço da comunidade</p>
              <p className="mt-2">
                {category.fullDescription ||
                  category.shortDescription ||
                  'Assistência gratuita para abertura de conta na Wise e conta bancária em Portugal (IBAN).'}
              </p>
              <p className="mt-3 text-zinc-600">
                Este apoio não passa por parceiros na plataforma: segue as orientações partilhadas na comunidade ou
                contacta a equipa pelo WhatsApp se precisares de ajuda.
              </p>
            </div>
          )
        ) : (
          <p className="text-sm text-zinc-500">Ainda não há parceiros nesta categoria.</p>
        )
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

