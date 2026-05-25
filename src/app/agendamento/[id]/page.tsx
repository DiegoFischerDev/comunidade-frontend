import { RafacallManageView } from '@/components/rafacall/RafacallManageView';

export default async function RafacallManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RafacallManageView bookingId={id} />;
}
