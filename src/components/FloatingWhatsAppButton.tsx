'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

const WHATSAPP_NUMBER = '351927398547';
const WHATSAPP_MESSAGE = 'Oi Rafa, preciso de ajuda na comunidade RPM';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

export const OPEN_MEMBERSHIP_MODAL_EVENT = 'open-membership-modal';

export function FloatingWhatsAppButton() {
  const [open, setOpen] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
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
      window.location.href = url;
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

  function closeAll() {
    setOpen(false);
    setShowMembershipModal(false);
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
                    <p className="mt-0.5 text-sm font-medium text-zinc-600">
                      23 €/ano — menos de 2 € por mês
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-zinc-700 mb-6">
                  Por menos de um café por mês, 
                  tenha acesso a tudo o que a comunidade oferece e tenha descontos exclusivos em forma de cashback
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
                <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
                  <button
                    type="button"
                    disabled={checkoutLoading}
                    onClick={() => handleStartCheckout('card')}
                    className="w-full shrink-0 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                  >
                    {checkoutLoading ? 'A redirecionar…' : 'Cartão'}
                  </button>
                  <button
                    type="button"
                    disabled={checkoutLoading}
                    onClick={() => handleStartCheckout('mbway')}
                    className="w-full shrink-0 rounded-full border-2 border-emerald-600 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                  >
                    {checkoutLoading ? 'A redirecionar…' : 'MB WAY'}
                  </button>
                  <button
                    type="button"
                    disabled={checkoutLoading}
                    onClick={() => handleStartCheckout('pix')}
                    className="w-full shrink-0 rounded-full border-2 border-emerald-600 bg-white px-5 py-3 text-sm font-semibold text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
                  >
                    {checkoutLoading ? 'A redirecionar…' : 'Pix'}
                  </button>
                  <button
                    type="button"
                    onClick={closeAll}
                    className="w-full shrink-0 rounded-full border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 md:hidden"
                  >
                    Fechar
                  </button>
                </div>
              </>
          </div>
        </div>
      )}
    </>
  );
}
