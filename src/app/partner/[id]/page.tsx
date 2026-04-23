import { notFound } from 'next/navigation';
import Image from 'next/image';
import { CatalogCarousel } from '@/components/CatalogCarousel';
import { PartnerEngagementBar } from '@/components/PartnerEngagementBar';
import { PartnerCommentsSection } from '@/components/PartnerCommentsSection';
import { buildPartnerHeroWhatsAppUrl } from '@/lib/partner-whatsapp';
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

  const partnerWhatsappDigits = partner.whatsapp.replace(/\D/g, '');
  const heroWhatsappHref =
    partnerWhatsappDigits.length > 0
      ? buildPartnerHeroWhatsAppUrl(partner.whatsapp)
      : null;

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
            {heroWhatsappHref ? (
              <div className="mt-5">
                <a
                  href={heroWhatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-red-900 shadow-md ring-1 ring-white/50 transition hover:bg-red-50"
                >
                  <svg
                    className="h-5 w-5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="#25D366"
                    aria-hidden
                  >
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.123 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  Entre em contato
                </a>
              </div>
            ) : null}
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
        <>
          <h2 className="mb-3 text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
            Sobre {partner.name}
          </h2>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
            <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">
              {partner.fullDescription}
            </p>
          </section>
        </>
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
        <h2 className="text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">
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
        <p className="mt-1 text-sm text-emerald-900/80">
          Entre na Comunidade RPM para ver contactos, falar com o parceiro e
          registar o seu interesse nos serviços.
        </p>
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

