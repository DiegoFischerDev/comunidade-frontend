import type { NextConfig } from "next";

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
    ],
  },
};

export default nextConfig;
