import {
  formatMembershipBrl,
  formatMembershipEur,
  getMembershipAmountsFromEnv,
  type MembershipAmounts,
  type MembershipPaymentMethod,
  validateMembershipSignupFields,
  type SignupFieldKey,
  type SignupFormFields,
} from '@/lib/membership-checkout';

export const RAFA_CALL_PRODUCT_TITLE = 'Chamada com a Rafa';
export const RAFA_CALL_PRODUCT_SUBTITLE =
  'Videochamada de 30 minutos — taxa de agendamento';

export type RafacallAmounts = MembershipAmounts;
export type RafacallPaymentMethod = MembershipPaymentMethod;

const RAFA_CALL_AMOUNTS_API_PATH = '/stripe/rafa-call-amounts';

/** Preços da taxa de agendamento (fonte: backend / env Stripe). */
export async function fetchRafacallAmounts(): Promise<RafacallAmounts> {
  const base = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    'http://localhost:3001'
  ).replace(/\/$/, '');

  try {
    const res = await fetch(`${base}${RAFA_CALL_AMOUNTS_API_PATH}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return getMembershipAmountsFromEnv();
    }
    const data = (await res.json()) as Partial<RafacallAmounts>;
    const eurCents = Number(data.eurCents);
    const pixCentavos = Number(data.pixCentavos);
    if (
      Number.isFinite(eurCents) &&
      eurCents > 0 &&
      Number.isFinite(pixCentavos) &&
      pixCentavos > 0
    ) {
      return { eurCents, pixCentavos };
    }
    return getMembershipAmountsFromEnv();
  } catch {
    return getMembershipAmountsFromEnv();
  }
}

export const formatRafacallEur = formatMembershipEur;
export const formatRafacallBrl = formatMembershipBrl;

export function getRafacallSuccessUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/dashboard/rafacall/success`;
}

export function getRafacallCancelUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/dashboard/rafacall/cancel`;
}

export function validateRafacallSignupFields(fields: SignupFormFields) {
  return validateMembershipSignupFields(fields);
}

export type { SignupFieldKey, SignupFormFields };
