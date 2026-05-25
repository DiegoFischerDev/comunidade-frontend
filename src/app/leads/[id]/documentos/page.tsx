import type { Metadata } from 'next';
import { LeadDocumentsUploadView } from '@/components/lead-documents/LeadDocumentsUploadView';

export const metadata: Metadata = {
  title: 'Envio de documentos — Comunidade Rafa Portugal',
  description:
    'Envia os documentos do teu pedido de crédito habitação diretamente para o teu parceiro de financiamento.',
};

export default async function LeadDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <LeadDocumentsUploadView leadId={id} />;
}
