export type JobOfferRegion = 'NORTE' | 'CENTRO' | 'SUL';

export const JOB_OFFER_REGION_OPTIONS: {
  value: JobOfferRegion | '';
  label: string;
}[] = [
  { value: '', label: 'Todas as regiões (sem filtro)' },
  { value: 'NORTE', label: 'Norte' },
  { value: 'CENTRO', label: 'Centro' },
  { value: 'SUL', label: 'Sul' },
];
