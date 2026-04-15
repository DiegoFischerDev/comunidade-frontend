/* eslint-disable react/no-array-index-key */
"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import { OPEN_MEMBERSHIP_MODAL_EVENT } from "@/components/FloatingWhatsAppButton";
import { CardButton } from "@/components/ui/CardButton";

const PAGES = [1, 2, 3, 4, 5, 6, 7];

export default function PSPPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isMember = user?.tier === "MEMBER";

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

  return (
    <div className="space-y-8">
      <div className="mx-auto w-full max-w-[820px]">
        <h1 className="text-2xl font-semibold text-zinc-900">
          E-book - Portugal Sem Perrengue
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Última atualização: abril/2026</p>
        <p className="mt-4 text-sm text-zinc-600">
          Esse Ebook foi criado com muito carinho para te ajudar nesse processo de imigração. Apesar do nosso esforço,
          as regras mudam constantemente — o conteúdo completo é atualizado regularmente para acompanhar as mudanças.
        </p>
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
    </div>
  );
}

