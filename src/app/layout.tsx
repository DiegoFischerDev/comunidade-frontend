import type { Metadata } from "next";
import type { Viewport } from "next";
import { headers } from "next/headers";
import { Providers } from "@/components/Providers";
import {
  BRAND_APPLE_TOUCH_ICON_URL,
  BRAND_FAVICON_16_URL,
  BRAND_FAVICON_32_URL,
  BRAND_FAVICON_ICO_URL,
  BRAND_MANIFEST,
  BRAND_OG_IMAGE,
  BRAND_OG_IMAGE_HEIGHT,
  BRAND_OG_IMAGE_WIDTH,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_NAME_FULL,
} from "@/lib/site-branding";
import { getPublicSiteUrlFromRequestHeaders } from "@/lib/site-url";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const siteUrl = getPublicSiteUrlFromRequestHeaders(h);
  const base = new URL(siteUrl);
  const ogImageUrl = new URL(BRAND_OG_IMAGE, base).href;

  return {
    metadataBase: base,
    title: {
      default: SITE_NAME_FULL,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    manifest: BRAND_MANIFEST,
    icons: {
      icon: [
        { url: BRAND_FAVICON_ICO_URL, sizes: "any", type: "image/x-icon" },
        { url: BRAND_FAVICON_32_URL, sizes: "32x32", type: "image/png" },
        { url: BRAND_FAVICON_16_URL, sizes: "16x16", type: "image/png" },
      ],
      apple: {
        url: BRAND_APPLE_TOUCH_ICON_URL,
        sizes: "180x180",
        type: "image/png",
      },
    },
    openGraph: {
      type: "website",
      locale: "pt_PT",
      siteName: SITE_NAME_FULL,
      title: SITE_NAME_FULL,
      description: SITE_DESCRIPTION,
      url: base,
      images: [
        {
          url: ogImageUrl,
          width: BRAND_OG_IMAGE_WIDTH,
          height: BRAND_OG_IMAGE_HEIGHT,
          alt: SITE_NAME_FULL,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_NAME_FULL,
      description: SITE_DESCRIPTION,
      images: [ogImageUrl],
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
