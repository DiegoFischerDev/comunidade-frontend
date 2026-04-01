/* eslint-disable react/no-array-index-key */
"use client";

import Image from "next/image";
import Link from "next/link";

import { useAuth } from "@/contexts/AuthContext";
import { OPEN_MEMBERSHIP_MODAL_EVENT } from "@/components/FloatingWhatsAppButton";

const PAGES = [1, 2, 3, 4, 5, 6, 7];

export default function PSPPage() {
  const { user } = useAuth();
  const isMember = user?.tier === "MEMBER";

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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">
            PSP - Portugal Sem Perrengue
          </h1>
        </div>

        {isMember && (
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/psp/full"
              className="inline-flex items-center rounded-lg bg-[#edbfbf] px-4 py-2 text-sm font-semibold text-zinc-900 hover:bg-[#e3afaf]"
            >
              Ver PDF completo
            </Link>
            <p className="text-xs text-zinc-500 max-w-xs">
              Como membro da Comunidade RPM, você tem acesso integral ao ebook
              em PDF dentro da Comunidade RPM.
            </p>
          </div>
        )}
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
                  <button
                    type="button"
                    onClick={handleOpenMembershipModal}
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-emerald-700"
                  >
                    Tornar-se membro e liberar conteúdo completo
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

