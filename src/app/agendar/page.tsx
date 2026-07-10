import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Suspense } from 'react';
import { RafacallPublicBookingView } from '@/components/rafacall/RafacallPublicBookingView';
import {
  AGENDAMENTO_PAGE_DESCRIPTION,
  AGENDAMENTO_PAGE_TITLE,
  BRAND_AGENDAMENTO_OG_IMAGE_HEIGHT,
  BRAND_AGENDAMENTO_OG_IMAGE_TYPE,
  BRAND_AGENDAMENTO_OG_IMAGE_URL,
  BRAND_AGENDAMENTO_OG_IMAGE_WIDTH,
  SITE_NAME_FULL,
} from '@/lib/site-branding';
import { getPublicSiteUrlFromRequestHeaders } from '@/lib/site-url';

type SearchParams = Promise<{ whatsapp?: string; name?: string }>;

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const siteUrl = getPublicSiteUrlFromRequestHeaders(h);
  const base = new URL(siteUrl);
  const ogImageUrl = new URL(BRAND_AGENDAMENTO_OG_IMAGE_URL, base).href;
  const pageUrl = new URL('/agendar', base).href;

  return {
    title: AGENDAMENTO_PAGE_TITLE,
    description: AGENDAMENTO_PAGE_DESCRIPTION,
    alternates: {
      canonical: '/agendar',
    },
    openGraph: {
      type: 'website',
      locale: 'pt_BR',
      siteName: SITE_NAME_FULL,
      title: AGENDAMENTO_PAGE_TITLE,
      description: AGENDAMENTO_PAGE_DESCRIPTION,
      url: pageUrl,
      images: [
        {
          url: ogImageUrl,
          width: BRAND_AGENDAMENTO_OG_IMAGE_WIDTH,
          height: BRAND_AGENDAMENTO_OG_IMAGE_HEIGHT,
          type: BRAND_AGENDAMENTO_OG_IMAGE_TYPE,
          alt: AGENDAMENTO_PAGE_TITLE,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: AGENDAMENTO_PAGE_TITLE,
      description: AGENDAMENTO_PAGE_DESCRIPTION,
      images: [ogImageUrl],
    },
  };
}

export default async function AgendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const whatsapp = params.whatsapp?.trim() ?? '';
  const namePrefill = params.name?.trim() ?? '';

  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg px-4 py-12 text-center">
          <p className="text-sm text-muted">A carregar…</p>
        </div>
      }
    >
      <RafacallPublicBookingView whatsappFromUrl={whatsapp} namePrefill={namePrefill} />
    </Suspense>
  );
}
