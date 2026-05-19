import { cache } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:3001";

export type PublicHousePartner = {
  id: string;
  name: string;
  whatsapp: string;
  logoUrl: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

export type PublicHousePageData = {
  id: string;
  /** Identificador numérico estável (controlo / WhatsApp). */
  houseId: number;
  title: string;
  description: string;
  businessType: "RENT" | "SALE";
  typology: string;
  city: string;
  availableFrom: string;
  priceEur: string;
  relocationFeeEur: string;
  caucoesCount: number;
  rendasEntradaCount: number;
  furnished: boolean;
  imageUrls: string[];
  /** Foto principal (OG / destaque); fallback: primeira de imageUrls */
  coverImageUrl: string | null;
  videoUrl: string | null;
  publicationStatus: "PUBLISHED" | "HIDDEN";
  publishedUntil: string | null;
  partnerId: string;
  partner: PublicHousePartner;
};

/** URL absoluta para Open Graph / partilhas (API ou R2). */
export function absoluteMediaUrlForOg(url: string | null | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const u = url.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const base = API_URL.replace(/\/$/, "");
  if (u.startsWith("/uploads/")) return `${base}${u}`;
  return undefined;
}

export const getPublicHouse = cache(async (houseId: string): Promise<PublicHousePageData | null> => {
  const base = API_URL.replace(/\/$/, "");
  const res = await fetch(`${base}/partners/houses/${encodeURIComponent(houseId)}/public`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error("Falha ao carregar o anúncio.");
  }
  return res.json() as Promise<PublicHousePageData>;
});
