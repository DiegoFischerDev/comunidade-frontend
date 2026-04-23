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
    title: "Comunidade Rafa pelo mundo",
    description: desc,
    manifest: "/site.webmanifest",
    icons: {
      icon: [
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon_novo.ico", sizes: "any", type: "image/x-icon" },
      ],
      apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    },
    openGraph: {
      type: "website",
      locale: "pt_PT",
      siteName: "Comunidade RPM",
      title: "Comunidade Rafa pelo mundo",
      description: desc,
      url: base,
      images: [
        {
          url: new URL("/og-comunidade.png", base).href,
          width: 1200,
          height: 630,
          alt: "Comunidade RPM",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Comunidade Rafa pelo mundo",
      description: desc,
      images: [new URL("/og-comunidade.png", base).href],
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
