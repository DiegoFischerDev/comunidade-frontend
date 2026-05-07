import { Suspense } from "react";
import { LeadRedirectClient } from "./lead-redirect-client";

export const dynamic = "force-dynamic";

export default function LeadRedirectPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-xl px-4 py-10">
          <h1 className="text-xl font-semibold text-zinc-900">Abrindo WhatsApp…</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Estamos registrando o início do atendimento e abrindo a conversa com o lead.
          </p>
          <p className="mt-4 text-sm text-zinc-600">Aguarde alguns segundos…</p>
        </div>
      }
    >
      <LeadRedirectClient />
    </Suspense>
  );
}

