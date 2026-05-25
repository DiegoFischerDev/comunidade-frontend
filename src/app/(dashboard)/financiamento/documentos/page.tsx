'use client';

import { Suspense } from 'react';
import { LeadDocumentsUploadView } from '@/components/lead-documents/LeadDocumentsUploadView';

export default function FinanciamentoDocumentosPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-3xl px-4 py-8 text-sm text-zinc-500">
          A carregar…
        </div>
      }
    >
      <LeadDocumentsUploadView />
    </Suspense>
  );
}
