'use client';

import Link from 'next/link';

export default function RafacallCheckoutCancelPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center">
      <div className="rounded-2xl border border-border bg-card p-8">
        <h1 className="text-xl font-bold text-foreground">Pagamento cancelado</h1>
        <p className="mt-2 text-foreground/90">
          O pagamento da chamada com a Rafa foi cancelado. Podes tentar novamente quando quiseres.
        </p>
        <Link
          href="/dashboard/rafacall/checkout"
          className="mt-4 inline-block rounded-full brand-cta-primary px-6 py-3 text-sm hover:opacity-90"
        >
          Voltar ao checkout
        </Link>
        <Link
          href="/"
          className="mt-3 block text-sm font-medium text-muted underline-offset-2 hover:underline"
        >
          Ir para o dashboard
        </Link>
      </div>
    </div>
  );
}
