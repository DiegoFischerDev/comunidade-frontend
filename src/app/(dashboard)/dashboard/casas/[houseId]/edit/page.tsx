'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

/** Redireciona para Minhas casas com o modal de edição aberto. */
export default function EditHouseRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const houseId = typeof params.houseId === 'string' ? params.houseId : '';

  useEffect(() => {
    if (!houseId) {
      router.replace('/dashboard/casas');
      return;
    }
    router.replace(`/dashboard/casas?edit=${encodeURIComponent(houseId)}`);
  }, [houseId, router]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Editar imóvel</h1>
      <p className="mt-4 text-sm text-zinc-600">A abrir formulário…</p>
    </div>
  );
}

