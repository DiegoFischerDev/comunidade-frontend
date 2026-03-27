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
  commissionEuro: number;
  status: string;
  commissionPaymentStatus: string;
  commissionPaidEuro: number | null;
  wantsInvoice?: boolean;
  invoiceName?: string | null;
  invoiceNif?: string | null;
  invoiceAddress?: string | null;
  invoicePostalCode?: string | null;
  invoiceRequestedAt?: string | null;
  invoicePdfUrl?: string | null;
  invoiceSentAt?: string | null;
  cashbackRequestedAt: string | null;
  cashbackMbwayNumber: string | null;
  cashbackMbwayName: string | null;
  cashbackPaymentProofUrl?: string | null;
  cashbackPaidAt: string | null;
  user: { id: string; name: string; email: string } | null;
  partner: { id: string; name: string };
  service: { title: string; cashbackEuro: number | null } | null;
  serviceTitle: string | null;
};

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os estados' },
  { value: 'PENDING_PARTNER', label: 'Aguardando aprovação' },
  { value: 'APPROVED', label: 'Aprovada' },
  { value: 'REJECTED', label: 'Recusada' },
  { value: 'CASHBACK', label: 'Cashback solicitado' },
];

function commissionStatusLabel(s: SaleRow): string {
  if (s.status === 'REJECTED') return '—';
  if (s.commissionPaymentStatus === 'PAID') {
    if (s.wantsInvoice) {
      return s.invoiceSentAt ? 'Fatura enviada' : 'Aguardando emissão de fatura';
    }
    return 'Comissão paga';
  }
  return 'Comissão pendente';
}

function commissionStatusBadgeClass(s: SaleRow): string {
  if (s.status === 'REJECTED') return 'bg-zinc-100 text-zinc-700';
  if (s.commissionPaymentStatus === 'PAID') {
    if (s.wantsInvoice && !s.invoiceSentAt) return 'bg-amber-50 text-amber-700';
    if (s.wantsInvoice && s.invoiceSentAt) return 'bg-violet-50 text-violet-700';
    return 'bg-emerald-50 text-emerald-700';
  }
  return 'bg-red-50 text-red-700';
}

function cashbackStatusLabel(s: SaleRow): string {
  if (s.cashbackPaidAt) return 'Cashback pago';
  if (s.cashbackRequestedAt && s.cashbackMbwayNumber) return 'Cashback solicitado';
  return '—';
}

