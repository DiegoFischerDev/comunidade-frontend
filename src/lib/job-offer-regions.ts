export type JobOfferRegion = 'NORTE' | 'CENTRO' | 'SUL';

export const JOB_OFFER_REGION_LABELS: Record<JobOfferRegion, string> = {
  NORTE: 'Norte',
  CENTRO: 'Centro',
  SUL: 'Sul',
};

export const JOB_OFFER_REGION_OPTIONS: {
  value: JobOfferRegion | '';
  label: string;
}[] = [
  { value: '', label: 'Todas as regiões (sem filtro)' },
  { value: 'NORTE', label: JOB_OFFER_REGION_LABELS.NORTE },
  { value: 'CENTRO', label: JOB_OFFER_REGION_LABELS.CENTRO },
  { value: 'SUL', label: JOB_OFFER_REGION_LABELS.SUL },
];

/** Chips do filtro público em /ofertas-trabalho */
export const JOB_OFFER_REGION_FILTER_OPTIONS: {
  value: JobOfferRegion | '';
  label: string;
}[] = [
  { value: '', label: 'Todas' },
  ...(['NORTE', 'CENTRO', 'SUL'] as const).map((value) => ({
    value,
    label: JOB_OFFER_REGION_LABELS[value],
  })),
];
