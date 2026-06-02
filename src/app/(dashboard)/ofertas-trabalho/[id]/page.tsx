import { JobOfferDetailLoader } from "@/components/job-offers/JobOfferDetailLoader";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function JobOfferDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <JobOfferDetailLoader offerId={id} />;
}
