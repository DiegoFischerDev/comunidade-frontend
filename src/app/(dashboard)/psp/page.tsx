/* eslint-disable react/no-array-index-key */
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { OPEN_MEMBERSHIP_MODAL_EVENT } from "@/components/FloatingWhatsAppButton";
import { CardButton } from "@/components/ui/CardButton";

const PAGES = [1, 2, 3, 4, 5, 6, 7];

export default function PSPPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isMember = user?.tier === "MEMBER";

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestMsg, setSuggestMsg] = useState("");
  const [suggestSending, setSuggestSending] = useState(false);
  const [suggestSent, setSuggestSent] = useState(false);
  const [suggestError, setSuggestError] = useState("");

  useEffect(() => {
    if (isMember) {
      router.replace("/psp/full");
    }
  }, [isMember, router]);

  function handleOpenMembershipModal() {
    if (typeof window === "undefined") return;

    // Se não estiver autenticado, abre o modal de login/registro
    if (!user) {
      window.dispatchEvent(
        new CustomEvent("open-auth-modal", {
          detail: { mode: "register" },
        }),
      );
      return;
    }

    // Se já estiver autenticado, abre direto o fluxo de membros
    window.dispatchEvent(new Event(OPEN_MEMBERSHIP_MODAL_EVENT));
  }

  function handleOpenSuggest() {
    if (!user || !isMember) {
      handleOpenMembershipModal();
      return;
    }
    setSuggestError("");
    setSuggestSent(false);
    setSuggestMsg("");
    setSuggestOpen(true);
  }

  async function handleSendSuggest() {
    if (!suggestMsg.trim()) {
      setSuggestError("Escreve a tua sugestão antes de enviar.");
      return;
    }
    setSuggestSending(true);
    setSuggestError("");
    try {
      await api.support.createTicket(`[PSP] ${suggestMsg.trim()}`);
      setSuggestSent(true);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "Não foi possível enviar.");
    } finally {
      setSuggestSending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="mx-auto w-full max-w-[820px] text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">
          PSP - Portugal Sem Perrengue
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Última atualização: abril/2026</p>
        <p className="mt-4 text-sm text-zinc-600">
          Esse Ebook foi criado com muito carinho para te ajudar nesse processo de imigração. Apesar do nosso esforço,
          as regras mudam constantemente, então contamos com a ajuda da comunidade para atualizar esse material todos os meses.
        </p>
        <p className="mt-4 text-base font-semibold text-zinc-900">
          Tem algo desatualizado no PSP? conta pra gente
        </p>
        <div className="mt-3 flex justify-center">
          <CardButton type="button" onClick={handleOpenSuggest} variant="primary">
            Enviar sugestão
          </CardButton>
        </div>
      </div>

      {!isMember && (
        <div className="mx-auto flex max-w-2xl flex-col space-y-8">
          {PAGES.map((page) => (
            <figure
              key={page}
              className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm"
            >
              <Image
                src={`/psp/PSP%20pag%20${page}.png`}
                alt={`Página ${page} do guia PSP - Portugal Sem Perrengue`}
                width={1000}
                height={1414}
                className="h-auto w-full object-contain"
                priority={page === 1}
              />
            </figure>
          ))}

          {/* Página 8 - apenas preview com bloqueio para não-membros */}
          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="relative max-h-[420px] overflow-hidden bg-zinc-100">
              <Image
                src="/psp/PSP%20pag%208.png"
                alt="Página 8 do guia PSP - Portugal Sem Perrengue"
                width={1000}
                height={1414}
                className="h-auto w-full object-contain"
              />

              {/* Overlay com mensagem e botão */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/70 via-black/40 to-transparent p-6">
                <div className="pointer-events-auto max-w-xl rounded-2xl bg-white/95 p-4 text-center shadow-lg">
                  <p className="text-sm font-medium text-zinc-900">
                    O conteúdo completo do guia PSP - Portugal Sem Perrengue é{" "}
                    <span className="font-semibold">exclusivo para membros</span>{" "}
                    da Comunidade RPM.
                  </p>
                  <p className="mt-2 text-xs text-zinc-600">
                    Desbloqueie todas as páginas do ebook, suporte direto e
                    benefícios exclusivos tornando-se membro.
                  </p>
                  <div className="mt-4">
                    <CardButton
                      type="button"
                      onClick={handleOpenMembershipModal}
                      variant="primary"
                    >
                    Tornar-se membro VIP e liberar conteúdo completo
                    </CardButton>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

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
                variant="secondary"
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
  );
}

