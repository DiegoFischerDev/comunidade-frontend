import Link from "next/link";

export const dynamic = "force-dynamic";

/** Links antigos apontavam para atendimento de «leads» — funcionalidade removida. */
export default function LeadRedirectPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <h1 className="text-xl font-semibold text-zinc-900">Link descontinuado</h1>
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">
        Este endereço fazia parte do sistema antigo de registo de pedidos de contacto. Já não está ativo:
        contacta o cliente diretamente pelo WhatsApp ou pela comunidade.
      </p>
      <p className="mt-6">
        <Link href="/dashboard" className="text-sm font-medium text-amber-800 underline">
          Ir para o painel
        </Link>
      </p>
    </div>
  );
}
