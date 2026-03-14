import { notFound } from 'next/navigation';
import { CatalogCarousel } from '@/components/CatalogCarousel';

type PartnerService = {
  id: string;
  title: string;
  description: string | null;
  price: string | null;
  priceOnRequest: boolean;
  commission: string | null;
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

async function fetchPartner(id: string): Promise<PartnerPublic> {
  const res = await fetch(`${API_URL}/partners/${id}/public`, {
    // Páginas de parceiros podem ser cacheadas e revalidadas periodicamente
    next: { revalidate: 3600 },
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

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export const revalidate = 3600;

export default async function PartnerPublicPage({ params }: PageProps) {
  const { id } = await params;
  const partner = await fetchPartner(id);

  const heroBgImage =
    partner.backgroundImageUrl &&
    (partner.backgroundImageUrl.startsWith('/uploads/')
      ? `${API_URL}${partner.backgroundImageUrl}`
      : partner.backgroundImageUrl);

  const logoSrc =
    partner.logoUrl && partner.logoUrl.startsWith('/uploads/')
      ? `${API_URL}${partner.logoUrl}`
      : partner.logoUrl;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        {heroBgImage && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40"
            style={{ backgroundImage: `url(${heroBgImage})` }}
          />
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
            <p className="text-xs uppercase tracking-wide text-emerald-100">
              {partner.category?.name ?? 'Parceiro'}
            </p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
              {partner.name}
            </h1>
            {partner.shortDescription && (
              <p className="mt-3 max-w-2xl text-sm text-emerald-50 sm:text-base">
                {partner.shortDescription}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Carrossel de catálogo */}
      {partner.catalogImageUrls && partner.catalogImageUrls.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900">Catálogo</h2>
          <CatalogCarousel
            images={partner.catalogImageUrls}
            apiBaseUrl={API_URL}
          />
        </section>
      )}

      {/* Descrição completa */}
      {partner.fullDescription && (
        <>
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">
            Sobre {partner.name}
          </h2>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
            <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">
              {partner.fullDescription}
            </p>
          </section>
        </>
      )}

      {/* Lista de serviços */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">
          Serviços oferecidos
        </h2>
        {partner.services.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Este parceiro ainda não cadastrou serviços.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {partner.services.map((service) => (
              <article
                key={service.id}
                className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {service.title}
                  </h3>
                  {service.priceOnRequest ? (
                    <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                      Sob consulta
                    </span>
                  ) : service.price ? (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      {service.price} €
                    </span>
                  ) : null}
                </div>
                {service.description && (
                  <p className="mt-2 text-sm text-zinc-700">
                    {service.description}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Call to action para autenticação */}
      <section className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-5 sm:px-6">
        <h2 className="text-sm font-semibold text-emerald-900">
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
    </div>
  );
}

