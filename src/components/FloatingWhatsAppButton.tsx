'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isActiveMember } from '@/lib/membership-access';
import {
  MEMBERSHIP_CHECKOUT_PATH,
  OPEN_MEMBERSHIP_MODAL_EVENT,
} from '@/lib/auth-ui-events';
import { CardButton } from '@/components/ui/CardButton';

const WHATSAPP_NUMBER = '351927398547';
const WHATSAPP_MESSAGE = 'Ola, preciso de ajuda na Comunidade Rafa Portugal';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;

export { OPEN_MEMBERSHIP_MODAL_EVENT };

/** Disparado após guardar o perfil (ex.: para atualizar listagens que usam dados de utilizadores). */
export const USER_PROFILE_UPDATED_EVENT = 'user-profile-updated';

type FloatingWhatsAppButtonProps = {
  /** Esconde o botão e o popup (display: none); o modal VIP continua a abrir via evento. */
  hideFloatingButton?: boolean;
};

export function FloatingWhatsAppButton({
  hideFloatingButton = false,
}: FloatingWhatsAppButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const memberActive = isActiveMember(user);

  function goToCheckout() {
    setOpen(false);
    setShowMembershipModal(false);
    router.push(MEMBERSHIP_CHECKOUT_PATH);
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
      if (memberActive) {
        setOpen(true);
        return;
      }
      setOpen(false);
      setShowMembershipModal(false);
      router.push(MEMBERSHIP_CHECKOUT_PATH);
    };
    window.addEventListener(OPEN_MEMBERSHIP_MODAL_EVENT, handler);
    return () => window.removeEventListener(OPEN_MEMBERSHIP_MODAL_EVENT, handler);
  }, [memberActive, router]);

  function closeAll() {
    setOpen(false);
    setShowMembershipModal(false);
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
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={closeAll}
          role="presentation"
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-0 shadow-xl"
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
                  onClick={goToCheckout}
                  variant="primary"
                  className="pointer-events-auto !w-[10.5rem] text-sm shadow-lg sm:!w-44 sm:text-base"
                >
                  Ativar acesso
                </CardButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
