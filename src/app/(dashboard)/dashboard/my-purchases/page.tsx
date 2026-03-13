'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type PartnerOption = {
  id: string;
  name: string;
  category?: { name: string } | null;
};

type ServiceOption = {
  id: string;
  title: string;
  price: string | null;
  priceOnRequest: boolean;
  commission: string | null;
};

export default function UserPurchasesPage() {
  const { user } = useAuth();

  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [amount, setAmount] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [loadingLookup, setLoadingLookup] = useState(true);

  const [sales, setSales] = useState<any[]>([]);
  const [loadingSales, setLoadingSales] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;

    (async () => {
      try {
        setError('');
        const [lookup, userSales] = await Promise.all([
          api.sales.userLookup(),
          api.sales.userList(),
        ]);
        setPartners(lookup.partners);
        setSales(userSales);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar dados de compras.',
        );
      } finally {
        setLoadingLookup(false);
        setLoadingSales(false);
      }
    })();
  }, [user]);

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

  async function handlePartnerChange(partnerId: string) {
    setSelectedPartnerId(partnerId);
    setSelectedServiceId('');
    setAmount('');
    if (!partnerId) {
      setServices([]);
      return;
    }
    try {
      setError('');
      const servicesData = await api.sales.userPartnerServices(partnerId);
      setServices(servicesData);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao carregar serviços do parceiro.',
      );
    }
  }

  async function reloadUserSales() {
    try {
      const userSales = await api.sales.userList();
      setSales(userSales);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao recarregar compras do utilizador.',
      );
    }
  }

  async function handleCreateSale(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPartnerId || !selectedServiceId || !month || !year) return;
    const numericAmount = amount ? Number(amount.replace(',', '.')) : undefined;
    if (isAmountRequired && (numericAmount == null || !Number.isFinite(numericAmount) || numericAmount <= 0)) {
      setError('Para serviços "sob consulta" o valor da compra é obrigatório.');
      return;
    }
    setCreating(true);
    setError('');
    try {
      await api.sales.userCreate({
        partnerId: selectedPartnerId,
        serviceId: selectedServiceId,
        month,
        year,
        amount: Number.isFinite(numericAmount ?? NaN)
          ? (numericAmount as number)
          : undefined,
      });
      setSelectedServiceId('');
      setAmount('');
      await reloadUserSales();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao registar a compra. Tente novamente.',
      );
    } finally {
      setCreating(false);
    }
  }

  if (!user) return null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Minhas compras</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Registe serviços que comprou a parceiros da Comunidade RPM e acompanhe o
        estado de aprovação. Em breve poderá solicitar cash back em compras
        aprovadas.
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
          Registar nova compra
        </h2>

        {loadingLookup ? (
          <p className="text-sm text-zinc-600">Carregando dados…</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-700">
                  Parceiro
                </label>
                <select
                  value={selectedPartnerId}
                  onChange={(e) => handlePartnerChange(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Selecione um parceiro</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.category?.name ? ` — ${p.category.name}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-zinc-700">
                  Serviço / produto
                </label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={!selectedPartnerId}
                >
                  <option value="">
                    {selectedPartnerId
                      ? 'Selecione um serviço'
                      : 'Selecione primeiro um parceiro'}
                  </option>
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
                  Mês da compra
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
                  Ano da compra
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
                    ? 'Valor da compra (obrigatório para serviço sob consulta)'
                    : 'Valor da compra'}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
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
                  !selectedPartnerId ||
                  !selectedServiceId ||
                  !month ||
                  !year ||
                  (isAmountRequired && (!amount.trim() || !Number.isFinite(Number(amount.replace(',', '.'))) || Number(amount.replace(',', '.')) <= 0))
                }
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'A registar…' : 'Registar compra'}
              </button>
            </div>
          </>
        )}
      </form>

      {/* Lista de compras */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold text-zinc-900">Histórico</h2>
        {loadingSales ? (
          <p className="mt-2 text-sm text-zinc-600">Carregando compras…</p>
        ) : sales.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">
            Ainda não há compras registadas.
          </p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-zinc-50 text-zinc-600">
                <tr>
                  <th className="px-3 py-2 text-left">Parceiro</th>
                  <th className="px-3 py-2 text-left">Serviço</th>
                  <th className="px-3 py-2 text-left">Mês/ano</th>
                  <th className="px-3 py-2 text-left">Valor</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                  <th className="px-3 py-2 text-left">Cash back</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} className="border-t border-zinc-200">
                    <td className="px-3 py-2 text-xs text-zinc-800">
                      {s.partner?.name}
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
                      {s.status === 'PENDING_PARTNER'
                        ? 'Aguardando aprovação do parceiro'
                        : s.status === 'APPROVED'
                        ? 'Compra aprovada'
                        : 'Compra recusada'}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-700">
                      {s.cashbackEligible ? (
                        <span className="text-emerald-700">
                          Elegível — funcionalidade em breve
                        </span>
                      ) : (
                        <span className="text-zinc-400">
                          Não disponível ou ainda pendente
                        </span>
                      )}
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

