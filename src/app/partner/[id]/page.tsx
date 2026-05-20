import { permanentRedirect } from 'next/navigation';
import { PartnerPublicPageView } from '@/components/partner/PartnerPublicPageView';
import {
  buildPartnerPublicMetadata,
  fetchPartnerPublic,
  fetchRelocationHousesForPartner,
  partnerPublicSharePath,
  getPartnerPublicSiteUrl,
} from '@/lib/partner-public-shared';

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const partner = await fetchPartnerPublic(id);
  return buildPartnerPublicMetadata(partner, partnerPublicSharePath(partner));
}

export const revalidate = 3600;

export default async function PartnerLegacyPublicPage({ params }: PageProps) {
  const { id } = await params;
  const partner = await fetchPartnerPublic(id);
  const slug = partner.publicSlug?.trim();
  if (slug && id !== slug) {
    permanentRedirect(`/${slug}`);
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
