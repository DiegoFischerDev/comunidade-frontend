'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

const WHATSAPP_NUMBER = '351927398547';
const WHATSAPP_MESSAGE = 'Oi Rafa, preciso de ajuda na comunidade RPM';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

export const OPEN_MEMBERSHIP_MODAL_EVENT = 'open-membership-modal';

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

export function FloatingWhatsAppButton() {
  const [open, setOpen] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [amounts, setAmounts] = useState<{ eurCents: number; pixCentavos: number } | null>(null);
  const [amountsLoading, setAmountsLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const isMember = user?.tier === 'MEMBER';

  const successUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/dashboard/membership/success` : '';
  const cancelUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/dashboard/membership/cancel` : '';

  type PaymentMethod = 'card' | 'mbway' | 'pix';
  async function handleStartCheckout(method: PaymentMethod) {
    if (checkoutLoading || typeof window === 'undefined') return;
    setCheckoutLoading(true);
    try {
      const { url } =
        method === 'pix'
          ? await api.stripe.createPixCheckoutSession({ successUrl, cancelUrl })
          : method === 'mbway'
            ? await api.stripe.createMbWayCheckoutSession({ successUrl, cancelUrl })
            : await api.stripe.createCheckoutSession({ successUrl, cancelUrl });
      window.open(url, '_blank', 'noopener,noreferrer');
      setCheckoutLoading(false);
      closeAll();
    } catch (e) {
      setCheckoutLoading(false);
      const msg = e instanceof Error ? e.message : 'Erro ao iniciar o pagamento.';
      alert(msg);
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

  // Carregar preços ao abrir o modal para exibir no primeiro passo
  useEffect(() => {
    if (!showMembershipModal || amounts !== null || amountsLoading) return;
    setAmountsLoading(true);
    api.stripe
      .getMembershipAmounts()
      .then(setAmounts)
      .catch(() => setAmounts({ eurCents: 2300, pixCentavos: 2300 }))
      .finally(() => setAmountsLoading(false));
  }, [showMembershipModal, amounts, amountsLoading]);

  function closeAll() {
    setOpen(false);
    setShowMembershipModal(false);
    setShowPaymentOptions(false);
  }

  async function handleQueroSerMembro() {
    setShowPaymentOptions(true);
    if (amounts === null && !amountsLoading) {
      setAmountsLoading(true);
      try {
        const data = await api.stripe.getMembershipAmounts();
        setAmounts(data);
      } catch {
        setAmounts({ eurCents: 2300, pixCentavos: 2300 });
      } finally {
        setAmountsLoading(false);
      }
    }
  }

  return (
    <>
      <div ref={containerRef} className="fixed bottom-6 right-6 z-30 flex flex-col items-end">
        {/* Popup pequeno acima do ícone — só quando não está no modal de membros */}
        {open && !showMembershipModal && (
          <div className="absolute bottom-full right-0 mb-2 w-72 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl">
            <p className="text-sm font-medium text-zinc-800">
              Precisa de ajuda? Fale com a Rafa no WhatsApp
            </p>
            <div className="mt-3 flex flex-col gap-2">
              {isMember ? (
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#20BD5A]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Abrir WhatsApp
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowMembershipModal(true)}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#20BD5A]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Abrir WhatsApp
                </button>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-105 hover:shadow-xl"
          aria-label="Ajuda no WhatsApp"
        >
          <svg
            className="h-7 w-7"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </button>
      </div>

      {/* Modal fullscreen só para "Junte-se à Comunidade" */}
      {open && showMembershipModal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={closeAll}
          role="presentation"
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-5 pt-10 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeAll}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-zinc-200 text-zinc-700 shadow-sm transition-colors hover:bg-white hover:text-zinc-900"
              aria-label="Fechar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <>
              <div className="-mx-5 -mt-5 mb-4 overflow-hidden rounded-t-2xl">
                <div className="relative h-40 w-full">
                  <img
                    src="/comunidade_bg.svg"
                    alt=""
                    className="h-full w-full object-cover object-center"
                  />
                </div>
                <div className="bg-white px-4 pb-3 pt-3 text-center">
                  <h3 className="text-lg font-bold tracking-tight text-zinc-900">
                    Junte-se à Comunidade RPM
                  </h3>
                  {!showPaymentOptions && (
                    <p className="mt-0.5 text-sm font-medium text-zinc-600">
                      {amountsLoading ? (
                        'A carregar…'
                      ) : amounts ? (
                        <>
                          {formatEur(amounts.eurCents)}/ano — menos de{' '}
                          {Math.ceil(amounts.eurCents / 100 / 12)} € por mês
                        </>
                      ) : (
                        'Acesso por 1 ano — escolha a forma de pagamento'
                      )}
                    </p>
                  )}
                </div>
              </div>

              {!showPaymentOptions ? (
                <>
                  <p className="text-sm leading-relaxed text-zinc-700 mb-4">
                    Por menos de um café por mês, tenha acesso a tudo o que a comunidade oferece e
                    descontos exclusivos em forma de cashback.
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    O que inclui:
                  </p>
                  <ul className="mt-2 space-y-2 text-sm text-zinc-700">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600" aria-hidden>✓</span>
                      <span><strong className="text-zinc-800">até 20 € de cashback</strong> em cada serviço que contratar aos parceiros.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600" aria-hidden>✓</span>
                      <span><strong className="text-zinc-800">Ebook Portugal Sem Perrenge</strong> — acesso completo ao guia.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600" aria-hidden>✓</span>
                      <span><strong className="text-zinc-800">Suporte de imigração</strong> — contacto direto com a Rafa e a equipe.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600" aria-hidden>✓</span>
                      <span><strong className="text-zinc-800">Grupos exclusivos no WhatsApp</strong> — rede e conteúdo só para membros.</span>
                    </li>
                  </ul>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={handleQueroSerMembro}
                      className="w-full rounded-full bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-emerald-700"
                    >
                      Ativar acesso
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-4 flex flex-col gap-3">
                    <button
                      type="button"
                      disabled={checkoutLoading}
                      onClick={() => handleStartCheckout('card')}
                      className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                        <svg aria-hidden width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10">
                          <path fill="#D8DEE4" d="M0 0h32v32H0z" />
                          <path fillRule="evenodd" clipRule="evenodd" d="M6 10.375C6 9.339 6.84 8.5 7.875 8.5h16.25C25.16 8.5 26 9.34 26 10.375v11.25c0 1.035-.84 1.875-1.875 1.875H7.875A1.875 1.875 0 0 1 6 21.625v-11.25Zm1.875 0h16.25v1.875H7.875v-1.875Zm16.25 3.75v7.5H7.875v-7.5h16.25Z" fill="#474E5A" />
                          <path fillRule="evenodd" clipRule="evenodd" d="M14.75 18.813c0-.518.42-.938.938-.938h5.624a.937.937 0 1 1 0 1.875h-5.625a.937.937 0 0 1-.937-.938Z" fill="#474E5A" />
                        </svg>
                      </span>
                      <span className="flex-1 font-medium text-zinc-800">Cartão</span>
                      {amounts && <span className="text-sm font-semibold text-emerald-700">{formatEur(amounts.eurCents)}</span>}
                    </button>
                    <button
                      type="button"
                      disabled={checkoutLoading}
                      onClick={() => handleStartCheckout('mbway')}
                      className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                        <svg aria-hidden width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10">
                          <path fill="#2E333A" d="M0 0h32v32H0z" />
                          <path fill="red" d="M7.792 26.001h16.417c1.885 0 1.904-1.729 1.712-2.759-.105-.694-1.235-.687-1.36 0v.804a.657.657 0 0 1-.642.669H8.079c-.352 0-.64-.301-.64-.67v-.803c-.125-.687-1.256-.694-1.36 0-.192 1.03-.175 2.759 1.713 2.759Zm15.052-20H9.216c-.895 0-1.628.407-1.627 1.393v.881c0 1.172 1.503 1.18 1.503-.025v-.458a.532.532 0 0 1 .52-.542h12.763a.533.533 0 0 1 .372.163.532.532 0 0 1 .15.379v.468c0 1.2 1.574 1.204 1.574-.008v-.858c0-.986-.732-1.394-1.627-1.394Z" />
                          <path fill="#fff" fillRule="evenodd" d="M24.15 15.853a2.629 2.629 0 0 1 1.492 2.349c0 1.444-1.212 2.625-2.692 2.625h-4.147a.7.7 0 0 1-.706-.687v-8.22c0-.397.312-.722.693-.722h3.455c1.454 0 2.644 1.238 2.644 2.751a2.8 2.8 0 0 1-.739 1.904Zm-3.096-.67h1.318v-.015c.6-.096 1.062-.639 1.062-1.29 0-.717-.562-1.304-1.252-1.304h-2.653v6.822h3.364c.712 0 1.294-.607 1.294-1.348 0-.741-.583-1.347-1.294-1.347h-.521l-1.318-.003a.745.745 0 0 1-.727-.757c0-.417.327-.758.727-.758Zm-3.616 4.824a.858.858 0 0 1-.74.954.841.841 0 0 1-.915-.771l-.683-6.538-2.416 6.393-.003.006-.006.017-.006.013v.004l-.006.013-.01.02-.003.007-.006.012a.868.868 0 0 1-.171.234l-.015.015a.822.822 0 0 1-.144.106l-.004.001-.016.01-.015.008-.006.004-.02.008-.01.005-.01.004-.008.005-.016.006-.013.005-.01.004a.813.813 0 0 1-.25.05h-.061a.802.802 0 0 1-.272-.059l-.012-.005-.013-.005-.012-.005-.008-.005-.01-.003-.015-.01-.015-.007-.014-.008-.008-.004a.839.839 0 0 1-.127-.093l-.004-.002-.027-.025a.856.856 0 0 1-.022-.021l-.02-.023a.992.992 0 0 1-.025-.029l-.002-.003a.858.858 0 0 1-.088-.133l-.005-.007-.006-.013-.009-.019-.002-.005-.005-.01-.005-.01-.004-.01-.005-.01-.004-.012-.006-.015-2.418-6.398-.682 6.538a.84.84 0 0 1-.09.317.841.841 0 0 1-.207.259.84.84 0 0 1-.29.159.842.842 0 0 1-.328.035.859.859 0 0 1-.74-.954l.804-7.708v-.005a1.459 1.459 0 0 1 .689-1.088c.229-.135.491-.201.757-.19h.002c.09.004.175.016.253.034.43.105.795.417.967.872l2.06 5.446 2.056-5.446c.172-.455.537-.767.967-.872a1.378 1.378 0 0 1 1.546.726c.083.162.136.338.155.518v.004l.807 7.71Z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span className="flex-1 font-medium text-zinc-800">MB WAY</span>
                      {amounts && <span className="text-sm font-semibold text-emerald-700">{formatEur(amounts.eurCents)}</span>}
                    </button>
                    <button
                      type="button"
                      disabled={checkoutLoading}
                      onClick={() => handleStartCheckout('pix')}
                      className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                        <svg aria-hidden width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" className="h-10 w-10">
                          <path fill="#32BCAD" d="M0 0h32v32H0z" />
                          <path fillRule="evenodd" clipRule="evenodd" d="M9.572 9.627c.942 0 1.827.366 2.493 1.032l3.613 3.614a.67.67 0 0 0 .946 0l3.6-3.6a3.504 3.504 0 0 1 2.493-1.033h.433l-4.571-4.572a3.645 3.645 0 0 0-5.157 0l-4.56 4.559h.71ZM22.717 22.36a3.503 3.503 0 0 1-2.493-1.032l-3.6-3.6a.684.684 0 0 0-.946 0l-3.613 3.613a3.503 3.503 0 0 1-2.493 1.032h-.709l4.559 4.56a3.646 3.646 0 0 0 5.156 0l4.573-4.573h-.434Z" fill="#fff" />
                          <path fillRule="evenodd" clipRule="evenodd" d="m24.169 10.659 2.763 2.763a3.646 3.646 0 0 1 0 5.156L24.17 21.34a.525.525 0 0 0-.196-.039h-1.256a2.483 2.483 0 0 1-1.744-.723l-3.6-3.6c-.653-.653-1.79-.653-2.444 0l-3.613 3.613a2.483 2.483 0 0 1-1.745.723H8.028a.526.526 0 0 0-.185.037l-2.774-2.774a3.646 3.646 0 0 1 0-5.156l2.774-2.774c.058.022.12.037.185.037h1.545c.65 0 1.285.264 1.745.723l3.613 3.613a1.723 1.723 0 0 0 1.883.374c.21-.087.4-.214.56-.375l3.6-3.6c.464-.46 1.09-.72 1.744-.722h1.256a.52.52 0 0 0 .195-.04Z" fill="#fff" />
                        </svg>
                      </span>
                      <span className="flex-1 font-medium text-zinc-800">Pix</span>
                      {amounts && <span className="text-sm font-semibold text-emerald-700">{formatBrl(amounts.pixCentavos)}</span>}
                    </button>
                  </div>
                </>
              )}
            </>
          </div>
        </div>
      )}
    </>
  );
}
