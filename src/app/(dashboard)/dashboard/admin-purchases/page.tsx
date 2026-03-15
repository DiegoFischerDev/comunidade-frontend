'use client';

import { useEffect, useMemo, useState } from 'react';
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
  commissionPaymentStatus: string;
  cashbackRequestedAt: string | null;
  cashbackMbwayNumber: string | null;
  cashbackMbwayName: string | null;
  cashbackPaidAt: string | null;
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
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterSalesInput, setFilterSalesInput] = useState('');

  function saleMatchesFilter(s: SaleRow, term: string) {
    const t = term.trim().toLowerCase();
    if (!t) return true;

    const userName = s.user?.name ?? '';
    const userEmail = s.user?.email ?? '';
    const partnerName = s.partner?.name ?? '';
    const serviceTitle = s.service?.title ?? s.serviceTitle ?? '';
    const monthYear = `${s.month.toString().padStart(2, '0')}/${s.year}`;
    const amount = `${s.amount.toFixed(2)} €`;
    const commissionStatus =
      s.commissionPaymentStatus === 'PAID' ? 'pago' : 'pendente';
    const cashbackStatus = s.cashbackPaidAt
      ? 'pago 20 €'
      : s.cashbackRequestedAt
      ? 'solicitado 20 €'
      : '';
    const cashbackName = s.cashbackMbwayName ?? '';
    const cashbackNumber = s.cashbackMbwayNumber ?? '';
    const statusText = statusLabel(s);

    const haystack = [
      userName,
      userEmail,
      partnerName,
      serviceTitle,
      monthYear,
      amount,
      commissionStatus,
      cashbackStatus,
      cashbackName,
      cashbackNumber,
      statusText,
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(t);
  }

  const filteredSales = useMemo(
    () =>
      filterSalesInput.trim()
        ? sales.filter((s) => saleMatchesFilter(s, filterSalesInput))
        : sales,
    [sales, filterSalesInput],
  );

  function refetchSales() {
    const params: { partnerId?: string; status?: string; cashbackOnly?: boolean } = {};
    if (filterPartnerId) params.partnerId = filterPartnerId;
    if (filterStatus === 'CASHBACK') params.cashbackOnly = true;
    else if (filterStatus) params.status = filterStatus;
    return api.sales.adminList(params).then(setSales);
  }

  async function handleMarkCashbackPaid(sale: SaleRow) {
    const nome = sale.cashbackMbwayName ?? '—';
    const numero = sale.cashbackMbwayNumber ?? '—';
    if (!window.confirm(`Confirmar que o cashback foi pago?\n\nNome: ${nome}\nNúmero: ${numero}`)) return;
    setMarkingPaidId(sale.id);
    setError('');
    try {
      await api.sales.adminMarkCashbackPaid(sale.id);
      await refetchSales();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao marcar como pago.');
    } finally {
      setMarkingPaidId(null);
    }
  }

  async function handleDelete(sale: SaleRow) {
    const utilizador = sale.user ? `${sale.user.name} (${sale.user.email})` : '—';
    const parceiro = sale.partner?.name ?? '—';
    const servico = sale.service?.title ?? sale.serviceTitle ?? '—';
    if (!window.confirm(`Tem a certeza que deseja excluir este registo de compra? Esta ação não pode ser desfeita.\n\nUtilizador: ${utilizador}\nParceiro: ${parceiro}\nServiço: ${servico}`)) return;
    setDeletingId(sale.id);
    setError('');
    try {
      await api.sales.adminDeleteSale(sale.id);
      await refetchSales();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir.');
    } finally {
      setDeletingId(null);
    }
  }

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

      <div className="mt-6 flex flex-wrap gap-4">
        {sales.length > 0 && (
          <div className="w-full md:max-w-md">
            <label className="block text-xs font-medium text-zinc-700">
              Filtrar lista
            </label>
            <input
              type="text"
              value={filterSalesInput}
              onChange={(e) => setFilterSalesInput(e.target.value)}
              placeholder="Pesquisar por utilizador, parceiro, serviço, mês/ano, valor, cashback…"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        )}
        <div className="min-w-[180px]">
          <label className="block text-xs font-medium text-zinc-700">Parceiro</label>
          <select
            value={filterPartnerId}
            onChange={(e) => setFilterPartnerId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
        ) : filteredSales.length === 0 ? (
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
                  <th className="px-3 py-2 text-left">Comissão paga</th>
                  <th className="px-3 py-2 text-left">Cashback</th>
                  <th className="px-3 py-2 text-left">Nome Cashback</th>
                  <th className="px-3 py-2 text-left">Número Cashback</th>
                  <th className="px-3 py-2 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((s) => (
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
                      {s.commissionPaymentStatus === 'PAID' ? (
                        'Pago'
                      ) : (
                        <span className="font-medium text-red-600">Pendente</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {s.cashbackPaidAt ? (
                        <span className="font-semibold text-emerald-700">Pago 20 €</span>
                      ) : s.cashbackRequestedAt ? (
                        <span className="font-semibold text-emerald-700">Solicitado 20 €</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {s.cashbackMbwayName ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {s.cashbackMbwayNumber ?? '—'}
                    </td>
                    <td className="px-3 py-2 flex flex-wrap gap-2">
                      {s.cashbackRequestedAt && !s.cashbackPaidAt && (
                        <button
                          type="button"
                          disabled={markingPaidId === s.id}
                          onClick={() => handleMarkCashbackPaid(s)}
                          className="cursor-pointer rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                        >
                          {markingPaidId === s.id ? 'A marcar…' : 'Pagar MB Way'}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={deletingId === s.id}
                        onClick={() => handleDelete(s)}
                        className="cursor-pointer rounded-md border border-red-300 bg-white px-2 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === s.id ? 'A excluir…' : 'Excluir'}
                      </button>
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
