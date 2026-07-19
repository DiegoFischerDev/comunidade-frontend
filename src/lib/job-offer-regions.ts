export type JobOfferRegion = 'NORTE' | 'CENTRO' | 'SUL';

/** Labels legadas (campo `region` nas ofertas). */
export const JOB_OFFER_REGION_LABELS: Record<JobOfferRegion, string> = {
  NORTE: 'Norte',
  CENTRO: 'Centro',
  SUL: 'Sul',
};
