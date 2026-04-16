import type { Metadata } from "next";
import type { Viewport } from "next";
import { Providers } from "@/components/Providers";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://comunidade.rafaapelomundo.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Comunidade Rafa pelo mundo",
  description:
    "A tua comunidade para imigrar para Portugal com planejamento, parceiros e apoio em cada etapa.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
  openGraph: {
    type: "website",
    locale: "pt_PT",
    siteName: "Comunidade RPM",
    title: "Comunidade Rafa pelo mundo",
    description:
      "A tua comunidade para imigrar para Portugal com planejamento, parceiros e apoio em cada etapa.",
    images: [
      {
        url: "/og-comunidade.png",
        width: 1200,
        height: 630,
        alt: "Comunidade RPM",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Comunidade Rafa pelo mundo",
    description:
      "A tua comunidade para imigrar para Portugal com planejamento, parceiros e apoio em cada etapa.",
    images: ["/og-comunidade.png"],
  },
};

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
