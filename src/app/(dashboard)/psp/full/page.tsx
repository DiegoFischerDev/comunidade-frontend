"use client";

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { CardButton } from '@/components/ui/CardButton';

const PSP_COVER_SRC = '/psp/PSP%20pag%201.png';

export default function PSPFullPage() {
  const router = useRouter();
  const { user, refreshUser, loading: authLoading } = useAuth();

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const canAccessPspFull = useMemo(() => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return String(user.tier ?? '').trim().toUpperCase() === 'MEMBER';
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    if (!canAccessPspFull) {
      router.replace('/psp');
    }
  }, [authLoading, canAccessPspFull, router]);

  const isMember = useMemo(() => {
    const t = String(user?.tier ?? '').trim().toUpperCase();
    return t === 'MEMBER';
  }, [user?.tier]);

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestMsg, setSuggestMsg] = useState('');
  const [suggestSending, setSuggestSending] = useState(false);
  const [suggestSent, setSuggestSent] = useState(false);
  const [suggestError, setSuggestError] = useState('');

  useEffect(() => {
    if (!isMember) setSuggestOpen(false);
  }, [isMember]);

  function handleOpenSuggest() {
    if (!isMember) return;
    setSuggestError('');
    setSuggestSent(false);
    setSuggestMsg('');
    setSuggestOpen(true);
  }

  async function handleSendSuggest() {
    if (!suggestMsg.trim()) {
      setSuggestError('Escreve a tua sugestão antes de enviar.');
      return;
    }
    setSuggestSending(true);
    setSuggestError('');
    try {
      await api.support.createTicket(`[PSP] ${suggestMsg.trim()}`);
      setSuggestSent(true);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : 'Não foi possível enviar.');
    } finally {
      setSuggestSending(false);
    }
  }

  if (authLoading || !canAccessPspFull) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center px-4">
        <p className="text-sm text-zinc-600">{authLoading ? 'A carregar…' : 'A redirecionar…'}</p>
      </div>
    );
  }

  return (
    <>
      <div className="-mx-4 mb-5 print:hidden md:hidden">
        <Image
          src="/rafa_cards/psp_hero.png"
          alt="Guia Portugal Sem Perrengue"
          width={1250}
          height={1875}
          className="h-auto w-full object-contain"
          sizes="100vw"
          priority
        />
      </div>
    <div className="flex min-h-[calc(100vh-6rem)] flex-col gap-4 pb-8">
      <div className="mx-auto w-full max-w-[820px]">
        <h1 className="hidden text-2xl font-semibold text-zinc-900 print:block md:block">
          Guia Portugal Sem Perrengue (PDF completo)
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Última atualização: abril/2026</p>
        <p className="mt-3 text-sm text-zinc-600">
          Este guia foi criado com muito carinho para te ajudar nesse processo de imigração. Apesar do nosso esforço, as
          regras mudam constantemente, então contamos com a ajuda da comunidade para atualizar esse material todos os meses.
        </p>
      </div>

      <div className="relative mx-auto flex min-h-[min(56vh,580px)] w-full max-w-[820px] flex-1 flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 shadow-sm">
        <div className="absolute inset-0 flex items-start justify-center pt-6 sm:pt-8">
          <div className="relative w-[min(82vw,280px)] sm:w-[min(82vw,320px)] aspect-[1000/1414]">
            <Image
              src={PSP_COVER_SRC}
              alt="Capa do Guia Portugal Sem Perrengue"
              fill
              className="object-contain object-top"
              sizes="(max-width: 640px) 82vw, 320px"
              priority
            />
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-black/55 via-black/20 to-transparent"
          aria-hidden
        />
        <div className="relative z-10 mt-auto flex w-full flex-col items-center justify-center gap-4 px-4 pb-8 pt-4 text-center">
          <div className="flex w-full max-w-md justify-center">
            <a
              href="/psp/psp-completo.pdf"
              download
              className="w-full sm:w-auto"
            >
              <CardButton type="button" variant="primary" className="w-full sm:w-auto">
                Download PDF completo
              </CardButton>
            </a>
          </div>
        </div>
      </div>

      {isMember ? (
        <div className="mx-auto w-full max-w-[820px] border-t border-zinc-200/80 pt-6 text-center sm:text-left">
          <p className="text-sm font-normal text-zinc-500">
            Tem algo desatualizado no PSP? Conta pra gente.
          </p>
          <div className="mt-2 flex justify-center sm:justify-start">
            <CardButton
              type="button"
              onClick={handleOpenSuggest}
              variant="outline"
              className="text-sm font-normal"
            >
              Enviar sugestão
            </CardButton>
          </div>
        </div>
      ) : null}

      {suggestOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => !suggestSending && setSuggestOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">Enviar sugestão (PSP)</h3>
                <p className="mt-1 text-sm text-zinc-600">
                  Conta o que está desatualizado e, se possível, em qual página/tema.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSuggestOpen(false)}
                disabled={suggestSending}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-xs text-zinc-500 hover:bg-zinc-50 disabled:opacity-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {suggestError ? (
              <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {suggestError}
              </div>
            ) : null}

            {suggestSent ? (
              <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Sugestão enviada. Obrigado por ajudar a comunidade!
              </div>
            ) : null}

            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700">Mensagem</label>
              <textarea
                value={suggestMsg}
                onChange={(e) => setSuggestMsg(e.target.value)}
                rows={7}
                disabled={suggestSending || suggestSent}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                placeholder="Escreve aqui…"
              />
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <CardButton
                type="button"
                variant="outline"
                onClick={() => setSuggestOpen(false)}
                disabled={suggestSending}
              >
                Fechar
              </CardButton>
              <CardButton
                type="button"
                variant="primary"
                onClick={handleSendSuggest}
                loading={suggestSending}
                disabled={suggestSent}
              >
                Enviar
              </CardButton>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

