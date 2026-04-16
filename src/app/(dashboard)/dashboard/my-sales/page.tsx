'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { CardButton } from '@/components/ui/CardButton';

type LeadRow = Awaited<ReturnType<typeof api.partner.leads.list>>[number];
type ServiceRow = Awaited<ReturnType<typeof api.partner.services.list>>[number];
type SaleRow = Awaited<ReturnType<typeof api.partner.sales.list>>[number];
type PartnerMe = Awaited<ReturnType<typeof api.partner.me>>;

function formatEurString(value: string): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return `${value} €`;
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export default function MySalesPage() {
  const { user } = useAuth();
  const isPartner = user?.role === 'PARTNER';

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [partnerMe, setPartnerMe] = useState<PartnerMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [leadUserId, setLeadUserId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [amountEur, setAmountEur] = useState('');
  const [creating, setCreating] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [leadQuery, setLeadQuery] = useState('');
  const [leadDropdownOpen, setLeadDropdownOpen] = useState(false);

  const [payingSale, setPayingSale] = useState<SaleRow | null>(null);
  const [commissionEur, setCommissionEur] = useState('');
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [paying, setPaying] = useState(false);

  const hasBillingDetails = useMemo(() => {
    if (!partnerMe) return false;
    return Boolean(
      partnerMe.billingName?.trim() &&
        partnerMe.billingNif?.trim() &&
        partnerMe.billingAddress?.trim() &&
        partnerMe.billingPostalCode?.trim(),
    );
  }, [partnerMe]);

  useEffect(() => {
    if (!user) return;
    if (!isPartner) {
      setLoading(false);
      return;
    }
    (async () => {
      setError('');
      setLoading(true);
      try {
        const [leadsData, servicesData, salesData, me] = await Promise.all([
          api.partner.leads.list(),
          api.partner.services.list(),
          api.partner.sales.list(),
          api.partner.me(),
        ]);
        setLeads(leadsData);
        setServices(servicesData);
        setSales(salesData);
        setPartnerMe(me);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erro ao carregar vendas.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [user, isPartner]);

  const suggestedCommissionLabel = useMemo(() => {
    if (!payingSale) return null;
    return (
      payingSale.commissionSuggestedEur ??
      payingSale.service.rpmCommissionEur ??
      null
    );
  }, [payingSale]);

  const filteredLeads = useMemo(() => {
    const q = leadQuery.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) => {
      const name = (l.user.name ?? '').toLowerCase();
      const wa = (l.user.whatsapp ?? '').toLowerCase();
      const email = (l.user.email ?? '').toLowerCase();
      return name.includes(q) || wa.includes(q) || email.includes(q);
    });
  }, [leads, leadQuery]);

  if (!user) return null;

  if (!isPartner) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Minhas vendas</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Esta área é exclusiva para parceiros.
        </p>
      </div>
    );
  }

  async function handleCreateSale(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      if (!leadUserId) throw new Error('Selecione um lead.');
      if (!serviceId) throw new Error('Selecione um serviço.');
      if (!amountEur.trim()) throw new Error('Informe o valor da venda.');
      const created = await api.partner.sales.create({
        leadUserId,
        serviceId,
        amountEur: amountEur.trim(),
      });
      setSales((prev) => [created, ...prev]);
      setLeadUserId('');
      setServiceId('');
      setAmountEur('');
      setLeadQuery('');
      setLeadDropdownOpen(false);
      setCreateModalOpen(false);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Erro ao criar venda.',
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteSale(sale: SaleRow) {
    if (
      !window.confirm(
        `Remover esta venda?\n\nLead: ${sale.user.name ?? '—'}\nServiço: ${sale.service.title}\nValor: ${sale.amountEur} €`,
      )
    ) {
      return;
    }
    setError('');
    try {
      await api.partner.sales.delete(sale.id);
      setSales((prev) => prev.filter((x) => x.id !== sale.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover venda.');
    }
  }

  function openPayModal(sale: SaleRow) {
    setPayingSale(sale);
    setWantsInvoice(false);
    setCommissionEur('');
  }

  async function startPayment(method: 'card' | 'mbway') {
    if (!payingSale) return;
    setError('');
    setPaying(true);
    try {
      const body = { commissionEur: commissionEur.trim(), wantsInvoice };
      const res =
        method === 'mbway'
          ? await api.partner.sales.payCommissionMbWay(payingSale.id, body)
          : await api.partner.sales.payCommission(payingSale.id, body);
      window.location.href = res.url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao iniciar pagamento.',
      );
      setPaying(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Minhas vendas</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Registre vendas feitas para leads e pague a comissão RPM quando desejar.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex">
        <CardButton
          type="button"
          variant="primary"
          onClick={() => {
            setError('');
            setCreateError('');
            setLeadUserId('');
            setServiceId('');
            setAmountEur('');
            setLeadQuery('');
            setLeadDropdownOpen(false);
            setCreateModalOpen(true);
          }}
        >
          Registrar venda
        </CardButton>
      </div>

      {createModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => !creating && setCreateModalOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Registrar nova venda
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Selecione o lead, o serviço e o valor vendido.
                </p>
              </div>
              <button
                type="button"
                disabled={creating}
                onClick={() => setCreateModalOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-xs text-zinc-500 hover:bg-zinc-50 disabled:opacity-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSale} className="mt-4 space-y-4">
              {createError && (
                <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {createError}
                </div>
              )}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-700">
                  Lead
                </label>
                <div className="relative">
                  <input
                    value={leadQuery}
                    onChange={(e) => {
                      setLeadQuery(e.target.value);
                      setLeadUserId('');
                      setLeadDropdownOpen(true);
                    }}
                    onFocus={() => setLeadDropdownOpen(true)}
                    onBlur={() => {
                      // pequeno delay para permitir clique no item
                      window.setTimeout(() => setLeadDropdownOpen(false), 120);
                    }}
                    placeholder="Digite o nome do lead…"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />

                  {leadDropdownOpen && (
                    <div className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
                      {filteredLeads.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-zinc-500">
                          Nenhum lead encontrado.
                        </div>
                      ) : (
                        filteredLeads.map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setLeadUserId(l.user.id);
                              setLeadQuery(
                                l.user.name ??
                                  l.user.whatsapp ??
                                  l.user.email ??
                                  '',
                              );
                              setLeadDropdownOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
                          >
                            <span className="min-w-0 truncate font-medium text-zinc-900">
                              {l.user.name ?? '—'}
                            </span>
                            <span className="shrink-0 text-xs text-zinc-600">
                              {l.user.whatsapp ?? '—'}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-zinc-500">
                  Dica: se o lead não aparecer, ele precisa existir na tua lista
                  de leads.
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-700">
                  Serviço
                </label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Selecionar…</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-700">
                  Valor da venda (EUR)
                </label>
                <input
                  value={amountEur}
                  onChange={(e) => setAmountEur(e.target.value)}
                  placeholder="Ex: 200"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <CardButton
                  type="button"
                  variant="secondary"
                  disabled={creating}
                  onClick={() => setCreateModalOpen(false)}
                >
                  Cancelar
                </CardButton>
                <CardButton type="submit" variant="primary" loading={creating}>
                  {creating ? 'Registrando…' : 'Registrar'}
                </CardButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-zinc-600">Carregando vendas…</p>
      ) : sales.length === 0 ? (
        <p className="text-sm text-zinc-500">Ainda não há vendas registradas.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-2 text-left">Lead</th>
                <th className="px-4 py-2 text-left">Serviço</th>
                <th className="px-4 py-2 text-left">Valor</th>
                <th className="px-4 py-2 text-left">Comissão RPM</th>
                <th className="px-4 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} className="border-t border-zinc-200">
                  <td className="px-4 py-2 align-top">{s.user.name ?? '—'}</td>
                  <td className="px-4 py-2 align-top">{s.service.title}</td>
                  <td className="px-4 py-2 align-top">{s.amountEur} €</td>
                  <td className="px-4 py-2 align-top">
                    {s.commissionPaymentStatus === 'PAID' ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {s.commissionPaidEur ? (
                          <span className="text-xs font-medium text-zinc-800">
                            {s.commissionPaidEur} €
                          </span>
                        ) : null}
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                          Pago
                        </span>
                        {s.paidAt ? (
                          <span className="text-xs text-zinc-500">
                            {new Date(s.paidAt).toLocaleString('pt-PT')}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        Pendente
                      </span>
                    )}
                  </td>
                  <td className="space-x-2 px-4 py-2 text-right align-top">
                    {s.commissionPaymentStatus !== 'PAID' && (
                      <>
                        <button
                          type="button"
                          onClick={() => openPayModal(s)}
                          className="cursor-pointer rounded bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          Pagar comissão
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSale(s)}
                          className="cursor-pointer rounded bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                        >
                          Excluir
                        </button>
                      </>
                    )}
                    {s.commissionPaymentStatus === 'PAID' && (
                      <span className="text-xs text-zinc-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {payingSale && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => !paying && setPayingSale(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Pagar comissão
                </h2>
              </div>
              <button
                type="button"
                disabled={paying}
                onClick={() => setPayingSale(null)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-xs text-zinc-500 hover:bg-zinc-50 disabled:opacity-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
                <p>
                  <span className="font-medium text-zinc-900">Lead:</span>{' '}
                  {payingSale.user.name ?? '—'}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-zinc-900">Serviço:</span>{' '}
                  {payingSale.service.title}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-zinc-900">Valor vendido:</span>{' '}
                  {payingSale.amountEur} €
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Registrado em {new Date(payingSale.createdAt).toLocaleString('pt-PT')}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-sm font-medium text-zinc-700">
                    Valor da comissão (EUR)
                  </label>
                  {suggestedCommissionLabel && (
                    <span className="text-xs text-zinc-500">
                      Comissão sugerida:{' '}
                      <span className="font-medium text-zinc-700">
                        {suggestedCommissionLabel}
                      </span>
                    </span>
                  )}
                </div>
                <input
                  value={commissionEur}
                  onChange={(e) => setCommissionEur(e.target.value)}
                  placeholder="Ex: 10"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={wantsInvoice}
                  onChange={(e) => setWantsInvoice(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                />
                Quero fatura
              </label>

              {wantsInvoice && (
                hasBillingDetails ? (
                  <div className="rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-600">
                    <p className="font-medium text-zinc-800">Dados de faturação</p>
                    <div className="mt-1 space-y-1">
                      <p>
                        <span className="font-medium text-zinc-800">Nome:</span>{' '}
                        {partnerMe?.billingName ?? '—'}
                      </p>
                      <p>
                        <span className="font-medium text-zinc-800">NIF:</span>{' '}
                        {partnerMe?.billingNif ?? '—'}
                      </p>
                      <p>
                        <span className="font-medium text-zinc-800">Morada:</span>{' '}
                        {partnerMe?.billingAddress ?? '—'}
                      </p>
                      <p>
                        <span className="font-medium text-zinc-800">Código postal:</span>{' '}
                        {partnerMe?.billingPostalCode ?? '—'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/40 px-3 py-2 text-xs text-amber-900">
                    Para pedir fatura, preencha primeiro os dados de faturação em{' '}
                    <a
                      href="/dashboard/business"
                      className="font-semibold underline underline-offset-2 hover:opacity-80"
                    >
                      Minha empresa
                    </a>
                    .
                  </div>
                )
              )}

              <div className="pt-2">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Escolha a forma de pagamento
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    disabled={
                      paying ||
                      !commissionEur.trim() ||
                      (wantsInvoice && !hasBillingDetails)
                    }
                    onClick={() => startPayment('card')}
                    className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                      <svg
                        aria-hidden
                        width="32"
                        height="32"
                        viewBox="0 0 32 32"
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-10 w-10"
                      >
                        <path fill="#D8DEE4" d="M0 0h32v32H0z" />
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M6 10.375C6 9.339 6.84 8.5 7.875 8.5h16.25C25.16 8.5 26 9.34 26 10.375v11.25c0 1.035-.84 1.875-1.875 1.875H7.875A1.875 1.875 0 0 1 6 21.625v-11.25Zm1.875 0h16.25v1.875H7.875v-1.875Zm16.25 3.75v7.5H7.875v-7.5h16.25Z"
                          fill="#474E5A"
                        />
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M14.75 18.813c0-.518.42-.938.938-.938h5.624a.937.937 0 1 1 0 1.875h-5.625a.937.937 0 0 1-.937-.938Z"
                          fill="#474E5A"
                        />
                      </svg>
                    </span>
                    <span className="flex-1 font-medium text-zinc-800">Cartão</span>
                    <span className="text-sm font-semibold text-emerald-700">
                      {commissionEur.trim() ? formatEurString(commissionEur.trim()) : '—'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={
                      paying ||
                      !commissionEur.trim() ||
                      (wantsInvoice && !hasBillingDetails)
                    }
                    onClick={() => startPayment('mbway')}
                    className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-zinc-200 bg-white px-4 py-3 text-left transition-colors hover:border-emerald-400 hover:bg-emerald-50/50 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                      <svg
                        aria-hidden
                        width="32"
                        height="32"
                        viewBox="0 0 32 32"
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-10 w-10"
                      >
                        <path fill="#2E333A" d="M0 0h32v32H0z" />
                        <path
                          fill="red"
                          d="M7.792 26.001h16.417c1.885 0 1.904-1.729 1.712-2.759-.105-.694-1.235-.687-1.36 0v.804a.657.657 0 0 1-.642.669H8.079c-.352 0-.64-.301-.64-.67v-.803c-.125-.687-1.256-.694-1.36 0-.192 1.03-.175 2.759 1.713 2.759Zm15.052-20H9.216c-.895 0-1.628.407-1.627 1.393v.881c0 1.172 1.503 1.18 1.503-.025v-.458a.532.532 0 0 1 .52-.542h12.763a.533.533 0 0 1 .372.163.532.532 0 0 1 .15.379v.468c0 1.2 1.574 1.204 1.574-.008v-.858c0-.986-.732-1.394-1.627-1.394Z"
                        />
                        <path
                          fill="#fff"
                          fillRule="evenodd"
                          d="M24.15 15.853a2.629 2.629 0 0 1 1.492 2.349c0 1.444-1.212 2.625-2.692 2.625h-4.147a.7.7 0 0 1-.706-.687v-8.22c0-.397.312-.722.693-.722h3.455c1.454 0 2.644 1.238 2.644 2.751a2.8 2.8 0 0 1-.739 1.904Zm-3.096-.67h1.318v-.015c.6-.096 1.062-.639 1.062-1.29 0-.717-.562-1.304-1.252-1.304h-2.653v6.822h3.364c.712 0 1.294-.607 1.294-1.348 0-.741-.583-1.347-1.294-1.347h-.521l-1.318-.003a.745.745 0 0 1-.727-.757c0-.417.327-.758.727-.758Zm-3.616 4.824a.858.858 0 0 1-.74.954.841.841 0 0 1-.915-.771l-.683-6.538-2.416 6.393-.003.006-.006.017-.006.013v.004l-.006.013-.01.02-.003.007-.006.012a.868.868 0 0 1-.171.234l-.015.015a.822.822 0 0 1-.144.106l-.004.001-.016.01-.015.008-.006.004-.02.008-.01.005-.01.004-.008.005-.016.006-.013.005-.01.004a.813.813 0 0 1-.25.05h-.061a.802.802 0 0 1-.272-.059l-.012-.005-.013-.005-.012-.005-.008-.005-.01-.003-.015-.01-.015-.007-.014-.008-.008-.004a.839.839 0 0 1-.127-.093l-.004-.002-.027-.025a.856.856 0 0 1-.022-.021l-.02-.023a.992.992 0 0 1-.025-.029l-.002-.003a.858.858 0 0 1-.088-.133l-.005-.007-.006-.013-.009-.019-.002-.005-.005-.01-.005-.01-.004-.01-.005-.01-.004-.012-.006-.015-2.418-6.398-.682 6.538a.84.84 0 0 1-.09.317.841.841 0 0 1-.207.259.84.84 0 0 1-.29.159.842.842 0 0 1-.328.035.859.859 0 0 1-.74-.954l.804-7.708v-.005a1.459 1.459 0 0 1 .689-1.088c.229-.135.491-.201.757-.19h.002c.09.004.175.016.253.034.43.105.795.417.967.872l2.06 5.446 2.056-5.446c.172-.455.537-.767.967-.872a1.378 1.378 0 0 1 1.546.726c.083.162.136.338.155.518v.004l.807 7.71Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    <span className="flex-1 font-medium text-zinc-800">MB WAY</span>
                    <span className="text-sm font-semibold text-emerald-700">
                      {commissionEur.trim() ? formatEurString(commissionEur.trim()) : '—'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

