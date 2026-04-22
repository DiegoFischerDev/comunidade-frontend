import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { generateHouseListingMetadata } from "@/lib/house-listing-metadata";
import { getPublicHouse } from "@/lib/house-public-server";

import { HouseJsonLd } from "../../../../casas/[houseId]/house-json-ld";
import { HousePublicView } from "../../../../casas/[houseId]/house-public-view";
import { getPublicSiteUrl } from "@/lib/site-url";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:3001";

const SITE_URL = getPublicSiteUrl();

type PageProps = {
  params: Promise<{ houseId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { houseId } = await params;
  return generateHouseListingMetadata(houseId, `/dashboard/casas/${houseId}`);
}

export default async function DashboardHousePublicPage({ params }: PageProps) {
  const { houseId } = await params;
  let house;
  try {
    house = await getPublicHouse(houseId);
  } catch {
    notFound();
  }
  if (!house) notFound();

  const absolutePageUrl = `${SITE_URL.replace(/\/$/, "")}/dashboard/casas/${houseId}`;

  return (
    <>
      <HouseJsonLd house={house} pageUrl={absolutePageUrl} />
      <HousePublicView
        house={house}
        apiBaseUrl={API_URL.replace(/\/$/, "")}
        variant="dashboard"
      />
    </>
  );
}
