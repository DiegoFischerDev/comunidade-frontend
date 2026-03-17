/* eslint-disable react/no-array-index-key */
"use client";

import Image from "next/image";
import Link from "next/link";

import { useAuth } from "@/contexts/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const isMember = user?.tier === "MEMBER";

  const pdfHref = isMember ? "/psp/full" : "/psp";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-2 text-zinc-600">
          Bem-vindo à Comunidade RPM. Em breve: Ebook, curso em vídeo e
          produtos.
        </p>
      </div>

      <section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:w-1/2">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          {/* Wrapper com proporção fixa para não cortar a imagem */}
          <div className="relative w-full overflow-hidden rounded-xl bg-zinc-100 md:w-80 aspect-[2/1]">
            <Image
              src="/capa_psp-1000x500.png"
              alt="Capa do guia PSP - Portugal Sem Perrengue"
              fill
              className="object-contain"
              sizes="(min-width: 768px) 320px, 100vw"
              priority
            />
          </div>

          <div className="flex-1 space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">
              PSP - Portugal Sem Perrengue
            </h2>
            <p className="text-sm text-zinc-600">
              O guia real pra sair do Brasil e morar legalmente em Portugal.
              Aqui você encontra o passo a passo, documentos, prazos e
              estratégias para fazer essa mudança com segurança.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={pdfHref}
                className="inline-flex items-center rounded-lg bg-[#edbfbf] px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-[#e3afaf]"
              >
                Acessar PDF
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
