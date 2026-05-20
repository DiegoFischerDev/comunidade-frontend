import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { RelocationHouseRow } from '@/components/relocation/relocation-house-shared';
import { absoluteMediaUrlForOg } from '@/lib/house-public-server';
import { getPublicSiteUrl } from '@/lib/site-url';

export type PartnerService = {
  id: string;
  title: string;
  description: string | null;
  price: string | null;
  priceOnRequest: boolean;
  /** `/link?t=…` quando o admin configurou link rastreado. */
  contactRedirectPath?: string | null;
};

export type PartnerPublic = {
  id: string;
  /** Ausente em respostas antigas; preferir `id` em URLs legadas. */
  publicSlug?: string | null;
  name: string;
  whatsapp: string;
  logoUrl: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  backgroundImageUrl: string | null;
  catalogImageUrls?: string[];
  catalogVideoUrl?: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
  services: PartnerService[];
  /** `/link?t=…` para o botão de contacto na hero. */
  heroContactRedirectPath?: string | null;
};

/** Caminho público preferencial: `/{publicSlug}` ou legado `/partner/{id}`. */
export function partnerPublicPagePath(
  partnerId: string,
  publicSlug?: string | null,
): string {
  const s = publicSlug?.trim();
  if (s) return `/${s}`;
  return `/partner/${partnerId}`;
}

export function partnerPublicSharePath(partner: PartnerPublic): string {
  return partnerPublicPagePath(partner.id, partner.publicSlug);
}

export const PARTNER_PUBLIC_API_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || 'http://localhost:3001';

/** Origem pública normalizada (sem `:3000` em produção). */
export function getPartnerPublicSiteUrl(): string {
  return getPublicSiteUrl();
}

/** Imagem de fundo da hero; se não existir, usa o logo. */
export function partnerPublicOgImageUrl(partner: PartnerPublic): string | undefined {
  return (
    absoluteMediaUrlForOg(partner.backgroundImageUrl) ??
    absoluteMediaUrlForOg(partner.logoUrl)
  );
}

/** URL absoluta de asset do parceiro (hero, logo, catálogo). */
export function absolutePartnerAssetUrl(
  url: string | null | undefined,
): string | null {
  return absoluteMediaUrlForOg(url) ?? null;
}

export async function fetchPartnerPublic(lookup: string): Promise<PartnerPublic> {
  const res = await fetch(
    `${PARTNER_PUBLIC_API_URL}/partners/${encodeURIComponent(lookup)}/public`,
    { cache: 'no-store' },
  );

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok) {
    throw new Error('Falha ao carregar parceiro.');
  }

  return res.json();
}

export async function fetchRelocationHousesForPartner(
  partnerId: string,
): Promise<RelocationHouseRow[]> {
  const res = await fetch(
    `${PARTNER_PUBLIC_API_URL}/partners/relocation/houses?partnerId=${encodeURIComponent(partnerId)}`,
    { cache: 'no-store' },
  );
  if (!res.ok) {
    return [];
  }
  const data = (await res.json()) as RelocationHouseRow[];
  return Array.isArray(data) ? data : [];
}

export function buildPartnerPublicMetadata(
  partner: PartnerPublic,
  canonicalPath: string,
): Metadata {
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

  const path = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
  const url = `${getPartnerPublicSiteUrl()}${path}`;

  const ogUrl = partnerPublicOgImageUrl(partner);
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
