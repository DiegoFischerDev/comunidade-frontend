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

function RedirectInner({ variant }: { variant: "share" | "imovel" }) {
  const sp = useSearchParams();
  const t = (sp.get("t") ?? "").trim();
  const titulo = (sp.get("titulo") ?? "").trim();
  const imovel = (sp.get("imovel") ?? "").trim();
  const id = (sp.get("id") ?? "").trim();

  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [softWarning, setSoftWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!tryAcquireRedirectNavigationLock()) {
      return;
    }

    const target = resolveTarget(variant, t, titulo, imovel, id);
    if (!target) {
      setSoftWarning("Não foi possível identificar o dispositivo. Recarrega a página.");
      return;
    }

    if (target.kind === "home") {
      window.location.replace("/");
      return;
    }

    const { trackUrl, exitFetchPath } = target;
    const api = apiBaseUrl();
    const exitUrl = `${api}/${exitFetchPath}`;

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
            setWhatsappUrl(data.whatsappUrl);
          }
        } else {
          setSoftWarning(
            "O atalho directo não foi carregado; o redirecionamento automático continua.",
          );
        }
      } catch {
        if (!cancelled) {
          setSoftWarning(
            "Sem ligação ao servidor para preparar o atalho; tentamos abrir o destino na mesma.",
          );
        }
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
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-zinc-900">Link indisponível</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Este endereço já não corresponde a um destino válido.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block text-sm font-medium text-amber-700 underline hover:text-amber-900"
        >
          Ir para a página inicial
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-lg font-semibold text-zinc-900">A abrir o WhatsApp…</h1>
      <p className="mt-2 text-sm text-zinc-600">
        O browser deve abrir o WhatsApp do parceiro dentro de instantes.
      </p>
      {softWarning ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {softWarning}
        </p>
      ) : null}
      {whatsappUrl ? (
        <div className="mt-8">
          <p className="text-sm text-zinc-700">
            Se não abrir sozinho, abre directamente:
          </p>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex min-h-[44px] min-w-[200px] items-center justify-center rounded-lg bg-[#25D366] px-6 py-3 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-95"
          >
            Abrir WhatsApp do parceiro
          </a>
          <p className="mt-3 text-xs text-zinc-500">
            Abre numa nova aba para manteres esta página se precisares de tentar outra vez.
          </p>
        </div>
      ) : (
        <p className="mt-8 text-sm text-zinc-500">A preparar atalho de segurança…</p>
      )}
    </div>
  );
}

/**
 * Obtém o URL wa.me (JSON) para link manual, depois redireciona para a API (tracking).
 */
export function RedirectToApiWithVisitor({ variant }: { variant: "share" | "imovel" }) {
  return (
    <Suspense
      fallback={
        <p className="px-4 py-16 text-center text-sm text-zinc-500">A redirecionar…</p>
      }
    >
      <RedirectInner variant={variant} />
    </Suspense>
  );
}
