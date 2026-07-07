'use client';

import Link from 'next/link';

export default function MembershipCancelPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-12 text-center">
      <div className="rounded-2xl border border-border bg-card p-8">
        <h1 className="text-xl font-bold text-foreground">Pagamento cancelado</h1>
        <p className="mt-2 text-foreground/90">
          O pagamento foi cancelado. Quando quiseres tornar-te membro, basta clicar em &quot;Quero ser membro&quot; novamente.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-full border border-border bg-card px-6 py-3 font-medium text-foreground/90 hover:bg-page"
        >
          Voltar ao dashboard
        </Link>
      </div>
    </div>
  );
}
