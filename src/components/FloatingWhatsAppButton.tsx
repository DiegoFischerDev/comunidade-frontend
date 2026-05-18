'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { isActiveMember } from '@/lib/membership-access';
import { CardButton } from '@/components/ui/CardButton';
import { LoginWhatsappFields } from '@/components/auth/LoginWhatsappFields';

const WHATSAPP_NUMBER = '351927398547';
const WHATSAPP_MESSAGE = 'Ola, preciso de ajuda na Comunidade Rafa Portugal';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

export const OPEN_MEMBERSHIP_MODAL_EVENT = 'open-membership-modal';

/** Disparado após guardar o perfil (ex.: para atualizar listagens que usam dados de utilizadores). */
export const USER_PROFILE_UPDATED_EVENT = 'user-profile-updated';

function formatEur(cents: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatBrl(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(centavos / 100);
}

type FloatingWhatsAppButtonProps = {
  /** Esconde o botão e o popup (display: none); o modal VIP continua a abrir via evento. */
  hideFloatingButton?: boolean;
};

type MembershipAmounts = {
  eurCents: number;
  pixCentavos: number;
};

const DEFAULT_MEMBERSHIP_AMOUNTS: MembershipAmounts = {
  eurCents: 2300,
  pixCentavos: 2300,
};

export function FloatingWhatsAppButton({
  hideFloatingButton = false,
}: FloatingWhatsAppButtonProps) {
  const [open, setOpen] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [amounts, setAmounts] = useState<MembershipAmounts | null>(null);
  const [amountsLoading, setAmountsLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [signupError, setSignupError] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupWhatsapp, setSignupWhatsapp] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const memberActive = isActiveMember(user);

  const successUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/dashboard/membership/success`
      : '';
  const cancelUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/dashboard/membership/cancel`
      : '';

  const needsSignupForm = !user;

  type PaymentMethod = 'card' | 'mbway' | 'pix';

  function validateSignupForm(): string | null {
    if (!signupName.trim()) return 'Informe o seu nome.';
    if (!signupEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail.trim())) {
      return 'Informe um e-mail válido.';
    }
    if (!signupWhatsapp.replace(/\D/g, '').trim()) return 'Informe o WhatsApp.';
    if (signupPassword.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
    if (signupPassword !== signupPasswordConfirm) return 'As senhas não coincidem.';
    return null;
  }

  async function handleStartCheckout(method: PaymentMethod) {
    if (checkoutLoading || typeof window === 'undefined') return;

    if (memberActive) {
      alert(
        'Você já é membro ativo da Comunidade Rafa Portugal. Não é necessário pagar novamente a anuidade.',
      );
      closeAll();
      return;
    }

    if (needsSignupForm) {
      const err = validateSignupForm();
      if (err) {
        setSignupError(err);
        return;
      }
    }

    setSignupError('');
    setCheckoutLoading(true);
    try {
      let affiliateCode: string | undefined;
      if (typeof window !== 'undefined') {
        const refRaw = window.localStorage.getItem('comunidade_ref_affiliate');
        if (refRaw && refRaw !== 'nenhum' && refRaw.trim()) {
          affiliateCode = refRaw.trim();
        }
      }

      const { url } = needsSignupForm
        ? await api.stripe.createGuestMembershipCheckout({
            name: signupName.trim(),
            email: signupEmail.trim(),
            whatsapp: signupWhatsapp,
            password: signupPassword,
            passwordConfirm: signupPasswordConfirm,
            successUrl,
            cancelUrl,
            paymentMethod: method,
            affiliateCode,
          })
        : method === 'pix'
          ? await api.stripe.createPixCheckoutSession({ successUrl, cancelUrl })
          : method === 'mbway'
            ? await api.stripe.createMbWayCheckoutSession({ successUrl, cancelUrl })
            : await api.stripe.createCheckoutSession({ successUrl, cancelUrl });

      window.location.assign(url);
      setCheckoutLoading(false);
      closeAll();
    } catch (e) {
      setCheckoutLoading(false);
      const msg = e instanceof Error ? e.message : 'Erro ao iniciar o pagamento.';
      if (needsSignupForm) setSignupError(msg);
      else alert(msg);
    }
  }

  useEffect(() => {
    if (!open || showMembershipModal) return;
    const handler = (e: MouseEvent) => {
      const el = containerRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, showMembershipModal]);

  useEffect(() => {
    const handler = () => {
      setOpen(true);
      setShowMembershipModal(true);
    };
    window.addEventListener(OPEN_MEMBERSHIP_MODAL_EVENT, handler);
    return () => window.removeEventListener(OPEN_MEMBERSHIP_MODAL_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!showMembershipModal || amounts !== null || amountsLoading) return;
    setAmountsLoading(true);
    api.stripe
      .getMembershipAmounts()
      .then(setAmounts)
      .catch(() => setAmounts(DEFAULT_MEMBERSHIP_AMOUNTS))
      .finally(() => setAmountsLoading(false));
  }, [showMembershipModal, amounts, amountsLoading]);

  function closeAll() {
    setOpen(false);
    setShowMembershipModal(false);
    setShowPaymentOptions(false);
    setSignupError('');
  }

  async function handleQueroSerMembro() {
    if (memberActive) {
      alert(
        'Você já é membro ativo da Comunidade Rafa Portugal. Se precisar de ajuda, fale com a Rafa pelo WhatsApp.',
      );
      closeAll();
      return;
    }

    setShowPaymentOptions(true);
    if (amounts === null && !amountsLoading) {
      setAmountsLoading(true);
      try {
        const data = await api.stripe.getMembershipAmounts();
        setAmounts(data);
      } catch {
        setAmounts(DEFAULT_MEMBERSHIP_AMOUNTS);
      } finally {
        setAmountsLoading(false);
      }
    }
  }

  return (
    <>
      <div
        ref={containerRef}
        className={`fixed bottom-6 right-6 z-30 flex flex-col items-end${hideFloatingButton ? ' hidden' : ''}`}
        aria-hidden={hideFloatingButton}
      >
        {open && !showMembershipModal && (
          <div className="absolute bottom-full right-0 mb-2 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl">
            <p className="text-sm font-medium text-zinc-800">
              Precisa de ajuda? Fale com a nossa equipe no whatsapp
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {memberActive ? (
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2.5 text-sm font-medium text-white hover:from-[#c07c01] hover:to-[#e7a01f]"
                >
                  Abrir WhatsApp
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMembershipModal(true)}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#d58901] to-[#f0b23a] px-4 py-2.5 text-sm font-medium text-white hover:from-[#c07c01] hover:to-[#e7a01f]"
                >
                  Abrir WhatsApp
                </button>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-[#d58901] to-[#f0b23a] text-white shadow-lg transition-transform hover:scale-105 hover:shadow-xl"
          aria-label="Ajuda no WhatsApp"
        >
          <svg className="h-7 w-7" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </button>
      </div>

      {open && showMembershipModal && (
        <div
          className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
          onClick={closeAll}
          role="presentation"
        >
          <div
            className="relative my-8 w-full max-w-md rounded-2xl bg-white p-0 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeAll}
              className="absolute right-2 top-2 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-black/30 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/45"
              aria-label="Fechar"
            >
              ✕
            </button>

            {!showPaymentOptions ? (
              <div className="relative overflow-hidden rounded-2xl">
                <Image
                  src="/rafa_cards/membro_vip_modal3.png"
                  alt="Membro VIP — oferta Comunidade Rafa Portugal"
                  width={800}
                  height={1200}
                  className="h-auto w-full max-h-[min(85vh,52rem)] object-contain object-top"
                  sizes="(max-width: 448px) 100vw, 28rem"
                  unoptimized
                  priority
                />
                <div className="absolute inset-x-0 bottom-10 z-10 flex justify-center px-4 sm:bottom-12">
                  <CardButton
                    type="button"
                    onClick={handleQueroSerMembro}
                    variant="primary"
                    className="pointer-events-auto !w-[10.5rem] text-sm shadow-lg sm:!w-44 sm:text-base"
                  >
                    Ativar acesso
                  </CardButton>
                </div>
              </div>
            ) : (
              <div className="max-h-[min(90vh,40rem)] overflow-y-auto p-5 pt-10">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  {needsSignupForm ? 'Criar conta e pagar anuidade' : 'Escolha a forma de pagamento'}
                </p>
                <p className="mb-4 text-sm text-zinc-600">
                  {needsSignupForm
                    ? 'Preencha os seus dados e escolha como pagar. A conta é criada após a confirmação do pagamento.'
                    : 'Renove o seu acesso à comunidade escolhendo a forma de pagamento.'}
                </p>

                {needsSignupForm ? (
                  <div className="mb-4 space-y-3">
                    {signupError ? (
                      <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                        {signupError}
                      </div>
                    ) : null}
                    <div>
                      <label htmlFor="vip-signup-name" className="block text-xs font-medium text-zinc-700">
                        Nome
                      </label>
                      <input
                        id="vip-signup-name"
                        type="text"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        autoComplete="name"
                      />
                    </div>
                    <div>
                      <label htmlFor="vip-signup-email" className="block text-xs font-medium text-zinc-700">
                        E-mail
                      </label>
                      <input
                        id="vip-signup-email"
                        type="email"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        autoComplete="email"
                      />
                    </div>
                    <LoginWhatsappFields
                      idPrefix="vip-signup"
                      value={signupWhatsapp}
                      onChange={setSignupWhatsapp}
                      disabled={checkoutLoading}
                    />
                    <div>
                      <label htmlFor="vip-signup-password" className="block text-xs font-medium text-zinc-700">
                        Senha (mín. 6 caracteres)
                      </label>
                      <input
                        id="vip-signup-password"
                        type="password"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        minLength={6}
                        autoComplete="new-password"
                        disabled={checkoutLoading}
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="vip-signup-password-confirm"
                        className="block text-xs font-medium text-zinc-700"
                      >
                        Confirmar senha
                      </label>
                      <input
                        id="vip-signup-password-confirm"
                        type="password"
                        value={signupPasswordConfirm}
                        onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                        minLength={6}
                        autoComplete="new-password"
                        disabled={checkoutLoading}
                        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                ) : null}

                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Forma de pagamento
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    disabled={checkoutLoading}
                    onClick={() => void handleStartCheckout('card')}
                    className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span className="flex-1 font-medium text-zinc-800">Cartão</span>
                    {amounts && (
                      <span className="text-sm font-semibold text-emerald-700">
                        {formatEur(amounts.eurCents)}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={checkoutLoading}
                    onClick={() => void handleStartCheckout('mbway')}
                    className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span className="flex-1 font-medium text-zinc-800">MB WAY</span>
                    {amounts && (
                      <span className="text-sm font-semibold text-emerald-700">
                        {formatEur(amounts.eurCents)}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={checkoutLoading}
                    onClick={() => void handleStartCheckout('pix')}
                    className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span className="flex-1 font-medium text-zinc-800">Pix</span>
                    {amounts && (
                      <span className="text-sm font-semibold text-emerald-700">
                        {formatBrl(amounts.pixCentavos)}
                      </span>
                    )}
                  </button>
                </div>
                {checkoutLoading ? (
                  <p className="mt-3 text-center text-xs text-zinc-500">A redirecionar para o pagamento…</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