function cashbackStatusBadgeClass(s: SaleRow): string {
  if (s.cashbackPaidAt) return 'bg-emerald-100 text-emerald-800';
  if (s.cashbackRequestedAt && s.cashbackMbwayNumber) return 'bg-sky-50 text-sky-700';
  return 'bg-zinc-100 text-zinc-700';
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
  const [invoiceModalSale, setInvoiceModalSale] = useState<SaleRow | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);
  const [cashbackModalSale, setCashbackModalSale] = useState<SaleRow | null>(null);
  const [cashbackProofFile, setCashbackProofFile] = useState<File | null>(null);
  const [payingCashbackId, setPayingCashbackId] = useState<string | null>(null);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const actionClass =
    'cursor-pointer rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50';
  const actionLinkClass =
    'inline-flex items-center cursor-pointer rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50';

  function resolveInvoiceUrl(url?: string | null) {
    if (!url) return null;
    return url.startsWith('/uploads/') ? `${API_URL}${url}` : url;
  }

  function resolveUploadUrl(url?: string | null) {
    if (!url) return null;
    return url.startsWith('/uploads/') ? `${API_URL}${url}` : url;
  }

  function saleMatchesFilter(s: SaleRow, term: string) {
    const t = term.trim().toLowerCase();
    if (!t) return true;

    const userName = s.user?.name ?? '';
    const userEmail = s.user?.email ?? '';
    const partnerName = s.partner?.name ?? '';
    const serviceTitle = s.service?.title ?? s.serviceTitle ?? '';
    const monthYear = `${s.month.toString().padStart(2, '0')}/${s.year}`;
    const amount = `${s.amount.toFixed(2)} €`;
    const commissionExpected = `${(s.commissionEuro ?? 0).toFixed(2)} €`;
    const commissionPaid =
      s.commissionPaidEuro != null ? `${s.commissionPaidEuro.toFixed(2)} €` : '';
    const commissionStatus =
      s.commissionPaymentStatus === 'PAID' ? 'pago' : 'pendente';
    const cashbackStatus = s.cashbackPaidAt
      ? 'cashback pago'
      : s.cashbackRequestedAt
      ? 'cashback solicitado'
      : '';
    const cashbackName = s.cashbackMbwayName ?? '';
    const cashbackNumber = s.cashbackMbwayNumber ?? '';
    const statusText = `${commissionStatusLabel(s)} ${cashbackStatusLabel(s)}`;
    const invoiceText = s.wantsInvoice
      ? [
          s.invoiceName ?? '',
          s.invoiceNif ?? '',
          s.invoiceAddress ?? '',
          s.invoicePostalCode ?? '',
        ]
          .join(' ')
          .trim()
      : '';

    const haystack = [
      userName,
      userEmail,
      partnerName,
      serviceTitle,
      monthYear,
      amount,
      commissionExpected,
      commissionPaid,
      commissionStatus,
      cashbackStatus,
      cashbackName,
      cashbackNumber,
      statusText,
      invoiceText,
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

  async function handleSendInvoice() {
    if (!invoiceModalSale || !invoiceFile) return;
    setError('');
    setSendingInvoiceId(invoiceModalSale.id);
    try {
      await api.sales.adminSendInvoice(invoiceModalSale.id, invoiceFile);
      setInvoiceModalSale(null);
      setInvoiceFile(null);
      await refetchSales();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar fatura.');
    } finally {
      setSendingInvoiceId(null);
    }
  }

  async function handlePayCashback() {
    if (!cashbackModalSale || !cashbackProofFile) return;
    setError('');
    setPayingCashbackId(cashbackModalSale.id);
    try {
      await api.sales.adminPayCashback(cashbackModalSale.id, cashbackProofFile);
      setCashbackModalSale(null);
      setCashbackProofFile(null);
      await refetchSales();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao pagar cashback.');
    } finally {
      setPayingCashbackId(null);
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
                  <th className="px-3 py-2 text-left">Valor do serviço</th>
                  <th className="px-3 py-2 text-left">Estado da comissão</th>
                  <th className="px-3 py-2 text-left">Comissão sugerida</th>
                  <th className="px-3 py-2 text-left">Comissão paga</th>
                  <th className="px-3 py-2 text-left">Estado do cashback</th>
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
                    <td className="px-3 py-2 text-zinc-700">
                      {commissionStatusLabel(s) === '—' ? (
                        '—'
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${commissionStatusBadgeClass(
                            s,
                          )}`}
                        >
                          {commissionStatusLabel(s)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {s.status === 'REJECTED' ? '—' : `${s.commissionEuro.toFixed(2)} €`}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {s.status === 'REJECTED' ? (
                        '—'
                      ) : s.commissionPaymentStatus === 'PAID' &&
                        s.commissionPaidEuro != null ? (
                        `${s.commissionPaidEuro.toFixed(2)} €`
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {cashbackStatusLabel(s) === '—' ? (
                        '—'
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cashbackStatusBadgeClass(
                            s,
                          )}`}
                        >
                          {cashbackStatusLabel(s)}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 flex flex-wrap gap-2">
                      {s.invoicePdfUrl && (
                        <a
                          href={resolveInvoiceUrl(s.invoicePdfUrl) ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className={actionLinkClass}
                        >
                          Ver fatura
                        </a>
                      )}
                      {s.wantsInvoice &&
                        s.commissionPaymentStatus === 'PAID' &&
                        s.invoicePdfUrl && (
                          <button
                            type="button"
                            disabled={sendingInvoiceId === s.id}
                            onClick={() => {
                              setInvoiceModalSale(s);
                              setInvoiceFile(null);
                            }}
                            className={actionClass}
                          >
                            Editar fatura
                          </button>
                        )}
                      {s.wantsInvoice &&
                        s.commissionPaymentStatus === 'PAID' &&
                        !s.invoiceSentAt && (
                          <button
                            type="button"
                            disabled={sendingInvoiceId === s.id}
                            onClick={() => {
                              setInvoiceModalSale(s);
                              setInvoiceFile(null);
                            }}
                            className={actionClass}
                          >
                            {sendingInvoiceId === s.id
                              ? 'A enviar…'
                              : 'Enviar fatura'}
                          </button>
                        )}
                      {s.cashbackRequestedAt && !s.cashbackPaidAt && (
                        <button
                          type="button"
                          disabled={payingCashbackId === s.id}
                          onClick={() => {
                            setCashbackModalSale(s);
                            setCashbackProofFile(null);
                          }}
                          className={actionClass}
                        >
                          {payingCashbackId === s.id ? 'A abrir…' : 'Pagar cashback'}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={deletingId === s.id}
                        onClick={() => handleDelete(s)}
                        className={actionClass}
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

      {invoiceModalSale && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            if (!sendingInvoiceId) setInvoiceModalSale(null);
          }}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-900">
                {invoiceModalSale.invoicePdfUrl ? 'Editar fatura (PDF)' : 'Enviar fatura (PDF)'}
              </h3>
              <button
                type="button"
                onClick={() => !sendingInvoiceId && setInvoiceModalSale(null)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-xs text-zinc-500 hover:bg-zinc-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700">
              <p>
                <span className="font-semibold">Parceiro:</span>{' '}
                {invoiceModalSale.partner.name}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Valor fatura (comissão paga):</span>{' '}
                {invoiceModalSale.commissionPaidEuro != null
                  ? `${invoiceModalSale.commissionPaidEuro.toFixed(2)} €`
                  : '—'}
              </p>
              <div className="mt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
                  Dados de faturação
                </p>
                <div className="mt-1 space-y-0.5">
                  <p>
                    <span className="font-semibold">Nome/Empresa:</span>{' '}
                    {invoiceModalSale.invoiceName ?? '—'}
                  </p>
                  <p>
                    <span className="font-semibold">NIF:</span>{' '}
                    {invoiceModalSale.invoiceNif ?? '—'}
                  </p>
                  <p>
                    <span className="font-semibold">Morada:</span>{' '}
                    {invoiceModalSale.invoiceAddress ?? '—'}
                  </p>
                  <p>
                    <span className="font-semibold">Código postal:</span>{' '}
                    {invoiceModalSale.invoicePostalCode ?? '—'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <label className="block text-xs font-medium text-zinc-700">
                Upload do PDF
              </label>
              <input
                type="file"
                accept="application/pdf,.pdf"
                disabled={sendingInvoiceId === invoiceModalSale.id}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setInvoiceFile(f);
                }}
                className="block w-full text-xs text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
              />
            </div>

            <div className="mt-5 flex justify-end gap-3">
              {invoiceModalSale.invoicePdfUrl && (
                <a
                  href={resolveInvoiceUrl(invoiceModalSale.invoicePdfUrl) ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className={`${actionLinkClass} mr-auto`}
                >
                  Ver fatura
                </a>
              )}
              <button
                type="button"
                disabled={sendingInvoiceId === invoiceModalSale.id}
                onClick={() => setInvoiceModalSale(null)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!invoiceFile || sendingInvoiceId === invoiceModalSale.id}
                onClick={handleSendInvoice}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                {sendingInvoiceId === invoiceModalSale.id
                  ? 'A enviar…'
                  : invoiceModalSale.invoicePdfUrl
                    ? 'Enviar nova fatura'
                    : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cashbackModalSale && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => {
            if (!payingCashbackId) setCashbackModalSale(null);
          }}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-900">
                Pagar cashback
              </h3>
              <button
                type="button"
                onClick={() => !payingCashbackId && setCashbackModalSale(null)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-xs text-zinc-500 hover:bg-zinc-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700">
              <p>
                <span className="font-semibold">Nome MB Way:</span>{' '}
                {cashbackModalSale.cashbackMbwayName ?? '—'}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Número MB Way:</span>{' '}
                {cashbackModalSale.cashbackMbwayNumber ?? '—'}
              </p>
              <p className="mt-1">
                <span className="font-semibold">Valor cashback:</span>{' '}
                {(() => {
                  const value =
                    cashbackModalSale.service?.cashbackEuro != null
                      ? cashbackModalSale.service.cashbackEuro
                      : 20;
                  return `${value.toFixed(2)} €`;
                })()}
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <label className="block text-xs font-medium text-zinc-700">
                Upload do comprovante de envio
              </label>
              <input
                type="file"
                accept="image/*,application/pdf,.pdf"
                disabled={payingCashbackId === cashbackModalSale.id}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setCashbackProofFile(f);
                }}
                className="block w-full text-xs text-zinc-700 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
              />
              <p className="text-[11px] text-zinc-500">
                Formatos suportados: imagem (JPG/PNG/WebP) ou PDF.
              </p>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              {cashbackModalSale.cashbackPaymentProofUrl && (
                <a
                  href={
                    resolveUploadUrl(cashbackModalSale.cashbackPaymentProofUrl) ??
                    undefined
                  }
                  target="_blank"
                  rel="noreferrer"
                  className={`${actionLinkClass} mr-auto`}
                >
                  Ver comprovante
                </a>
              )}
              <button
                type="button"
                disabled={payingCashbackId === cashbackModalSale.id}
                onClick={() => setCashbackModalSale(null)}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={
                  !cashbackProofFile || payingCashbackId === cashbackModalSale.id
                }
                onClick={handlePayCashback}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                {payingCashbackId === cashbackModalSale.id
                  ? 'A enviar…'
                  : 'Confirmar pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
