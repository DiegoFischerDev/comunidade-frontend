/** Alinhado a `backend/src/partner/house-publication.constants.ts` */
export const HOUSE_PUBLICATION_COST_EUR_CENTS = 500;
export const HOUSE_PUBLICATION_DURATION_DAYS = 7;

export function formatPublicationCostEur(
  cents: number = HOUSE_PUBLICATION_COST_EUR_CENTS,
): string {
  return (cents / 100).toLocaleString("pt-PT", {
    style: "currency",
    currency: "EUR",
  });
}
