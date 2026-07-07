/** Estados de `job_offer_whatsapp_messages` (ingest ofertas). */
export function jobOfferWhatsappStatusLabel(status: string): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'created':
      return {
        label: 'Oferta criada',
        className: 'bg-emerald-100 text-emerald-900',
      };
    case 'ignored_not_offer':
      return {
        label: 'Não é oferta (IA)',
        className: 'bg-primary-1 text-foreground/90',
      };
    case 'ignored_no_contact':
      return {
        label: 'Sem contacto do empregador',
        className: 'bg-brand-accent/15 text-brand-primary',
      };
    case 'ignored_no_city':
      return {
        label: 'Sem cidade identificada',
        className: 'bg-brand-accent/15 text-brand-primary',
      };
    case 'ignored_duplicate_offer':
      return {
        label: 'Duplicada (já publicada)',
        className: 'bg-violet-100 text-violet-900',
      };
    case 'skipped_no_destination':
      return {
        label: 'Oferta guardada; destino WA em falta',
        className: 'bg-sky-100 text-sky-900',
      };
    case 'error':
      return {
        label: 'Erro',
        className: 'bg-red-100 text-red-800',
      };
    case 'received':
      return {
        label: 'Recebida',
        className: 'bg-primary-1 text-muted',
      };
    default:
      return {
        label: status,
        className: 'bg-primary-1 text-foreground/90',
      };
  }
}
