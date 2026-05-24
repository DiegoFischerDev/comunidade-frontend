'use client';

import Link from 'next/link';

export default function RafacallCheckoutCancelPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8">
        <h1 className="text-xl font-bold text-zinc-900">Pagamento cancelado</h1>
        <p className="mt-2 text-zinc-700">
          O pagamento da chamada com a Rafa foi cancelado. Podes tentar novamente quando quiseres.
        </p>
        <Link
          href="/dashboard/rafacall/checkout"
          className="mt-4 inline-block rounded-full bg-[#28b463] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Voltar ao checkout
        </Link>
        <Link
          href="/dashboard"
          className="mt-3 block text-sm font-medium text-zinc-600 underline-offset-2 hover:underline"
        >
          Ir para o dashboard
        </Link>
      </div>
    </div>
  );
}
