'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginWhatsappFields } from '@/components/auth/LoginWhatsappFields';
import { KiwiFloatInput } from '@/components/membership/KiwiFloatInput';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { isActiveMember } from '@/lib/membership-access';
import {
  DEFAULT_MEMBERSHIP_AMOUNTS,
  formatMembershipBrl,
  formatMembershipEur,
  getMembershipCancelUrl,
  getMembershipSuccessUrl,
  MEMBERSHIP_PRODUCT_SUBTITLE,
  MEMBERSHIP_PRODUCT_TITLE,
  readAffiliateCodeFromStorage,
  type MembershipAmounts,
  type MembershipPaymentMethod,
  type SignupFieldKey,
  validateMembershipSignupFields,
} from '@/lib/membership-checkout';

function LockIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512.005 512.005"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        d="M256.003,234.672c-11.76,0-21.333,9.573-21.333,21.333c0,7.792,4.409,14.329,10.667,18.053v13.947
        c0,5.896,4.771,10.667,10.667,10.667c5.896,0,10.667-4.771,10.667-10.667v-13.947c6.258-3.724,10.667-10.262,10.667-18.053
        C277.336,244.245,267.763,234.672,256.003,234.672z"
      />
      <path
        fill="currentColor"
        d="M256.003,149.339c-17.646,0-32,14.354-32,32v10.667h64v-10.667C288.003,163.693,273.648,149.339,256.003,149.339z"
      />
      <path
        fill="currentColor"
        d="M440.888,64.609l-181.333-64c-2.292-0.813-4.812-0.813-7.104,0l-181.333,64c-4.26,1.51-7.115,5.542-7.115,10.063v128
        c0,165.646,24.563,226.188,187.198,308.188c1.51,0.76,3.156,1.146,4.802,1.146c1.646,0,3.292-0.385,4.802-1.146
        c162.635-82,187.198-142.542,187.198-308.188v-128C448.003,70.151,445.148,66.12,440.888,64.609z M352.003,320.005
        c0,11.76-9.573,21.333-21.333,21.333H181.336c-11.76,0-21.333-9.573-21.333-21.333V213.339c0-11.76,9.573-21.333,21.333-21.333
        v-10.667c0-41.167,33.5-74.667,74.667-74.667s74.667,33.5,74.667,74.667v10.667c11.76,0,21.333,9.573,21.333,21.333V320.005z"
      />
    </svg>
  );
}

const PAYMENT_OPTIONS: {
  id: MembershipPaymentMethod;
  label: string;
  priceKey: 'eur' | 'brl';
  iconSrc: string;
  iconClassName?: string;
}[] = [
  { id: 'pix', label: 'Pix', priceKey: 'brl', iconSrc: '/checkout-pix.svg' },
  { id: 'card', label: 'Cartão', priceKey: 'eur', iconSrc: '/checkout-card.png' },
  {
    id: 'mbway',
    label: 'MB WAY',
    priceKey: 'eur',
    iconSrc: '/checkout-mbway.png',
    iconClassName: 'h-6 w-auto max-w-[5.5rem]',
  },
];

