import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  absoluteMediaUrlForOg,
  getPublicHouse,
} from "@/lib/house-public-server";

import { HouseJsonLd } from "./house-json-ld";
import { HousePublicView } from "./house-public-view";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:3001";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://comunidade.rafaapelomundo.com";

type PageProps = {
  params: Promise<{ houseId: string }>;
};

function clipDescription(text: string, max = 180): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { houseId } = await params;
  let house;
  try {
    house = await getPublicHouse(houseId);
  } catch {
    return { title: "Anúncio" };
  }
  if (!house) {
    return { title: "Anúncio não encontrado" };
  }

  const title = `${house.title} | Relocation RPM`;
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

  const urlPath = `/casas/${houseId}`;

  return {
    title,
    description,
    keywords: [
      "imóvel",
      "arrendamento",
      "relocation",
      cityKeyword,
      "Portugal",
      "Comunidade RPM",
      house.partner.name,
    ],
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: urlPath,
    },
    openGraph: {
      title,
      description,
      url: urlPath,
      type: "website",
      locale: "pt_PT",
      siteName: "Comunidade RPM",
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

export default async function CasasHousePublicPage({ params }: PageProps) {
  const { houseId } = await params;
  let house;
  try {
    house = await getPublicHouse(houseId);
  } catch {
    notFound();
  }
  if (!house) notFound();

  const absolutePageUrl = `${SITE_URL.replace(/\/$/, "")}/casas/${houseId}`;

  return (
    <>
      <HouseJsonLd house={house} pageUrl={absolutePageUrl} />
      <HousePublicView house={house} apiBaseUrl={API_URL.replace(/\/$/, "")} />
    </>
  );
}
