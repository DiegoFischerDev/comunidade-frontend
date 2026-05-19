'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Redireciona para Minhas casas com o modal «Adicionar casa» aberto. */
export default function NewHousePostRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/casas?create=1');
  }, [router]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Adicionar casa</h1>
      <p className="mt-4 text-sm text-zinc-600">A abrir formulário…</p>
    </div>
  );
}
