'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type PartnerOption = { id: string; name: string };
type SaleRow = {
  id: string;
  partnerId: string;
  userId: string | null;
  month: number;
  year: number;
  amount: number;
  status: string;
  cashbackRequestedAt: string | null;
  cashbackMbwayNumber: string | null;
  cashbackMbwayName: string | null;
  user: { id: string; name: string; email: string } | null;
  partner: { id: string; name: string };
  service: { title: string } | null;
  serviceTitle: string | null;
};

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os estados' },
  { value: 'PENDING_PARTNER', label: 'Aguardando aprovação' },
  { value: 'APPROVED', label: 'Aprovada' },
  { value: 'REJECTED', label: 'Recusada' },
  { value: 'CASHBACK', label: 'Cashback solicitado' },
];

function statusLabel(s: SaleRow): string {
  if (s.cashbackRequestedAt && s.cashbackMbwayNumber) {
    return `Mbway para ${s.cashbackMbwayNumber}`;
  }
  switch (s.status) {
    case 'PENDING_PARTNER':
      return 'Aguardando aprovação do parceiro';
    case 'APPROVED':
      return 'Compra aprovada';
    case 'REJECTED':
      return 'Compra recusada';
    default:
      return s.status;
  }
}

export default function AdminPurchasesPage() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterPartnerId, setFilterPartnerId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    (async () => {
      try {
        const list = await api.admin.partners.list();
        setPartners(list.map((p) => ({ id: p.id, name: p.name })));
      } catch {
        // ignore
      }
    })();
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const params: { partnerId?: string; status?: string; cashbackOnly?: boolean } = {};
        if (filterPartnerId) params.partnerId = filterPartnerId;
        if (filterStatus === 'CASHBACK') {
          params.cashbackOnly = true;
        } else if (filterStatus) {
          params.status = filterStatus;
        }
        const data = await api.sales.adminList(params);
        setSales(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar compras.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.role, filterPartnerId, filterStatus]);

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-4">
        <p className="text-sm text-zinc-600">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Compras (admin)</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Todas as compras registadas. Filtre por parceiro ou estado. Nome e número MB Way aparecem quando o utilizador solicitou cashback.
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-4 rounded-lg border border-zinc-200 bg-white p-4">
        <div className="min-w-[180px]">
          <label className="block text-xs font-medium text-zinc-700">Parceiro</label>
          <select
            value={filterPartnerId}
            onChange={(e) => setFilterPartnerId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Todos</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[200px]">
          <label className="block text-xs font-medium text-zinc-700">Estado</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-zinc-900">Listagem</h2>
        {loading ? (
          <p className="mt-2 text-sm text-zinc-600">A carregar…</p>
        ) : sales.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">Nenhuma compra encontrada.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left">Utilizador</th>
                  <th className="px-3 py-2 text-left">Parceiro</th>
                  <th className="px-3 py-2 text-left">Serviço</th>
                  <th className="px-3 py-2 text-left">Mês/ano</th>
                  <th className="px-3 py-2 text-left">Valor</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-left">Nome MB Way</th>
                  <th className="px-3 py-2 text-left">Número MB Way</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-t border-zinc-200">
                    <td className="px-3 py-2 text-zinc-800">
                      {s.user ? (
                        <>
                          <span className="font-medium">{s.user.name}</span>
                          <span className="block text-zinc-500">{s.user.email}</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">{s.partner.name}</td>
                    <td className="px-3 py-2 text-zinc-700">
                      {s.service?.title ?? s.serviceTitle ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {s.month.toString().padStart(2, '0')}/{s.year}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">{s.amount.toFixed(2)} €</td>
                    <td className="px-3 py-2 text-zinc-700">{statusLabel(s)}</td>
                    <td className="px-3 py-2 text-zinc-700">
                      {s.cashbackMbwayName ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {s.cashbackMbwayNumber ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
