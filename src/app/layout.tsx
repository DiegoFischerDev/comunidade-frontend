import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";
import "./globals.css";

export const metadata: Metadata = {
  title: "Comunidade RPM",
  description: "Plataforma de marketplace de serviços",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/rpm-favicon.ico", sizes: "any", type: "image/x-icon" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body className="antialiased">
        <Providers>{children}</Providers>
        <FloatingWhatsAppButton />
      </body>
    </html>
  );
}
