'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { OPEN_AUTH_LOGIN_EVENT } from '@/lib/auth-ui-events';
import { OPEN_MEMBERSHIP_MODAL_EVENT } from '@/components/FloatingWhatsAppButton';

function buildCalEmbedUrl(base: string, email: string, name: string): string {
  try {
    const u = new URL(base);
    u.searchParams.set('embed', 'true');
    u.searchParams.set('email', email);
    u.searchParams.set('name', name);
    return u.toString();
  } catch {
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}embed=true&email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`;
  }
}

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

/** Botões de método de pagamento — mesmo padrão visual do modal da anuidade (FloatingWhatsAppButton). */
function PaymentMethodRow({
  disabled,
  loading,
  onPick,
  amounts,
}: {
  disabled: boolean;
  loading: boolean;
  onPick: (m: 'card' | 'mbway' | 'pix') => void;
  amounts: { eurCents: number; pixCentavos: number };
}) {
  return (
    <div className="mt-4 flex flex-col gap-3">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => onPick('card')}
        className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
          <svg
            aria-hidden
            width="32"
            height="32"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10"
          >
            <path fill="#D8DEE4" d="M0 0h32v32H0z" />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M6 10.375C6 9.339 6.84 8.5 7.875 8.5h16.25C25.16 8.5 26 9.34 26 10.375v11.25c0 1.035-.84 1.875-1.875 1.875H7.875A1.875 1.875 0 0 1 6 21.625v-11.25Zm1.875 0h16.25v1.875H7.875v-1.875Zm16.25 3.75v7.5H7.875v-7.5h16.25Z"
              fill="#474E5A"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M14.75 18.813c0-.518.42-.938.938-.938h5.624a.937.937 0 1 1 0 1.875h-5.625a.937.937 0 0 1-.937-.938Z"
              fill="#474E5A"
            />
          </svg>
        </span>
        <span className="flex-1 font-medium text-zinc-800">Cartão</span>
        <span className="text-sm font-semibold text-emerald-700">
          {formatEur(amounts.eurCents)}
        </span>
      </button>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => onPick('mbway')}
        className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
          <svg
            aria-hidden
            width="32"
            height="32"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10"
          >
            <path fill="#2E333A" d="M0 0h32v32H0z" />
            <path
              fill="red"
              d="M7.792 26.001h16.417c1.885 0 1.904-1.729 1.712-2.759-.105-.694-1.235-.687-1.36 0v.804a.657.657 0 0 1-.642.669H8.079c-.352 0-.64-.301-.64-.67v-.803c-.125-.687-1.256-.694-1.36 0-.192 1.03-.175 2.759 1.713 2.759Zm15.052-20H9.216c-.895 0-1.628.407-1.627 1.393v.881c0 1.172 1.503 1.18 1.503-.025v-.458a.532.532 0 0 1 .52-.542h12.763a.533.533 0 0 1 .372.163.532.532 0 0 1 .15.379v.468c0 1.2 1.574 1.204 1.574-.008v-.858c0-.986-.732-1.394-1.627-1.394Z"
            />
            <path
              fill="#fff"
              fillRule="evenodd"
              d="M24.15 15.853a2.629 2.629 0 0 1 1.492 2.349c0 1.444-1.212 2.625-2.692 2.625h-4.147a.7.7 0 0 1-.706-.687v-8.22c0-.397.312-.722.693-.722h3.455c1.454 0 2.644 1.238 2.644 2.751a2.8 2.8 0 0 1-.739 1.904Zm-3.096-.67h1.318v-.015c.6-.096 1.062-.639 1.062-1.29 0-.717-.562-1.304-1.252-1.304h-2.653v6.822h3.364c.712 0 1.294-.607 1.294-1.348 0-.741-.583-1.347-1.294-1.347h-.521l-1.318-.003a.745.745 0 0 1-.727-.757c0-.417.327-.758.727-.758Zm-3.616 4.824a.858.858 0 0 1-.74.954.841.841 0 0 1-.915-.771l-.683-6.538-2.416 6.393-.003.006-.006.017-.006.013v.004l-.006.013-.01.02-.003.007-.006.012a.868.868 0 0 1-.171.234l-.015.015a.822.822 0 0 1-.144.106l-.004.001-.016.01-.015.008-.006.004-.02.008-.01.005-.01.004-.008.005-.016.006-.013.005-.01.004a.813.813 0 0 1-.25.05h-.061a.802.802 0 0 1-.272-.059l-.012-.005-.013-.005-.012-.005-.008-.005-.01-.003-.015-.01-.015-.007-.014-.008-.008-.004a.839.839 0 0 1-.127-.093l-.004-.002-.027-.025a.856.856 0 0 1-.022-.021l-.02-.023a.992.992 0 0 1-.025-.029l-.002-.003a.858.858 0 0 1-.088-.133l-.005-.007-.006-.013-.009-.019-.002-.005-.005-.01-.005-.01-.004-.01-.005-.01-.004-.012-.006-.015-2.418-6.398-.682 6.538a.84.84 0 0 1-.09.317.841.841 0 0 1-.207.259.84.84 0 0 1-.29.159.842.842 0 0 1-.328.035.859.859 0 0 1-.74-.954l.804-7.708v-.005a1.459 1.459 0 0 1 .689-1.088c.229-.135.491-.201.757-.19h.002c.09.004.175.016.253.034.43.105.795.417.967.872l2.06 5.446 2.056-5.446c.172-.455.537-.767.967-.872a1.378 1.378 0 0 1 1.546.726c.083.162.136.338.155.518v.004l.807 7.71Z"
              clipRule="evenodd"
            />
          </svg>
        </span>
        <span className="flex-1 font-medium text-zinc-800">MB WAY</span>
        <span className="text-sm font-semibold text-emerald-700">
          {formatEur(amounts.eurCents)}
        </span>
      </button>
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => onPick('pix')}
        className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
          <svg
            aria-hidden
            width="32"
            height="32"
            viewBox="0 0 32 32"
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10"
          >
            <path fill="#32BCAD" d="M0 0h32v32H0z" />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M9.572 9.627c.942 0 1.827.366 2.493 1.032l3.613 3.614a.67.67 0 0 0 .946 0l3.6-3.6a3.504 3.504 0 0 1 2.493-1.033h.433l-4.571-4.572a3.645 3.645 0 0 0-5.157 0l-4.56 4.559h.71ZM22.717 22.36a3.503 3.503 0 0 1-2.493-1.032l-3.6-3.6a.684.684 0 0 0-.946 0l-3.613 3.613a3.503 3.503 0 0 1-2.493 1.032h-.709l4.559 4.56a3.646 3.646 0 0 0 5.156 0l4.573-4.573h-.434Z"
              fill="#fff"
            />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="m24.169 10.659 2.763 2.763a3.646 3.646 0 0 1 0 5.156L24.17 21.34a.525.525 0 0 0-.196-.039h-1.256a2.483 2.483 0 0 1-1.744-.723l-3.6-3.6c-.653-.653-1.79-.653-2.444 0l-3.613 3.613a2.483 2.483 0 0 1-1.745.723H8.028a.526.526 0 0 0-.185.037l-2.774-2.774a3.646 3.646 0 0 1 0-5.156l2.774-2.774c.058.022.12.037.185.037h1.545c.65 0 1.285.264 1.745.723l3.613 3.613a1.723 1.723 0 0 0 1.883.374c.21-.087.4-.214.56-.375l3.6-3.6c.464-.46 1.09-.72 1.744-.722h1.256a.52.52 0 0 0 .195-.04Z"
              fill="#fff"
            />
          </svg>
        </span>
        <span className="flex-1 font-medium text-zinc-800">Pix</span>
        <span className="text-sm font-semibold text-emerald-700">
          {formatBrl(amounts.pixCentavos)}
        </span>
      </button>
    </div>
  );
}

export function RafaCallCard() {
  const { user, token } = useAuth();
  const [calOpen, setCalOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payOptions, setPayOptions] = useState(false);
  const [calIframeSrc, setCalIframeSrc] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [amounts, setAmounts] = useState<{ eurCents: number; pixCentavos: number } | null>(
    null,
  );
  const [amountsLoading, setAmountsLoading] = useState(false);

  const calBase = process.env.NEXT_PUBLIC_CALCOM_EMBED_URL?.trim() || '';

  const openLogin = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(OPEN_AUTH_LOGIN_EVENT));
  }, []);

  const openMembership = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(OPEN_MEMBERSHIP_MODAL_EVENT));
  }, []);

  const closePayModal = useCallback(() => {
    setPayOpen(false);
    setPayOptions(false);
  }, []);

  const handleAgendar = useCallback(async () => {
    if (!user || !token) {
      openLogin();
      return;
    }
    if (user.tier !== 'MEMBER') {
      openMembership();
      return;
    }
    setStatusLoading(true);
    try {
      const s = await api.rafacall.status();
      if (s.canOpenCalEmbed) {
        if (!calBase) {
          alert(
            'O link do Cal.com ainda não está configurado (NEXT_PUBLIC_CALCOM_EMBED_URL).',
          );
          return;
        }
        setCalIframeSrc(buildCalEmbedUrl(calBase, s.calGuestEmail, s.calGuestName));
        setCalOpen(true);
      } else {
        setPayOpen(true);
        setPayOptions(false);
        if (!amounts && !amountsLoading) {
          setAmountsLoading(true);
          try {
            const a = await api.stripe.getRafaCallAmounts();
            setAmounts(a);
          } catch {
            setAmounts(null);
          } finally {
            setAmountsLoading(false);
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Não foi possível carregar o estado.';
      alert(msg);
    } finally {
      setStatusLoading(false);
    }
  }, [user, token, calBase, amounts, amountsLoading, openLogin, openMembership]);

  const successUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/dashboard/rafacall/success`
      : '';
  const cancelUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : '';

  type PayMethod = 'card' | 'mbway' | 'pix';
  const startPay = async (method: PayMethod) => {
    if (payLoading || !successUrl) return;
    setPayLoading(true);
    try {
      const { url } =
        method === 'pix'
          ? await api.stripe.createRafaCallUnlockPixSession({ successUrl, cancelUrl })
          : method === 'mbway'
            ? await api.stripe.createRafaCallUnlockMbWaySession({ successUrl, cancelUrl })
            : await api.stripe.createRafaCallUnlockSession({ successUrl, cancelUrl });
      window.open(url, '_blank', 'noopener,noreferrer');
      closePayModal();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao iniciar o pagamento.';
      alert(msg);
    } finally {
      setPayLoading(false);
    }
  };

  const ensureAmountsForPaymentStep = useCallback(() => {
    if (amounts !== null || amountsLoading) return;
    setAmountsLoading(true);
    void (async () => {
      try {
        const a = await api.stripe.getRafaCallAmounts();
        setAmounts(a);
      } catch {
        setAmounts(null);
      } finally {
        setAmountsLoading(false);
      }
    })();
  }, [amounts, amountsLoading]);

  return (
    <>
      <div className="mb-6 flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative h-20 w-20 flex-shrink-0">
            <Image
              src="/video-call.png"
              alt=""
              fill
              className="object-contain"
              sizes="80px"
            />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-zinc-900">
              Quero agendar minha chamada de vídeo com a Rafa
            </p>
            <p className="text-xs text-zinc-600">
              Membros VIP marcam pelo Cal.com. Depois da chamada, podes voltar a agendar pagando a taxa
              de novo agendamento.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => void handleAgendar()}
            disabled={statusLoading}
            className="inline-flex cursor-pointer items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {statusLoading ? 'A verificar…' : 'Agendar'}
          </button>
        </div>
      </div>

      {calOpen && calIframeSrc && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2">
              <span className="text-sm font-semibold text-zinc-900">
                Agendar com a Rafa (Cal.com)
              </span>
              <button
                type="button"
                onClick={() => {
                  setCalOpen(false);
                  setCalIframeSrc(null);
                }}
                className="rounded-full px-2 py-1 text-sm text-zinc-500 hover:bg-zinc-100"
              >
                Fechar
              </button>
            </div>
            <iframe
              title="Cal.com — agendamento"
              src={calIframeSrc}
              className="min-h-[560px] w-full flex-1 border-0"
            />
          </div>
        </div>
      )}

      {payOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={closePayModal}
          role="presentation"
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-5 pt-10 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closePayModal}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-zinc-200 text-zinc-700 shadow-sm transition-colors hover:bg-white hover:text-zinc-900"
              aria-label="Fechar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            {!payOptions ? (
              <>
                <div className="-mx-5 -mt-5 mb-4 overflow-hidden rounded-t-2xl bg-zinc-50">
                  <div className="relative mx-auto flex h-40 w-full max-w-[200px] items-center justify-center pt-4">
                    <Image
                      src="/video-call.png"
                      alt=""
                      width={160}
                      height={160}
                      className="object-contain"
                    />
                  </div>
                  <div className="bg-white px-4 pb-4 pt-2 text-center">
                    <h3 className="text-lg font-bold tracking-tight text-zinc-900">
                      Novo agendamento
                    </h3>
                    <p className="mt-1 text-sm font-medium text-zinc-600">
                      30 minutos de chamada de vídeo com a Rafa
                    </p>
                    <p className="mt-3 text-3xl font-bold text-emerald-700">
                      {amountsLoading ? (
                        <span className="text-base font-medium text-zinc-500">A carregar…</span>
                      ) : amounts ? (
                        formatEur(amounts.eurCents)
                      ) : (
                        <span className="text-base font-medium text-zinc-500">—</span>
                      )}
                    </p>
                  </div>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-zinc-700">
                  Já utilizaste a chamada incluída no teu acesso. Para marcar outra vez, paga a taxa de
                  novo agendamento.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    ensureAmountsForPaymentStep();
                    setPayOptions(true);
                  }}
                  className="w-full rounded-full bg-emerald-600 px-6 py-3.5 text-base font-semibold text-white shadow-md transition-colors hover:bg-emerald-700"
                >
                  Continuar para pagamento
                </button>
                <button
                  type="button"
                  onClick={closePayModal}
                  className="mt-3 w-full text-center text-sm text-zinc-500 hover:text-zinc-700"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-bold tracking-tight text-zinc-900">
                  Novo agendamento
                </h3>
                <p className="mt-1 text-sm text-zinc-600">
                  30 minutos de chamada de vídeo com a Rafa
                </p>
                {amountsLoading || !amounts ? (
                  <p className="mt-4 text-sm text-zinc-500">A carregar valores…</p>
                ) : (
                  <>
                    <p className="mt-4 text-sm font-medium text-zinc-800">
                      {formatEur(amounts.eurCents)} ou {formatBrl(amounts.pixCentavos)}
                    </p>
                    <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Escolha a forma de pagamento
                    </p>
                    <PaymentMethodRow
                      disabled={!amounts}
                      loading={payLoading}
                      onPick={(m) => void startPay(m)}
                      amounts={amounts}
                    />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setPayOptions(false)}
                  className="mt-4 w-full text-center text-sm text-zinc-500 hover:text-zinc-700"
                >
                  Voltar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
