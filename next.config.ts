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

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      ...(apiPattern ? [apiPattern] : []),
      ...extraImageHosts,
    ],
  },
};

export default nextConfig;
