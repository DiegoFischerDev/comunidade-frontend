'use client';

import Link from 'next/link';

export default function MembershipCancelPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center">
      <div className="rounded-2xl border border-zinc-200 bg-white p-8">
        <h1 className="text-xl font-bold text-zinc-900">Pagamento cancelado</h1>
        <p className="mt-2 text-zinc-700">
          O pagamento foi cancelado. Quando quiseres tornar-te membro, basta clicar em &quot;Quero ser membro&quot; novamente.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-full border border-zinc-300 bg-white px-6 py-3 font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Voltar ao dashboard
        </Link>
      </div>
    </div>
  );
}
