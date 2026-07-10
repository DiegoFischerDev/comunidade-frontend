import { Suspense } from 'react';
import { RafacallPublicBookingView } from '@/components/rafacall/RafacallPublicBookingView';

type SearchParams = Promise<{ whatsapp?: string; name?: string }>;

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
