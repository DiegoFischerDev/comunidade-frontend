import { notFound, permanentRedirect } from 'next/navigation';
import { PartnerPublicPageView } from '@/components/partner/PartnerPublicPageView';
import {
  buildPartnerPublicMetadata,
  fetchPartnerPublic,
  fetchRelocationHousesForPartner,
  partnerPublicSharePath,
  getPartnerPublicSiteUrl,
} from '@/lib/partner-public-shared';
import { isReservedRootPartnerSlug } from '@/lib/reserved-root-partner-slugs';

type PageProps = {
  params: Promise<{ partnerSlug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { partnerSlug } = await params;
  if (isReservedRootPartnerSlug(partnerSlug)) {
    notFound();
  }
  const partner = await fetchPartnerPublic(partnerSlug);
  return buildPartnerPublicMetadata(partner, partnerPublicSharePath(partner));
}

export const revalidate = 3600;

export default async function PartnerRootSlugPage({ params }: PageProps) {
  const { partnerSlug } = await params;
  if (isReservedRootPartnerSlug(partnerSlug)) {
    notFound();
  }

  const partner = await fetchPartnerPublic(partnerSlug);
  const canonical = partner.publicSlug?.trim();
  if (canonical && partnerSlug !== canonical) {
    permanentRedirect(`/${canonical}`);
  }

  const relocationHouses =
    partner.category?.slug === 'relocation'
      ? await fetchRelocationHousesForPartner(partner.id)
      : [];

  const sharePageUrl = `${getPartnerPublicSiteUrl()}${partnerPublicSharePath(partner)}`;

  return (
    <PartnerPublicPageView
      partner={partner}
      relocationHouses={relocationHouses}
      sharePageUrl={sharePageUrl}
    />
  );
}
