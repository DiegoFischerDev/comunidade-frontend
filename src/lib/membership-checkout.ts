export const MEMBERSHIP_PRODUCT_TITLE = 'Comunidade Rafa Portugal';
export const MEMBERSHIP_PRODUCT_SUBTITLE = 'Anuidade — acesso membro VIP (1 ano)';

export type MembershipAmounts = {
  eurCents: number;
  pixCentavos: number;
};

const DEFAULT_EUR_CENTS = 2300;
const DEFAULT_PIX_CENTAVOS = 13800;

function parsePositiveCents(raw: string | undefined, fallback: number): number {
  const n = raw ? parseInt(String(raw).trim(), 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Valores de fallback alinhados ao backend (`STRIPE_AMOUNT_EUR_CENTS` / `STRIPE_PIX_AMOUNT_BRL`). */
export function getMembershipAmountsFromEnv(): MembershipAmounts {
  const eurCents = parsePositiveCents(
    process.env.STRIPE_AMOUNT_EUR_CENTS ??
      process.env.NEXT_PUBLIC_STRIPE_AMOUNT_EUR_CENTS,
    DEFAULT_EUR_CENTS,
  );
  const pixCentavos = parsePositiveCents(
    process.env.STRIPE_PIX_AMOUNT_BRL ??
      process.env.NEXT_PUBLIC_STRIPE_PIX_AMOUNT_BRL,
    DEFAULT_PIX_CENTAVOS,
  );
  return { eurCents, pixCentavos };
}

export const DEFAULT_MEMBERSHIP_AMOUNTS: MembershipAmounts =
  getMembershipAmountsFromEnv();

const MEMBERSHIP_AMOUNTS_API_PATH = '/stripe/membership-amounts';

/** Obtém preços da anuidade no backend (fonte de verdade = env do servidor Stripe). */
export async function fetchMembershipAmounts(): Promise<MembershipAmounts> {
  const base = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_URL ||
    'http://localhost:3001'
  ).replace(/\/$/, '');

  try {
    const res = await fetch(`${base}${MEMBERSHIP_AMOUNTS_API_PATH}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return getMembershipAmountsFromEnv();
    }
    const data = (await res.json()) as Partial<MembershipAmounts>;
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

export type MembershipPaymentMethod = 'card' | 'mbway' | 'pix';

export function formatMembershipEur(cents: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function formatMembershipBrl(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

export function getMembershipSuccessUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/dashboard/membership/success`;
}

export function getMembershipCancelUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/dashboard/membership/cancel`;
}

export function readAffiliateCodeFromStorage(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const refRaw = window.localStorage.getItem('comunidade_ref_affiliate');
  if (refRaw && refRaw !== 'nenhum' && refRaw.trim()) {
    return refRaw.trim();
  }
  return undefined;
}

export type SignupFormFields = {
  name: string;
  email: string;
  emailConfirm: string;
  whatsapp: string;
  password: string;
  passwordConfirm: string;
};

export type SignupFieldKey =
  | 'name'
  | 'email'
  | 'emailConfirm'
  | 'whatsapp'
  | 'password'
  | 'passwordConfirm';

const SIGNUP_FIELD_ORDER: SignupFieldKey[] = [
  'name',
  'email',
  'emailConfirm',
  'whatsapp',
  'password',
  'passwordConfirm',
];

export function validateMembershipSignupFields(fields: SignupFormFields): {
  errors: Partial<Record<SignupFieldKey, string>>;
  firstInvalid: SignupFieldKey | null;
} {
  const errors: Partial<Record<SignupFieldKey, string>> = {};

  if (!fields.name.trim()) {
    errors.name = 'Informe o seu nome.';
  }

  if (!fields.email.trim()) {
    errors.email = 'Informe o seu e-mail.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) {
    errors.email = 'E-mail inválido.';
  }

  if (!fields.emailConfirm.trim()) {
    errors.emailConfirm = 'Confirme o seu e-mail.';
  } else if (
    fields.email.trim() &&
    fields.email.trim().toLowerCase() !== fields.emailConfirm.trim().toLowerCase()
  ) {
    errors.emailConfirm = 'Os e-mails não coincidem.';
  }

  if (!fields.whatsapp.replace(/\D/g, '').trim()) {
    errors.whatsapp = 'Informe o telefone.';
  }

  if (!fields.password) {
    errors.password = 'Informe a sua senha.';
  } else if (fields.password.length < 6) {
    errors.password = 'A senha deve ter pelo menos 6 caracteres.';
  }

  if (!fields.passwordConfirm) {
    errors.passwordConfirm = 'Confirme a sua senha.';
  } else if (fields.password !== fields.passwordConfirm) {
    errors.passwordConfirm = 'As senhas não coincidem.';
  }

  const firstInvalid = SIGNUP_FIELD_ORDER.find((key) => errors[key]) ?? null;
  return { errors, firstInvalid };
}

/** @deprecated Prefer validateMembershipSignupFields */
export function validateMembershipSignupForm(
  fields: SignupFormFields,
): string | null {
  const { errors, firstInvalid } = validateMembershipSignupFields(fields);
  if (!firstInvalid) return null;
  return errors[firstInvalid] ?? 'Preencha todos os campos obrigatórios.';
}
