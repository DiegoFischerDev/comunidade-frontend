import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  absoluteMediaUrlForOg,
  getPublicHouse,
} from "@/lib/house-public-server";

import { HousePublicView } from "./house-public-view";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:3001";

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
  const description = clipDescription(house.description || house.requirements, 180);

  const ogFromHouse = absoluteMediaUrlForOg(house.imageUrls?.[0]);
  const ogFromPartner = absoluteMediaUrlForOg(house.partner?.logoUrl);
  const ogUrl = ogFromHouse ?? ogFromPartner;
  const ogImages = ogUrl
    ? [{ url: ogUrl, width: 1200, height: 630, alt: house.title }]
    : [];

  const urlPath = `/casas/${houseId}`;

  return {
    title,
    description,
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

  return <HousePublicView house={house} apiBaseUrl={API_URL.replace(/\/$/, "")} />;
}
