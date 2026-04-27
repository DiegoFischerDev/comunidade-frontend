import type { Metadata } from "next";

import { absoluteMediaUrlForOg, getPublicHouse } from "@/lib/house-public-server";

function clipDescription(text: string, max = 180): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

/** URL path canónica do anúncio (ex. `/dashboard/casas/[id]`). */
export async function generateHouseListingMetadata(
  houseId: string,
  canonicalPath: string,
): Promise<Metadata> {
  let house;
  try {
    house = await getPublicHouse(houseId);
  } catch {
    return { title: "Anúncio" };
  }
  if (!house) {
    return { title: "Anúncio não encontrado" };
  }

  const title = `${house.title} | Comunidade Rafa Portugal`;
  const description = clipDescription(house.description, 180);

  const cityKeyword =
    {
      INTERIOR: "Portugal",
      LISBOA: "Lisboa",
      PORTO: "Porto",
      BRAGA: "Braga",
      COIMBRA: "Coimbra",
      AVEIRO: "Aveiro",
      FARO: "Faro",
      ALGARVE: "Algarve",
      EVORA: "Évora",
      VISEU: "Viseu",
    }[house.city] ?? "Portugal";

  const ogFromHouse = absoluteMediaUrlForOg(house.coverImageUrl ?? house.imageUrls?.[0]);
  const ogFromPartner = absoluteMediaUrlForOg(house.partner?.logoUrl);
  const ogUrl = ogFromHouse ?? ogFromPartner;
  const ogImages = ogUrl
    ? [{ url: ogUrl, width: 1200, height: 630, alt: house.title }]
    : [];

  return {
    title,
    description,
    keywords: [
      "imóvel",
      "arrendamento",
      "relocation",
      cityKeyword,
      "Portugal",
      "Comunidade Rafa Portugal",
      house.partner.name,
    ],
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      type: "website",
      locale: "pt_PT",
      siteName: "Comunidade Rafa Portugal",
      images: ogImages,
    },
    twitter: {
      card: ogImages.length > 0 ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImages.length > 0 ? [ogImages[0].url] : [],
    },
  };
}
