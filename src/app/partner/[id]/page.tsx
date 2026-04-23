import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { CatalogCarousel } from '@/components/CatalogCarousel';
import { PartnerEngagementBar } from '@/components/PartnerEngagementBar';
import { PartnerCommentsSection } from '@/components/PartnerCommentsSection';
import { getPublicSiteUrl } from '@/lib/site-url';

type PartnerService = {
  id: string;
  title: string;
  description: string | null;
  price: string | null;
  priceOnRequest: boolean;
};

type PartnerPublic = {
  id: string;
  name: string;
  whatsapp: string;
  logoUrl: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  backgroundImageUrl: string | null;
  catalogImageUrls?: string[];
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  services: PartnerService[];
};

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3001';

const SITE_URL = getPublicSiteUrl();

function absoluteOgImage(url: string | null | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const u = url.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  const base = API_URL.replace(/\/$/, '');
  if (u.startsWith('/uploads/')) return `${base}${u}`;
  return undefined;
}

async function fetchPartner(id: string): Promise<PartnerPublic> {
  const res = await fetch(`${API_URL}/partners/${id}/public`, {
    // Não cachear: alterações devem refletir imediatamente
    cache: 'no-store',
  });

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    throw new Error('Falha ao carregar parceiro.');
  }

  return res.json();
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const partner = await fetchPartner(id);

  const categoryName = partner.category?.name ?? 'Serviços';

  const serviceTitles = partner.services
    .map((s) => s.title)
    .filter(Boolean);
  const topServices = serviceTitles.slice(0, 3).join(', ');

  const title = `${partner.name} | ${categoryName}`;

  const baseDescription =
    partner.shortDescription ??
    `${partner.name} é parceiro da Comunidade RPM na categoria ${categoryName}.`;

  const servicesSnippet =
    topServices.length > 0 ? ` Serviços: ${topServices}.` : '';

  const description = `${baseDescription}${servicesSnippet}`;

  const url = `/partner/${id}`;

  const ogUrl = absoluteOgImage(partner.logoUrl);
  const ogImages = ogUrl
    ? [{ url: ogUrl, width: 1200, height: 630, alt: partner.name }]
    : [];

  return {
    title,
    description,
    keywords: [partner.name, categoryName, 'Portugal', 'Comunidade RPM', 'imigração'],
    robots: { index: true, follow: true },
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      locale: 'pt_PT',
      siteName: 'Comunidade RPM',
      images: ogImages,
    },
    twitter: {
      card: ogImages.length > 0 ? 'summary_large_image' : 'summary',
      title,
      description,
      images: ogImages.length > 0 ? [ogImages[0].url] : [],
    },
  };
}

export const revalidate = 3600;

export default async function PartnerPublicPage({ params }: PageProps) {
  const { id } = await params;
  const partner = await fetchPartner(id);
  const visibleServices = partner.services;

  const heroBgImage =
    partner.backgroundImageUrl &&
    (partner.backgroundImageUrl.startsWith('/uploads/')
      ? `${API_URL}${partner.backgroundImageUrl}`
      : partner.backgroundImageUrl);

  const logoSrc =
    partner.logoUrl && partner.logoUrl.startsWith('/uploads/')
      ? `${API_URL}${partner.logoUrl}`
      : partner.logoUrl;

  const sharePageUrl = `${SITE_URL}/partner/${id}`;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-800 via-rose-900 to-red-950 text-white">
        {heroBgImage && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40"
              style={{ backgroundImage: `url(${heroBgImage})` }}
            />
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-red-900/35 via-red-950/65 to-red-950/92"
              aria-hidden
            />
          </>
        )}
        <div className="relative z-10 flex flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:px-10 sm:py-14">
          {logoSrc && (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/90 p-2 shadow-md sm:h-24 sm:w-24">
              <img
                src={logoSrc}
                alt={partner.name}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-wide text-red-100/95">
              {partner.category?.name ?? 'Parceiro'}
            </p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
              {partner.name}
            </h1>
            {partner.shortDescription && (
              <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-white/95 sm:text-base">
                {partner.shortDescription}
              </p>
            )}
            <div className="mt-5">
              <Link
                href={`/dashboard/partner/${partner.id}`}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-red-900 shadow-md ring-1 ring-white/50 transition hover:bg-red-50"
              >
                Entre em contato
              </Link>
            </div>
          </div>
        </div>
        <PartnerEngagementBar
          partnerId={partner.id}
          sharePageUrl={sharePageUrl}
          variant="hero"
          partnerName={partner.name}
          partnerLogoUrl={logoSrc}
          className="relative z-10 border-t border-white/20 bg-black/15 px-6 py-3 sm:px-10"
        />
      </section>

      {/* Descrição completa */}
      {partner.fullDescription && (
        <section>
          <h2 className="mb-3 text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            Sobre {partner.name}
          </h2>
          <p className="whitespace-pre-line text-base leading-relaxed text-zinc-700">
            {partner.fullDescription}
          </p>
        </section>
      )}

      {/* Carrossel de catálogo */}
      {partner.catalogImageUrls && partner.catalogImageUrls.length > 0 && (
        <section>
          <CatalogCarousel
            images={partner.catalogImageUrls}
            apiBaseUrl={API_URL}
          />
        </section>
      )}

      {/* Lista de serviços */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
          Serviços oferecidos
        </h2>
        {visibleServices.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Este parceiro ainda não cadastrou serviços.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visibleServices.map((service) => (
              <article
                key={service.id}
                className="relative flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 pb-[50px] shadow-sm"
              >
                <h3 className="text-base font-semibold tracking-tight text-zinc-900 sm:text-lg">
                  {service.title}
                </h3>
                {service.description && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-700">
                    {service.description}
                  </p>
                )}
                <div className="mt-2 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
                  <p>
                    Valor do serviço{' '}
                    {service.priceOnRequest
                      ? 'sob consulta.'
                      : service.price
                      ? `${service.price} €.`
                      : 'não informado.'}
                  </p>
                </div>
                <div className="absolute bottom-4 right-4 inline-flex items-center gap-2">
                  <Image
                    src="/euro2.png"
                    alt="Valor do serviço"
                    width={20}
                    height={20}
                  />
                  <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'black' }}>
                    {service.priceOnRequest
                      ? 'Sob consulta'
                      : service.price
                      ? `${service.price} €`
                      : '—'}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Call to action para autenticação */}
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-5 sm:px-6">
        <h2 className="text-lg font-semibold tracking-tight text-emerald-900 sm:text-xl">
          Quer falar com {partner.name}?
        </h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <a
            href={`/dashboard/partner/${partner.id}`}
            className="inline-flex cursor-pointer items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Entrar na comunidade
          </a>
        </div>
      </section>

      <PartnerCommentsSection partnerId={partner.id} partnerName={partner.name} />
    </div>
  );
}

