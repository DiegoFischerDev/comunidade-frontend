'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { CardButton } from '@/components/ui/CardButton';

type LeadRow = Awaited<ReturnType<typeof api.partner.leads.list>>[number];
type ServiceRow = Awaited<ReturnType<typeof api.partner.services.list>>[number];
type SaleRow = Awaited<ReturnType<typeof api.partner.sales.list>>[number];

export default function MySalesPage() {
  const { user } = useAuth();
  const isPartner = user?.role === 'PARTNER';

  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [leadUserId, setLeadUserId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [amountEur, setAmountEur] = useState('');
  const [creating, setCreating] = useState(false);

  const [payingSale, setPayingSale] = useState<SaleRow | null>(null);
  const [commissionEur, setCommissionEur] = useState('');
  const [wantsInvoice, setWantsInvoice] = useState(false);
  const [paying, setPaying] = useState(false);

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
        const [leadsData, servicesData, salesData] = await Promise.all([
          api.partner.leads.list(),
          api.partner.services.list(),
          api.partner.sales.list(),
        ]);
        setLeads(leadsData);
        setServices(servicesData);
        setSales(salesData);
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
    setError('');
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar venda.');
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
    setCommissionEur(sale.commissionSuggestedEur ?? sale.service.rpmCommissionEur ?? '');
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

      <form
        onSubmit={handleCreateSale}
        className="grid gap-4 rounded-lg border border-zinc-200 bg-white p-4 md:grid-cols-3"
      >
        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-700">Lead</label>
          <select
            value={leadUserId}
            onChange={(e) => setLeadUserId(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Selecionar…</option>
            {leads.map((l) => (
              <option key={l.id} value={l.user.id}>
                {l.user.name ?? l.user.whatsapp ?? l.user.email}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500">
            Dica: se o lead não aparecer, ele precisa existir na tua lista de leads.
          </p>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-zinc-700">Serviço</label>
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

        <div className="md:col-span-3">
          <CardButton type="submit" variant="primary" loading={creating}>
            {creating ? 'Registrando…' : 'Registrar venda'}
          </CardButton>
        </div>
      </form>

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
                <th className="px-4 py-2 text-left">Comissão paga</th>
                <th className="px-4 py-2 text-left">Vai querer fatura</th>
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
                      <span className="text-xs font-medium text-emerald-700">
                        {s.commissionPaidEur ?? 'Pago'}
                        {s.commissionPaidEur ? ' €' : ''}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500">Pendente</span>
                    )}
                  </td>
                  <td className="px-4 py-2 align-top">
                    {s.wantsInvoice ? 'Sim' : 'Não'}
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
                <p className="mt-1 text-sm text-zinc-600">
                  Serviço: <span className="font-medium">{payingSale.service.title}</span>
                </p>
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

            {suggestedCommissionLabel && (
              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                Comissão sugerida: <span className="font-semibold">{suggestedCommissionLabel} €</span>
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-zinc-700">
                  Valor da comissão (EUR)
                </label>
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
                Vai querer fatura?
              </label>

              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
                <CardButton
                  type="button"
                  variant="secondary"
                  loading={paying}
                  onClick={() => startPayment('mbway')}
                >
                  Pagar com MB WAY
                </CardButton>
                <CardButton
                  type="button"
                  variant="primary"
                  loading={paying}
                  onClick={() => startPayment('card')}
                >
                  Pagar com cartão
                </CardButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

