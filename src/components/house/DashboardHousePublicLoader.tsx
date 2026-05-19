"use client";

import { notFound } from "next/navigation";
import { useEffect, useState } from "react";

import { HouseJsonLd } from "@/app/casas/[houseId]/house-json-ld";
import { HousePublicView } from "@/app/casas/[houseId]/house-public-view";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import type { PublicHousePageData } from "@/lib/house-public-server";
import { getPublicSiteUrl } from "@/lib/site-url";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://localhost:3001";

const SITE_URL = getPublicSiteUrl();

type Props = {
  houseId: string;
};

export function DashboardHousePublicLoader({ houseId }: Props) {
  const { loading: authLoading } = useAuth();
  const [house, setHouse] = useState<PublicHousePageData | null | undefined>(undefined);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    void (async () => {
      try {
        const data = await api.partners.housePublic(houseId);
        if (!cancelled) setHouse(data);
      } catch {
        if (!cancelled) setHouse(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [houseId, authLoading]);

  if (authLoading || house === undefined) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <p className="text-sm text-zinc-500">A carregar anúncio…</p>
      </div>
    );
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
