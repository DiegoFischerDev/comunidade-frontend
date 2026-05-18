export const MEMBERSHIP_PRODUCT_TITLE = 'Comunidade Rafa Portugal';
export const MEMBERSHIP_PRODUCT_SUBTITLE = 'Anuidade — acesso membro VIP (1 ano)';

export type MembershipAmounts = {
  eurCents: number;
  pixCentavos: number;
};

export const DEFAULT_MEMBERSHIP_AMOUNTS: MembershipAmounts = {
  eurCents: 2300,
  pixCentavos: 2300,
};

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
