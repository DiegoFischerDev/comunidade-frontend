'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type AdminSaleRow = Awaited<ReturnType<typeof api.admin.sales.list>>[number];

export default function AdminSalesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [items, setItems] = useState<AdminSaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const data = await api.admin.sales.list();
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar vendas.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isAdmin]);

  const total = useMemo(() => items.length, [items]);

  if (!user) return null;

  if (!isAdmin) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Todas as vendas</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Todas as vendas</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Registros de vendas enviados pelos parceiros. ({total})
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-600">Carregando vendas…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma venda registrada.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-2 text-left">Parceiro</th>
                <th className="px-4 py-2 text-left">Lead</th>
                <th className="px-4 py-2 text-left">Serviço</th>
                <th className="px-4 py-2 text-left">Valor</th>
                <th className="px-4 py-2 text-left">Comissão paga</th>
                <th className="px-4 py-2 text-left">Vai querer fatura</th>
                <th className="px-4 py-2 text-left">Data</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t border-zinc-200">
                  <td className="px-4 py-2 align-top">{s.partner.name}</td>
                  <td className="px-4 py-2 align-top">{s.user.name ?? '—'}</td>
                  <td className="px-4 py-2 align-top">{s.service.title}</td>
                  <td className="px-4 py-2 align-top">{s.amountEur} €</td>
                  <td className="px-4 py-2 align-top">
                    {s.commissionPaymentStatus === 'PAID' ? (
                      <span className="text-xs font-medium text-emerald-700">
                        {s.commissionPaidEur ?? 'Pago'}
                        {s.commissionPaidEur ? ' €' : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500">Pendente</span>
                    )}
                  </td>
                  <td className="px-4 py-2 align-top">{s.wantsInvoice ? 'Sim' : 'Não'}</td>
                  <td className="px-4 py-2 align-top">
                    {new Date(s.createdAt).toLocaleString('pt-PT')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

