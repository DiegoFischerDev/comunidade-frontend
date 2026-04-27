import { notFound } from 'next/navigation';
import { CatalogCarousel } from '@/components/CatalogCarousel';
import { PartnerServicePriceCallout } from '@/components/PartnerServicePriceCallout';
import { RelocationHouseCard } from '@/components/relocation/RelocationHouseCard';
import type { RelocationHouseRow } from '@/components/relocation/relocation-house-shared';
import { CardLinkButton } from '@/components/ui/CardButton';
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

async function fetchRelocationHousesForPartner(
  partnerId: string,
): Promise<RelocationHouseRow[]> {
  const res = await fetch(
    `${API_URL}/partners/relocation/houses?partnerId=${encodeURIComponent(partnerId)}`,
    { cache: 'no-store' },
  );
  if (!res.ok) {
    return [];
  }
  const data = (await res.json()) as RelocationHouseRow[];
  return Array.isArray(data) ? data : [];
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
    `${partner.name} é parceiro da Comunidade Rafa Portugal na categoria ${categoryName}.`;

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
    keywords: [partner.name, categoryName, 'Portugal', 'Comunidade Rafa Portugal', 'imigração'],
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
      siteName: 'Comunidade Rafa Portugal',
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
  const relocationHouses: RelocationHouseRow[] =
    partner.category?.slug === 'relocation'
      ? await fetchRelocationHousesForPartner(id)
      : [];

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
            <div className="shrink-0">
              <img
                src={logoSrc}
                alt={partner.name}
                className="h-32 w-32 object-contain drop-shadow-lg sm:h-40 sm:w-40"
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
            <div className="mt-5 flex justify-center sm:justify-start">
              <CardLinkButton
                href={`/dashboard/partner/${partner.id}`}
                variant="outline"
                className="px-5 py-2.5 shadow-sm"
              >
                Entre em contato
              </CardLinkButton>
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
                className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <h3 className="text-base font-semibold tracking-tight text-zinc-900 sm:text-lg">
                  {service.title}
                </h3>
                {service.description && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-700">
                    {service.description}
                  </p>
                )}
                <PartnerServicePriceCallout
                  price={service.price}
                  priceOnRequest={service.priceOnRequest}
                />
                <div className="mt-4 flex flex-col items-stretch gap-3 sm:items-end">
                  <CardLinkButton
                    href={`/dashboard/partner/${partner.id}`}
                    variant="primary"
                    className="w-full min-w-0 sm:w-auto"
                  >
                    Contactar
                  </CardLinkButton>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {partner.category?.slug === 'relocation' && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            Imóveis
          </h2>
          {relocationHouses.length === 0 ? (
            <p className="text-sm text-zinc-600">
              Ainda não há imóveis publicados por este parceiro.
            </p>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {relocationHouses.map((h) => (
                  <RelocationHouseCard key={h.id} house={h} showContactButton={false} />
                ))}
              </div>
              <div className="flex justify-center pt-1">
                <CardLinkButton
                  href={`/dashboard/relocation/imoveis?parceiro=${encodeURIComponent(partner.id)}`}
                  variant="primary"
                  className="min-w-[14rem] shadow-sm"
                >
                  Ver todos os imóveis
                </CardLinkButton>
              </div>
            </>
          )}
        </section>
      )}

      <PartnerCommentsSection
        partnerId={partner.id}
        partnerName={partner.name}
        readOnly
      />
    </div>
  );
}

