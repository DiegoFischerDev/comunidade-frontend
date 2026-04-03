'use client';

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
  }).format(cents / 100);
}

function formatBrl(centavos: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(centavos / 100);
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
      setPayOpen(false);
      setPayOptions(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao iniciar o pagamento.';
      alert(msg);
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <>
      <div className="mb-6 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm ring-1 ring-emerald-100">
        <h2 className="text-base font-semibold text-zinc-900">
          Quero agendar 30 minutos de chamada de vídeo com a Rafa
        </h2>
        <p className="mt-1 text-sm text-zinc-600">
          Membros VIP marcam pelo Cal.com. Após a chamada, podes voltar a agendar pagando a taxa
          de novo agendamento.
        </p>
        <button
          type="button"
          onClick={() => void handleAgendar()}
          disabled={statusLoading}
          className="mt-3 inline-flex cursor-pointer items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
        >
          {statusLoading ? 'A verificar…' : 'Agendar'}
        </button>
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            {!payOptions ? (
              <>
                <h3 className="text-lg font-semibold text-zinc-900">
                  Novo agendamento
                </h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Já utilizaste a chamada incluída no teu acesso. Para marcar outra vez com a Rafa,
                  paga a taxa de novo agendamento (mesmos métodos que a anuidade).
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAmountsLoading(true);
                      void (async () => {
                        try {
                          const a = await api.stripe.getRafaCallAmounts();
                          setAmounts(a);
                        } finally {
                          setAmountsLoading(false);
                        }
                      })();
                      setPayOptions(true);
                    }}
                    className="w-full rounded-full bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    Continuar para pagamento
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayOpen(false)}
                    className="text-center text-sm text-zinc-500 hover:text-zinc-700"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-zinc-900">Forma de pagamento</h3>
                {amountsLoading || !amounts ? (
                  <p className="mt-3 text-sm text-zinc-500">A carregar valores…</p>
                ) : (
                  <p className="mt-2 text-sm text-zinc-600">
                    {formatEur(amounts.eurCents)} (cartão / MB WAY) ou{' '}
                    {formatBrl(amounts.pixCentavos)} (Pix).
                  </p>
                )}
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={payLoading || !amounts}
                    onClick={() => void startPay('card')}
                    className="w-full rounded-full bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {payLoading ? 'A abrir…' : 'Cartão (EUR)'}
                  </button>
                  <button
                    type="button"
                    disabled={payLoading || !amounts}
                    onClick={() => void startPay('mbway')}
                    className="w-full rounded-full border border-zinc-300 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    MB WAY
                  </button>
                  <button
                    type="button"
                    disabled={payLoading || !amounts}
                    onClick={() => void startPay('pix')}
                    className="w-full rounded-full border border-emerald-600 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    Pix (BRL)
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPayOptions(false);
                  }}
                  className="mt-3 w-full text-center text-sm text-zinc-500 hover:text-zinc-700"
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
