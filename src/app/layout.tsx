import type { Metadata } from "next";
import type { Viewport } from "next";
import { headers } from "next/headers";
import { Providers } from "@/components/Providers";
import { getPublicSiteUrlFromRequestHeaders } from "@/lib/site-url";
import "./globals.css";

const desc =
  "A tua comunidade para imigrar para Portugal com planejamento, parceiros e apoio em cada etapa.";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const siteUrl = getPublicSiteUrlFromRequestHeaders(h);
  const base = new URL(siteUrl);
  return {
    metadataBase: base,
    title: "Comunidade Rafa   ",
    description: desc,
    manifest: "/site.webmanifest",
    icons: {
      icon: [
        { url: "/favicon_novo.ico", sizes: "any", type: "image/x-icon" },
      ],
      apple: { url: "/apple-touch-icon2.png", sizes: "180x180", type: "image/png" },
    },
    openGraph: {
      type: "website",
      locale: "pt_PT",
      siteName: "Comunidade Rafa Portugal",
      title: "Comunidade Rafa Portugal",
      description: desc,
      url: base,
      images: [
        {
          url: new URL("/og_comunidade2.png", base).href,
          width: 1200,
          height: 630,
          alt: "Comunidade Rafa Portugal",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Comunidade Rafa Portugal",
      description: desc,
      images: [new URL("/og_comunidade2.png", base).href],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <head>
      </head>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
