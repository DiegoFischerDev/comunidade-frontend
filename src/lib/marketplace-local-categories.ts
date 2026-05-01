/**
 * Categorias do marketplace definidas só no frontend (não existem na API).
 * São sempre listadas primeiro; se a API tiver o mesmo slug, a entrada local prevalece.
 */

export type MarketplaceLocalCategory = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
};

export const LOCAL_MARKETPLACE_CATEGORIES: readonly MarketplaceLocalCategory[] = [
  {
    id: '__local_abertura_conta',
    slug: 'abertura-de-conta',
    name: 'Abertura de conta',
    shortDescription:
      'Assistência gratuita para abertura de conta na Wise e abertura de conta em banco português (IBAN).',
    fullDescription:
      'Assistência gratuita para abertura de conta na Wise e abertura de conta em banco português (IBAN).',
  },
] as const;

const LOCAL_SLUGS = new Set(LOCAL_MARKETPLACE_CATEGORIES.map((c) => c.slug));

export function isFrontendOnlyMarketplaceCategorySlug(slug: string): boolean {
  return LOCAL_SLUGS.has(slug);
}

/** Junta categorias da API com as locais no topo (sem duplicar slug). */
export function prependLocalMarketplaceCategories<T extends { slug: string }>(
  apiCategories: T[],
): T[] {
  const filtered = apiCategories.filter((c) => !LOCAL_SLUGS.has(c.slug));
  return [...(LOCAL_MARKETPLACE_CATEGORIES as unknown as T[]), ...filtered];
}

/** Formato alinhado a `api.marketplace.categoriesWithPartners()`. */
export type MarketplaceCategoryWithPartners = {
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

export function mergeMarketplaceCategoriesWithPartners(
  apiCategories: MarketplaceCategoryWithPartners[],
): MarketplaceCategoryWithPartners[] {
  const filtered = apiCategories.filter((c) => !LOCAL_SLUGS.has(c.slug));
  const locals: MarketplaceCategoryWithPartners[] = LOCAL_MARKETPLACE_CATEGORIES.map((l) => ({
    id: l.id,
    slug: l.slug,
    name: l.name,
    shortDescription: l.shortDescription,
    fullDescription: l.fullDescription,
    backgroundImageUrl: undefined,
    partners: [],
  }));
  return [...locals, ...filtered];
}
