import type { Metadata } from "next";
import { headers } from "next/headers";
import { getPublicSiteUrlFromRequestHeaders } from "@/lib/site-url";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:3001";

function firstString(
  v: string | string[] | undefined,
): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (Array.isArray(v) && typeof v[0] === "string" && v[0].trim()) {
    return v[0].trim();
  }
  return null;
}

/** Slug do link personalizado (`t` ou `titulo`). */
export function partnerShareSlugFromSearchParams(
  sp: Record<string, string | string[] | undefined>,
): string | null {
  const t = firstString(sp.t);
  const titulo = firstString(sp.titulo);
  const raw = t || titulo;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw).trim() || null;
  } catch {
    return raw.trim() || null;
  }
}

function absoluteApiAssetUrl(pathOrUrl: string): string {
  const trimmed = pathOrUrl.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = API_URL.replace(/\/$/, "");
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

type OgMetaJson = {
  title: string;
  description: string;
  ogImageUrl: string | null;
};

/**
 * Metadados Open Graph para `/whatsapp` e `/link` quando existe `t` ou `titulo`
 * com slug de `PartnerShareLink`.
 */
export async function generatePartnerShareLinkRedirectMetadata(
  pathname: "/whatsapp" | "/link",
  searchParams: Promise<Record<string, string | string[] | undefined>>,
): Promise<Metadata> {
  const sp = await searchParams;
  const slug = partnerShareSlugFromSearchParams(sp);
  const h = await headers();
  const siteUrl = getPublicSiteUrlFromRequestHeaders(h);
  const base = new URL(siteUrl);

  const fallbackTitle = "WhatsApp · Comunidade Rafa Portugal";
  const fallbackDescription =
    "Abre o WhatsApp com a mensagem preparada para contactar o parceiro.";

  const fallback: Metadata = {
    title: fallbackTitle,
    description: fallbackDescription,
    openGraph: {
      title: fallbackTitle,
      description: fallbackDescription,
      type: "website",
      url: new URL(pathname, base),
    },
    twitter: {
      card: "summary_large_image",
      title: fallbackTitle,
      description: fallbackDescription,
    },
  };

  if (!slug) {
    return fallback;
  }

  const apiBase = API_URL.replace(/\/$/, "");
  const metaUrl = `${apiBase}/redirect-links/public/og-meta/by-titulo/${encodeURIComponent(slug)}`;

  let data: OgMetaJson;
  try {
    const res = await fetch(metaUrl, { next: { revalidate: 120 } });
    if (!res.ok) return fallback;
    data = (await res.json()) as OgMetaJson;
    if (!data?.title || typeof data.title !== "string") return fallback;
  } catch {
    return fallback;
  }

  const sharePageUrl = new URL(pathname, base);
  sharePageUrl.searchParams.set("t", slug);

  const ogImageAbsolute = data.ogImageUrl
    ? absoluteApiAssetUrl(data.ogImageUrl)
    : null;

  const images = ogImageAbsolute
    ? [
        {
          url: ogImageAbsolute,
          width: 1200,
          height: 630,
          alt: data.title,
        },
      ]
    : undefined;

  return {
    title: data.title,
    description: data.description,
    openGraph: {
      title: data.title,
      description: data.description,
      type: "website",
      url: sharePageUrl.href,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: data.title,
      description: data.description,
      images: ogImageAbsolute ? [ogImageAbsolute] : undefined,
    },
  };
}
