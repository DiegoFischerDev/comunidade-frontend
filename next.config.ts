import type { NextConfig } from "next";

const extraImageHosts = (process.env.NEXT_PUBLIC_EXTRA_IMAGE_DOMAINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((hostname) => ({
    protocol: "https" as const,
    hostname,
    pathname: "/**" as const,
  }));

/** Padrão para `/uploads/**` a partir de `NEXT_PUBLIC_API_URL` (obrigatório no build de prod com imagens). */
function apiUploadsRemotePattern(): {
  protocol: "http" | "https";
  hostname: string;
  pathname: string;
} | null {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return null;
  try {
    const u = new URL(base);
    return {
      protocol: u.protocol === "https:" ? "https" : "http",
      hostname: u.hostname,
      pathname: "/uploads/**",
    };
  } catch {
    return null;
  }
}

const apiPattern = apiUploadsRemotePattern();

/**
 * Uploads no mesmo domínio da API em deploys (stage/prod) quando o build
 * usou outro `NEXT_PUBLIC_API_URL` — evita erro "hostname is not configured" no `next/image`.
 */
const defaultApiUploadsPatterns: {
  protocol: "https";
  hostname: string;
  pathname: string;
}[] = [
  { protocol: "https", hostname: "api-stage.rafaapelomundo.com", pathname: "/uploads/**" },
  { protocol: "https", hostname: "api.rafaapelomundo.com", pathname: "/uploads/**" },
  { protocol: "https", hostname: "api-comunidade.rafaportugal.com", pathname: "/uploads/**" },
  { protocol: "https", hostname: "api-comunidade.rafaapelomundo.com", pathname: "/uploads/**" },
];

/** `NEXT_PUBLIC_API_URL` primeiro; defaults para não duplicar o mesmo hostname. */
const uploadPatternsFromEnv = [
  ...(apiPattern ? [apiPattern] : []),
  ...defaultApiUploadsPatterns.filter(
    (d) => !apiPattern || apiPattern.hostname !== d.hostname,
  ),
];

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      ...uploadPatternsFromEnv,
      ...extraImageHosts,
    ],
  },
};

export default nextConfig;
