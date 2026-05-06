import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { getPublicSiteUrl } from "@/lib/site-url";

export default async function RelocationLayout({ children }: { children: ReactNode }) {
  const h = await headers();
  const path = h.get("next-url") || "";
  const activeImoveis = path === "/relocation/imoveis" || path.startsWith("/relocation/");
  const siteBase = getPublicSiteUrl();

  return (
    <div className="min-h-dvh bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href={siteBase || "/"} className="flex items-center gap-3">
            <Image
              src="/logo-RP.png"
              alt=""
              width={180}
              height={44}
              className="h-10 w-auto object-contain"
              priority
            />
            <span className="hidden text-xs font-semibold uppercase tracking-wide text-zinc-900 sm:inline">
              Relocation
            </span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/relocation/imoveis"
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                activeImoveis
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              Imóveis
            </Link>
            <Link
              href="/dashboard"
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}

