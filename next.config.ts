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

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api-stage.rafaapelomundo.com",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "api.rafaapelomundo.com",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "api-comunidade.rafaapelomundo.com",
        pathname: "/uploads/**",
      },
      ...extraImageHosts,
    ],
  },
};

export default nextConfig;
