"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getOrCreateStableRedirectVisitorId,
  tryAcquireRedirectNavigationLock,
} from "@/lib/redirect-visitor-client";

function apiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace(/\/$/, "");
}

type ResolvedTarget =
  | {
      kind: "track";
      trackUrl: string;
      exitFetchPath: string;
    }
  | { kind: "home" };

function resolveTarget(
  variant: "share" | "imovel",
  t: string,
  titulo: string,
  imovel: string,
  id: string,
): ResolvedTarget | null {
  const api = apiBaseUrl();
  const vid = getOrCreateStableRedirectVisitorId();
  if (!vid) return null;
  const q = `rd_vid=${encodeURIComponent(vid)}`;

  if (variant === "imovel") {
    if (!id) return { kind: "home" };
    return {
      kind: "track",
      trackUrl: `${api}/redirect-links/public/by-house/${encodeURIComponent(id)}?${q}`,
      exitFetchPath: `redirect-links/public/house-whatsapp-target/${encodeURIComponent(id)}`,
    };
  }

  const slug = t || titulo;
  if (slug) {
    return {
      kind: "track",
      trackUrl: `${api}/redirect-links/public/by-titulo/${encodeURIComponent(slug)}?${q}`,
      exitFetchPath: `redirect-links/public/custom-whatsapp-target/${encodeURIComponent(slug)}`,
    };
  }
  if (imovel) {
    return {
      kind: "track",
      trackUrl: `${api}/redirect-links/public/by-house/${encodeURIComponent(imovel)}?${q}`,
      exitFetchPath: `redirect-links/public/house-whatsapp-target/${encodeURIComponent(imovel)}`,
    };
  }
  return { kind: "home" };
}

function RedirectFallback() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="flex-1" />
      <p className="px-4 pb-6 text-center text-xs text-zinc-400">A redirecionar…</p>
    </div>
  );
}

function RedirectInner({ variant }: { variant: "share" | "imovel" }) {
  const sp = useSearchParams();
  const t = (sp.get("t") ?? "").trim();
  const titulo = (sp.get("titulo") ?? "").trim();
  const imovel = (sp.get("imovel") ?? "").trim();
  const id = (sp.get("id") ?? "").trim();

  const [manualHref, setManualHref] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!tryAcquireRedirectNavigationLock()) {
      return;
    }

    const target = resolveTarget(variant, t, titulo, imovel, id);
    if (!target) {
      return;
    }

    if (target.kind === "home") {
      setManualHref("/");
      window.location.replace("/");
      return;
    }

    const { trackUrl, exitFetchPath } = target;
    const exitUrl = `${apiBaseUrl()}/${exitFetchPath}`;

    setManualHref(trackUrl);

    let cancelled = false;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;
    let saw404 = false;

    const scheduleRedirect = () => {
      redirectTimer = setTimeout(() => {
        if (!cancelled && !saw404) {
          window.location.replace(trackUrl);
        }
      }, 550);
    };

    (async () => {
      try {
        const exitRes = await fetch(exitUrl, { credentials: "omit" });
        if (cancelled) return;

        if (exitRes.status === 404) {
          saw404 = true;
          setNotFound(true);
          return;
        }

        if (exitRes.ok) {
          const data = (await exitRes.json()) as { whatsappUrl?: string };
          if (data?.whatsappUrl && typeof data.whatsappUrl === "string") {
            setManualHref(data.whatsappUrl);
          }
        }
      } catch {
        // Mantém trackUrl como fallback manual.
      } finally {
        if (!cancelled) {
          scheduleRedirect();
        }
      }
    })();

    return () => {
      cancelled = true;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [variant, t, titulo, imovel, id]);

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col bg-white">
        <div className="flex-1" />
        <p className="px-4 pb-6 text-center text-xs text-zinc-400">
          Este link já não está disponível.{" "}
          <Link
            href="/"
            className="text-zinc-500 underline underline-offset-2 hover:text-zinc-700"
          >
            Ir para o site
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="flex-1" />
      {manualHref ? (
        <p className="px-4 pb-6 text-center text-xs text-zinc-400">
          Se não fores redirecionado automaticamente,{" "}
          <a
            href={manualHref}
            className="text-zinc-500 underline underline-offset-2 hover:text-zinc-700"
          >
            clica aqui
          </a>
          .
        </p>
      ) : null}
    </div>
  );
}

/**
 * Página mínima: redireciona para tracking/API e oferece atalho manual discreto no rodapé.
 */
export function RedirectToApiWithVisitor({ variant }: { variant: "share" | "imovel" }) {
  return (
    <Suspense fallback={<RedirectFallback />}>
      <RedirectInner variant={variant} />
    </Suspense>
  );
}
