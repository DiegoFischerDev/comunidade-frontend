import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ houseId: string }>;
};

/** Links antigos `/casas/[id]` redirecionam para o anúncio dentro do dashboard. */
export default async function CasasHouseRedirect({ params }: PageProps) {
  const { houseId } = await params;
  redirect(`/dashboard/casas/${houseId}`);
}
