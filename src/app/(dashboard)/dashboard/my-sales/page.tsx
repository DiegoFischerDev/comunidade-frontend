'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type LeadOption = {
  id: string;
  createdAt: string;
  user: { id: string; name: string | null; email: string; whatsapp: string | null };
};

type ServiceOption = {
  id: string;
  title: string;
  price: string | null;
  priceOnRequest: boolean;
  commissionEuro: number | null;
};

export default function PartnerSalesPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loadingLookup, setLoadingLookup] = useState(true);
  const [error, setError] = useState('');

  const [selectedLeadId, setSelectedLeadId] = useState<string>('');
  const [leadFilter, setLeadFilter] = useState('');
  const [leadDropdownOpen, setLeadDropdownOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [amount, setAmount] = useState<string>('');
  const [creating, setCreating] = useState(false);

  const [salesPending, setSalesPending] = useState<any[]>([]);
  const [salesApproved, setSalesApproved] = useState<any[]>([]);
  const [salesRejected, setSalesRejected] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);

  const leadDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'PARTNER') {
      setLoadingLookup(false);
      setLoadingSales(false);
      return;
    }

    (async () => {
      try {
        setError('');
        const [lookup, sales] = await Promise.all([
          api.sales.partnerLookup(),
          api.sales.partnerList(),
        ]);
        setLeads(lookup.leads);
        setServices(lookup.services);
        setSalesPending(sales.pending);
        setSalesApproved(sales.approved);
        setSalesRejected(sales.rejected);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar dados de vendas do parceiro.',
        );
      } finally {
        setLoadingLookup(false);
        setLoadingSales(false);
      }
    })();
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!leadDropdownRef.current) return;
      if (!(event.target instanceof Node)) return;
      if (!leadDropdownRef.current.contains(event.target)) {
        setLeadDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );
  const isAmountRequired = selectedService?.priceOnRequest ?? false;

  useEffect(() => {
    if (!selectedServiceId || !selectedService) return;
    if (selectedService.priceOnRequest) {
      setAmount('');
    } else if (selectedService.price) {
      setAmount(selectedService.price.replace(',', '.'));
    } else {
      setAmount('');
    }
  }, [selectedServiceId, selectedService?.id, selectedService?.priceOnRequest, selectedService?.price]);

  const filteredLeads = useMemo(() => {
    const term = leadFilter.trim().toLowerCase();
    if (!term) return leads;
    return leads.filter((lead) => {
      const name = (lead.user.name ?? '').toLowerCase();
      const email = lead.user.email.toLowerCase();
      const whatsapp = (lead.user.whatsapp ?? '').toLowerCase();
      return (
        name.includes(term) || email.includes(term) || whatsapp.includes(term)
      );
    });
  }, [leadFilter, leads]);

  async function reloadSales() {
    try {
      const sales = await api.sales.partnerList();
      setSalesPending(sales.pending);
      setSalesApproved(sales.approved);
      setSalesRejected(sales.rejected);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao recarregar vendas do parceiro.',
      );
    }
  }

  async function handleCreateSale(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLeadId || !selectedServiceId || !month || !year) return;
    const numericAmount = amount ? Number(amount.replace(',', '.')) : undefined;
    if (isAmountRequired && (numericAmount == null || !Number.isFinite(numericAmount) || numericAmount <= 0)) {
      setError('Para serviços "sob consulta" o valor da venda é obrigatório.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await api.sales.partnerCreate({
        leadId: selectedLeadId,
        serviceId: selectedServiceId,
        month,
        year,
        amount: Number.isFinite(numericAmount ?? NaN)
          ? (numericAmount as number)
          : undefined,
      });
      setSelectedLeadId('');
      setLeadFilter('');
      setSelectedServiceId('');
      setAmount('');
      await reloadSales();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao criar registro de venda.',
      );
    } finally {
      setCreating(false);
    }
  }

  async function updateSaleStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    setError('');
    try {
      await api.sales.partnerUpdateStatus(id, status);
      await reloadSales();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao atualizar estado da venda.',
      );
    }
  }

  if (!user) return null;

  if (user.role !== 'PARTNER') {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Minhas vendas</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Esta área é exclusiva para parceiros.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Minhas vendas</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Registe as vendas feitas a membros da Comunidade RPM e acompanhe o
        reconhecimento das comissões.
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Novo registro */}
      <form
        onSubmit={handleCreateSale}
        className="mt-6 space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
      >
        <h2 className="text-sm font-semibold text-zinc-900">
          Novo registro de venda
        </h2>

        {loadingLookup ? (
          <p className="text-sm text-zinc-600">Carregando dados…</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1" ref={leadDropdownRef}>
                <label className="block text-xs font-medium text-zinc-700">
                  Lead (cliente)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Filtrar por nome, email ou WhatsApp"
                    value={leadFilter}
                    onChange={(e) => {
                      setLeadFilter(e.target.value);
                      setLeadDropdownOpen(true);
                    }}
                    onFocus={() => setLeadDropdownOpen(true)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {leadDropdownOpen && (
                    <div className="absolute left-0 right-0 z-10 mt-1 max-h-48 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
                      {filteredLeads.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-zinc-500">
                          Nenhum lead encontrado com este filtro.
                        </p>
                      ) : (
                        filteredLeads.slice(0, 7).map((lead) => {
                          const label = `${
                            lead.user.name || 'Sem nome'
                          } • ${lead.user.email} ${
                            lead.user.whatsapp ? `• ${lead.user.whatsapp}` : ''
                          }`;
                          return (
                            <button
                              key={lead.id}
                              type="button"
                              onClick={() => {
                                setSelectedLeadId(lead.id);
                                setLeadFilter(label);
                                setLeadDropdownOpen(false);
                              }}
                              className={`block w-full cursor-pointer px-3 py-2 text-left text-xs ${
                                selectedLeadId === lead.id
                                  ? 'bg-blue-600 text-white'
                                  : 'text-zinc-800 hover:bg-zinc-100'
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-700">
                  Serviço / produto
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Selecione um serviço</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                      {s.priceOnRequest ? ' — Sob consulta' : s.price ? ` — ${s.price}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-700">
                  Mês da venda
                </label>
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {Array.from({ length: 12 }).map((_, idx) => {
                    const m = idx + 1;
                    return (
                      <option key={m} value={m}>
                        {m.toString().padStart(2, '0')}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-700">
                  Ano da venda
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const y = new Date().getFullYear() - 2 + idx;
                    return (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-700">
                  {isAmountRequired
                    ? 'Valor da venda (obrigatório para serviço sob consulta)'
                    : 'Valor da venda'}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={isAmountRequired ? 'Ex: 120.50' : 'Preenchido pelo valor do serviço'}
                  required={isAmountRequired}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={
                  creating ||
                  !selectedLeadId ||
                  !selectedServiceId ||
                  !month ||
                  !year ||
                  (isAmountRequired && (!amount.trim() || !Number.isFinite(Number(amount.replace(',', '.'))) || Number(amount.replace(',', '.')) <= 0))
                }
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'A criar registro…' : 'Criar registro'}
              </button>
            </div>
          </>
        )}
      </form>

      {/* Tabelas de vendas */}
      <div className="mt-8 space-y-6">
        <section>
          <h2 className="text-sm font-semibold text-zinc-900">
            Vendas pendentes de reconhecimento
          </h2>
          {loadingSales ? (
            <p className="mt-2 text-sm text-zinc-600">Carregando vendas…</p>
          ) : salesPending.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">
              Não há vendas pendentes de reconhecimento.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
              <table className="min-w-full text-xs md:text-sm">
                <thead className="bg-zinc-50 text-zinc-600">
                  <tr>
                    <th className="px-3 py-2 text-left">Cliente</th>
                    <th className="px-3 py-2 text-left">Serviço</th>
                    <th className="px-3 py-2 text-left">Mês/ano</th>
                    <th className="px-3 py-2 text-left">Valor</th>
                    <th className="px-3 py-2 text-left">Comissão RPM</th>
                    <th className="px-3 py-2 text-left">Registrado por</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {salesPending.map((s) => (
                    <tr key={s.id} className="border-t border-zinc-200">
                      <td className="px-3 py-2">
                        <div className="max-w-[220px]">
                          <div className="truncate text-xs font-medium text-zinc-900">
                            {s.user?.name || 'Sem nome'}
                          </div>
                          <div className="truncate text-[11px] text-zinc-500">
                            {s.user?.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-zinc-800">
                          {s.service?.title ?? s.serviceTitle ?? 'Serviço removido'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-700">
                        {s.month.toString().padStart(2, '0')}/{s.year}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-700">
                        {s.amount.toFixed(2)} €
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-700">
                        {s.commissionEuro.toFixed(2)} €
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-700">
                        {s.createdByUser
                          ? s.createdByUser.name || s.createdByUser.email
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => updateSaleStatus(s.id, 'APPROVED')}
                          className="mr-2 cursor-pointer rounded bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          Aprovar
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSaleStatus(s.id, 'REJECTED')}
                          className="cursor-pointer rounded bg-red-50 px-3 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100"
                        >
                          Recusar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-zinc-900">
            Vendas reconhecidas
          </h2>
          {loadingSales ? (
            <p className="mt-2 text-sm text-zinc-600">Carregando vendas…</p>
          ) : salesApproved.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">
              Ainda não há vendas reconhecidas.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
              <table className="min-w-full text-xs md:text-sm">
                <thead className="bg-emerald-50 text-emerald-800">
                  <tr>
                    <th className="px-3 py-2 text-left">Cliente</th>
                    <th className="px-3 py-2 text-left">Serviço</th>
                    <th className="px-3 py-2 text-left">Mês/ano</th>
                    <th className="px-3 py-2 text-left">Valor</th>
                    <th className="px-3 py-2 text-left">Comissão RPM</th>
                    <th className="px-3 py-2 text-left">Registrado por</th>
                    <th className="px-3 py-2 text-left">Comissão</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {salesApproved.map((s) => (
                    <tr key={s.id} className="border-t border-zinc-200">
                      <td className="px-3 py-2">
                        <div className="max-w-[220px]">
                          <div className="truncate text-xs font-medium text-zinc-900">
                            {s.user?.name || 'Sem nome'}
                          </div>
                          <div className="truncate text-[11px] text-zinc-500">
                            {s.user?.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-800">
                        {s.service?.title ?? s.serviceTitle ?? 'Serviço removido'}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-700">
                        {s.month.toString().padStart(2, '0')}/{s.year}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-700">
                        {s.amount.toFixed(2)} €
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-700">
                        {s.commissionEuro.toFixed(2)} €
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-700">
                        {s.createdByUser
                          ? s.createdByUser.name || s.createdByUser.email
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-700">
                        {s.commissionPaymentStatus === 'PAID'
                          ? 'Comissão paga'
                          : 'Comissão pendente'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          className="cursor-pointer rounded bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100"
                          disabled={false}
                        >
                          Pagar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-zinc-900">
            Vendas recusadas
          </h2>
          {loadingSales ? (
            <p className="mt-2 text-sm text-zinc-600">Carregando vendas…</p>
          ) : salesRejected.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">
              Não há vendas recusadas.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
              <table className="min-w-full text-xs md:text-sm">
                <thead className="bg-red-50 text-red-800">
                  <tr>
                    <th className="px-3 py-2 text-left">Cliente</th>
                    <th className="px-3 py-2 text-left">Serviço</th>
                    <th className="px-3 py-2 text-left">Mês/ano</th>
                    <th className="px-3 py-2 text-left">Valor</th>
                    <th className="px-3 py-2 text-left">Comissão RPM</th>
                    <th className="px-3 py-2 text-left">Registrado por</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {salesRejected.map((s) => (
                    <tr key={s.id} className="border-t border-zinc-200">
                      <td className="px-3 py-2">
                        <div className="max-w-[220px]">
                          <div className="truncate text-xs font-medium text-zinc-900">
                            {s.user?.name || 'Sem nome'}
                          </div>
                          <div className="truncate text-[11px] text-zinc-500">
                            {s.user?.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-800">
                        {s.service?.title ?? s.serviceTitle ?? 'Serviço removido'}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-700">
                        {s.month.toString().padStart(2, '0')}/{s.year}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-700">
                        {s.amount.toFixed(2)} €
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-700">
                        {s.commissionEuro.toFixed(2)} €
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-700">
                        {s.createdByUser
                          ? s.createdByUser.name || s.createdByUser.email
                          : '—'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => updateSaleStatus(s.id, 'APPROVED')}
                          className="cursor-pointer rounded bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          Aprovar
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
    </div>
  );
}

