import type { Metadata } from "next";

import { DashboardHousePublicLoader } from "@/components/house/DashboardHousePublicLoader";
import { generateHouseListingMetadata } from "@/lib/house-listing-metadata";

type PageProps = {
  params: Promise<{ houseId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { houseId } = await params;
  return generateHouseListingMetadata(houseId, `/dashboard/casas/${houseId}`);
}

export default async function DashboardHousePublicPage({ params }: PageProps) {
  const { houseId } = await params;
  return <DashboardHousePublicLoader houseId={houseId} />;
}
