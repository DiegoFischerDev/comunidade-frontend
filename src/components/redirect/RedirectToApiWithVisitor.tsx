"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  getOrCreateStableRedirectVisitorId,
  tryAcquireRedirectNavigationLock,
} from "@/lib/redirect-visitor-client";

function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
}

function RedirectInner({ variant }: { variant: "share" | "imovel" }) {
  const sp = useSearchParams();
  const t = (sp.get("t") ?? "").trim();
  const titulo = (sp.get("titulo") ?? "").trim();
  const imovel = (sp.get("imovel") ?? "").trim();
  const id = (sp.get("id") ?? "").trim();

  useEffect(() => {
    if (!tryAcquireRedirectNavigationLock()) {
      return;
    }
    const api = apiBaseUrl();
    const vid = getOrCreateStableRedirectVisitorId();
    const q = `rd_vid=${encodeURIComponent(vid)}`;

    if (variant === "imovel") {
      if (id) {
        window.location.replace(
          `${api}/redirect-links/public/by-house/${encodeURIComponent(id)}?${q}`,
        );
        return;
      }
      window.location.replace("/");
      return;
    }

    const slug = t || titulo;
    if (slug) {
      window.location.replace(
        `${api}/redirect-links/public/by-titulo/${encodeURIComponent(slug)}?${q}`,
      );
      return;
    }
    if (imovel) {
      window.location.replace(
        `${api}/redirect-links/public/by-house/${encodeURIComponent(imovel)}?${q}`,
      );
      return;
    }
    window.location.replace("/");
  }, [variant, t, titulo, imovel, id]);

  return (
    <p className="px-4 py-12 text-center text-sm text-zinc-500">A redirecionar…</p>
  );
}

/**
 * Redireciona para a API com `?rd_vid=` estável (localStorage no domínio do site),
 * para o mesmo utilizador não gerar dois UUIDs em pedidos seguidos ao API.
 */
export function RedirectToApiWithVisitor({ variant }: { variant: "share" | "imovel" }) {
  return (
    <Suspense
      fallback={
        <p className="px-4 py-12 text-center text-sm text-zinc-500">A redirecionar…</p>
      }
    >
      <RedirectInner variant={variant} />
    </Suspense>
  );
}