export function MembershipCheckoutView() {
  const router = useRouter();
  const { user } = useAuth();
  const needsSignupForm = !user;
  const memberActive = isActiveMember(user);

  const [amounts, setAmounts] = useState<MembershipAmounts | null>(null);
  const [amountsLoading, setAmountsLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<MembershipPaymentMethod>('pix');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<SignupFieldKey, string>>>({});

  const fieldRefs = {
    name: useRef<HTMLDivElement>(null),
    email: useRef<HTMLDivElement>(null),
    emailConfirm: useRef<HTMLDivElement>(null),
    whatsapp: useRef<HTMLDivElement>(null),
    password: useRef<HTMLDivElement>(null),
    passwordConfirm: useRef<HTMLDivElement>(null),
  };

  function clearFieldError(key: SignupFieldKey) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function scrollToInvalidField(key: SignupFieldKey) {
    const container = fieldRefs[key].current;
    if (!container) return;
    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const focusable = container.querySelector<HTMLElement>(
      'input:not([disabled]), select:not([disabled])',
    );
    window.setTimeout(() => focusable?.focus(), 350);
  }

  useEffect(() => {
    if (user) {
      setName(user.name ?? '');
      setEmail(user.email ?? '');
    }
  }, [user]);

  useEffect(() => {
    if (memberActive) return;
    setAmountsLoading(true);
    api.stripe
      .getMembershipAmounts()
      .then(setAmounts)
      .catch(() => setAmounts(DEFAULT_MEMBERSHIP_AMOUNTS))
      .finally(() => setAmountsLoading(false));
  }, [memberActive]);

  const displayAmounts = amounts ?? DEFAULT_MEMBERSHIP_AMOUNTS;

  const payLabel = useMemo(() => {
    if (paymentMethod === 'pix') {
      return `Pagar ${formatMembershipBrl(displayAmounts.pixCentavos)}`;
    }
    return `Pagar ${formatMembershipEur(displayAmounts.eurCents)}`;
  }, [displayAmounts, paymentMethod]);

  const orderPrice =
    paymentMethod === 'pix'
      ? formatMembershipBrl(displayAmounts.pixCentavos)
      : formatMembershipEur(displayAmounts.eurCents);

  async function handlePay() {
    if (checkoutLoading || typeof window === 'undefined') return;

    if (memberActive) {
      alert(
        'Você já é membro ativo da Comunidade Rafa Portugal. Não é necessário pagar novamente a anuidade.',
      );
      router.push('/dashboard');
      return;
    }

    if (needsSignupForm) {
      const { errors, firstInvalid } = validateMembershipSignupFields({
        name,
        email,
        emailConfirm,
        whatsapp,
        password,
        passwordConfirm,
      });
      if (firstInvalid) {
        setFieldErrors(errors);
        setError('Corrija os campos assinalados antes de continuar.');
        scrollToInvalidField(firstInvalid);
        return;
      }
    }

    setFieldErrors({});
    setError('');
    setCheckoutLoading(true);

    const successUrl = getMembershipSuccessUrl();
    const cancelUrl = getMembershipCancelUrl();
    const affiliateCode = readAffiliateCodeFromStorage();

    try {
      const { url } = needsSignupForm
        ? await api.stripe.createGuestMembershipCheckout({
            name: name.trim(),
            email: email.trim(),
            whatsapp,
            password,
            passwordConfirm,
            successUrl,
            cancelUrl,
            paymentMethod,
            affiliateCode,
          })
        : paymentMethod === 'pix'
          ? await api.stripe.createPixCheckoutSession({ successUrl, cancelUrl })
          : paymentMethod === 'mbway'
            ? await api.stripe.createMbWayCheckoutSession({ successUrl, cancelUrl })
            : await api.stripe.createCheckoutSession({ successUrl, cancelUrl });

      window.location.assign(url);
    } catch (e) {
      setCheckoutLoading(false);
      setError(e instanceof Error ? e.message : 'Erro ao iniciar o pagamento.');
    }
  }

  if (memberActive) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-zinc-900">Já és membro ativo</h1>
        <p className="mt-2 text-sm text-zinc-600">
          A tua anuidade está em dia. Não é necessário pagar novamente.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-md bg-[#28b463] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Ir para o dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] py-4 sm:py-8">
      <div className="mx-auto max-w-[1000px] px-2 sm:px-4">
        {/* Banner superior (estilo Kiwify) */}
        <div className="flex justify-center p-2">
          <div className="w-[220px]">
            <Image
              src="/rafa_cards/membro_vip_modal3.png"
              alt="Membro VIP — Comunidade Rafa Portugal"
              width={220}
              height={330}
              className="h-auto w-full"
              priority
              unoptimized
            />
          </div>
        </div>

        {/* Cabeçalho do produto */}
        <div className="p-2">
          <div className="flex w-full items-center rounded-md bg-transparent p-4">
            <Image
              src="/logo_principal2.png"
              alt=""
              width={128}
              height={128}
              className="relative max-h-32 w-auto max-w-[128px] rounded-md object-contain"
            />
            <div className="ml-4 flex min-w-0 flex-1 items-end">
              <div>
                <h1 className="text-2xl font-bold text-black">{MEMBERSHIP_PRODUCT_TITLE}</h1>
                <p className="mt-0.5 text-sm text-zinc-600">{MEMBERSHIP_PRODUCT_SUBTITLE}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Card de checkout */}
        <div className="mx-auto max-w-2xl sm:p-2">
          <div
            id="checkoutblock"
            className="mb-4 w-full rounded-md bg-white px-3 py-4 text-black shadow-sm sm:border sm:border-zinc-200 md:px-6"
          >
            {error ? (
              <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            ) : null}

            {needsSignupForm ? (
              <div className="w-full pt-2">
                <div ref={fieldRefs.name}>
                  <KiwiFloatInput
                    id="checkout-name"
                    label="Nome"
                    name="fullname"
                    autoComplete="name"
                    value={name}
                    error={fieldErrors.name}
                    onChange={(e) => {
                      setName(e.target.value);
                      clearFieldError('name');
                    }}
                    disabled={checkoutLoading}
                  />
                </div>
                <div ref={fieldRefs.email}>
                  <KiwiFloatInput
                    id="checkout-email"
                    label="E-mail"
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    error={fieldErrors.email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearFieldError('email');
                    }}
                    disabled={checkoutLoading}
                  />
                </div>
                <div ref={fieldRefs.emailConfirm}>
                  <KiwiFloatInput
                  id="checkout-email-confirm"
                  label="Confirmar e-mail"
                  type="email"
                  name="email_confirm"
                  autoComplete="email"
                  value={emailConfirm}
                  error={fieldErrors.emailConfirm}
                  onChange={(e) => {
                    setEmailConfirm(e.target.value);
                    clearFieldError('emailConfirm');
                  }}
                  disabled={checkoutLoading}
                />
                </div>
                <div className="pb-3" ref={fieldRefs.whatsapp}>
                  <LoginWhatsappFields
                    idPrefix="checkout"
                    label="Telefone / WhatsApp"
                    value={whatsapp}
                    error={fieldErrors.whatsapp}
                    onChange={(v) => {
                      setWhatsapp(v);
                      clearFieldError('whatsapp');
                    }}
                    disabled={checkoutLoading}
                  />
                </div>
                <div ref={fieldRefs.password}>
                  <KiwiFloatInput
                    id="checkout-password"
                    label="Senha (mín. 6 caracteres)"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    value={password}
                    error={fieldErrors.password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearFieldError('password');
                    }}
                    disabled={checkoutLoading}
                  />
                </div>
                <div ref={fieldRefs.passwordConfirm}>
                  <KiwiFloatInput
                    id="checkout-password-confirm"
                    label="Confirmar senha"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    value={passwordConfirm}
                    error={fieldErrors.passwordConfirm}
                    onChange={(e) => {
                      setPasswordConfirm(e.target.value);
                      clearFieldError('passwordConfirm');
                    }}
                    disabled={checkoutLoading}
                  />
                </div>
              </div>
            ) : (
              <p className="pb-4 text-sm text-zinc-600">
                Olá, <span className="font-semibold text-zinc-900">{user?.name}</span>. Escolhe a
                forma de pagamento para renovar ou ativar a tua anuidade.
              </p>
            )}

            {/* Formas de pagamento */}
            <div className="mt-6 flex flex-col justify-center">
              <div className="mb-4 flex w-full sm:py-2">
                <div className="grid w-full grid-cols-2 gap-2 md:grid-cols-3">
                  {PAYMENT_OPTIONS.map((opt) => {
                    const selected = paymentMethod === opt.id;
                    const price =
                      opt.priceKey === 'eur'
                        ? formatMembershipEur(displayAmounts.eurCents)
                        : formatMembershipBrl(displayAmounts.pixCentavos);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={checkoutLoading || amountsLoading}
                        onClick={() => setPaymentMethod(opt.id)}
                        className={`cursor-pointer rounded-md border p-3 text-sm font-semibold shadow-sm transition duration-200 ease-out ${
                          selected
                            ? 'border-[rgb(5,112,222)] text-[rgb(5,112,222)]'
                            : 'border-zinc-200 text-zinc-600 hover:text-zinc-700'
                        }`}
                        style={
                          selected
                            ? {
                                boxShadow:
                                  'rgba(0, 0, 0, 0.03) 0px 1px 1px, rgba(0, 0, 0, 0.02) 0px 3px 6px, rgb(5, 112, 222) 0px 0px 0px 1px',
                              }
                            : undefined
                        }
                      >
                        <div className="flex flex-col items-start gap-1">
                          <Image
                            src={opt.iconSrc}
                            alt=""
                            width={96}
                            height={24}
                            className={opt.iconClassName ?? 'h-6 w-6 object-contain object-left'}
                            unoptimized
                          />
                          <span>{opt.label}</span>
                          {!amountsLoading ? (
                            <span className="text-xs font-bold">{price}</span>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex w-full items-center gap-2 text-sm text-zinc-600">
              <LockIcon />
              <p className="text-xs">
                Os pagamentos são processados de forma segura pela Stripe, com encriptação ao nível
                bancário.
              </p>
            </div>

            {/* Resumo do pedido */}
            <div className="mt-6 w-full pb-2">
              <h2 className="pb-2 pt-2 text-base font-extrabold text-zinc-900">Resumo do pedido</h2>
              <div className="mt-2 w-full">
                <div className="flex bg-zinc-200 p-2 text-sm font-bold text-zinc-700">
                  <div className="flex-1 p-2">Produto</div>
                  <div className="p-2">Preço</div>
                </div>
              </div>
              <div className="flex text-sm text-zinc-800">
                <div className="flex-1 p-2">
                  <span>
                    {MEMBERSHIP_PRODUCT_TITLE} — {MEMBERSHIP_PRODUCT_SUBTITLE}
                  </span>
                </div>
                <div className="p-2 font-bold">{orderPrice}</div>
              </div>
              <div className="flex text-sm text-zinc-800">
                <div className="flex-1 p-2 font-bold">Total</div>
                <div className="p-2 font-bold text-[#28b463]">{orderPrice}</div>
              </div>
              <div className="mt-2 h-2 w-full border-b border-zinc-200" />
            </div>

            <div className="mt-4 w-full">
              <button
                type="button"
                disabled={checkoutLoading || amountsLoading}
                onClick={() => void handlePay()}
                className="w-full cursor-pointer rounded-md p-4 text-center text-lg font-semibold text-white transition duration-75 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  backgroundColor: '#28b463',
                  fontFamily:
                    'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
                }}
              >
                {checkoutLoading ? 'A redirecionar…' : payLabel}
              </button>

              <p className="bottom-0 pt-3 text-center text-[11px] leading-relaxed text-zinc-500">
                Ao clicar em &quot;{payLabel}&quot;, confirmas que leste e aceitas os termos da
                Comunidade Rafa Portugal. O pagamento é processado pela{' '}
                <span className="font-semibold">Stripe</span>. Após a confirmação, a tua conta de
                membro é criada instantaneamente.
              </p>
            </div>
          </div>

          <p className="pb-8 text-center">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-zinc-600 underline-offset-2 hover:text-zinc-900 hover:underline"
            >
              Voltar ao dashboard
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
