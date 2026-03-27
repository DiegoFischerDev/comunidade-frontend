'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, getAuthToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { OPEN_MEMBERSHIP_MODAL_EVENT } from '@/components/FloatingWhatsAppButton';

const MBWAY_STORAGE_KEY = 'comunidade_rpm_mbway';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function getStoredMbway(): { number: string; name: string } {
  if (typeof window === 'undefined') return { number: '', name: '' };
  try {
    const raw = localStorage.getItem(MBWAY_STORAGE_KEY);
    if (!raw) return { number: '', name: '' };
    const parsed = JSON.parse(raw) as { number?: string; name?: string };
    return {
      number: typeof parsed?.number === 'string' ? parsed.number : '',
      name: typeof parsed?.name === 'string' ? parsed.name : '',
    };
  } catch {
    return { number: '', name: '' };
  }
}

function setStoredMbway(number: string, name: string) {
  try {
    localStorage.setItem(MBWAY_STORAGE_KEY, JSON.stringify({ number, name }));
  } catch {
    // ignore
  }
}

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
  cashbackEuro: number | null;
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
  const [newSaleModalOpen, setNewSaleModalOpen] = useState(false);
  const [mbwayModalSaleId, setMbwayModalSaleId] = useState<string | null>(null);
  const [mbwayNumber, setMbwayNumber] = useState('');
  const [mbwayName, setMbwayName] = useState('');
  const [mbwaySubmitting, setMbwaySubmitting] = useState(false);
  const [uploadProofModalSaleId, setUploadProofModalSaleId] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => {
    if (mbwayModalSaleId) {
      const stored = getStoredMbway();
      setMbwayNumber(stored.number);
      setMbwayName(stored.name);
    }
  }, [mbwayModalSaleId]);

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
      setNewSaleModalOpen(false);
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
      <h1 className="text-2xl font-semibold text-zinc-900">Cashback</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Registe serviços que comprou a parceiros da Comunidade RPM e receba cashback (exclusivo para membros)
      </p>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Botão para abrir modal de novo registro */}
      <div className="mt-6">
        <button
          type="button"
          disabled={loadingLookup}
          onClick={() => setNewSaleModalOpen(true)}
          className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          Registar nova compra
        </button>
      </div>

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
                  <th className="px-3 py-2 text-left">Cashback</th>
                  <th className="px-3 py-2 text-left">Ações</th>
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
                    <td className="px-3 py-2 text-xs">
                      {s.cashbackRequestedAt && s.cashbackMbwayNumber ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100">
                          Mbway para {s.cashbackMbwayNumber}
                        </span>
                      ) : s.status === 'PENDING_PARTNER' ? (
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-100">
                          Aguardando aprovação do parceiro
                        </span>
                      ) : s.status === 'APPROVED' ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100">
                          Compra aprovada
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-red-100">
                          Compra negada
                          {s.partner?.name ? ` por ${s.partner.name}` : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-700">
                      {(() => {
                        const cashbackValue =
                          s.service?.cashbackEuro != null
                            ? s.service.cashbackEuro
                            : 20;
                        if (s.cashbackPaidAt) {
                          return (
                            <span className="text-zinc-800">
                              Pago {cashbackValue.toFixed(2)} € em{' '}
                              {new Date(s.cashbackPaidAt).toLocaleDateString(
                                'pt-PT',
                              )}
                            </span>
                          );
                        }
                        if (s.cashbackRequestedAt) {
                          return (
                            <span className="text-zinc-800">
                              Solicitado {cashbackValue.toFixed(2)} €
                            </span>
                          );
                        }
                        if (s.cashbackEligible) {
                          return (
                            <span className="text-zinc-800">
                              {cashbackValue.toFixed(2)} €
                            </span>
                          );
                        }
                        if (s.status === 'PENDING_PARTNER') {
                          return (
                            <span className="text-zinc-600">
                              {cashbackValue.toFixed(2)} €
                            </span>
                          );
                        }
                        return (
                          <span className="text-zinc-400">Não disponível</span>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-2">
                      {s.status === 'REJECTED' ? (
                        <button
                          type="button"
                          className="cursor-pointer rounded-md bg-amber-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                          onClick={() => setUploadProofModalSaleId(s.id)}
                        >
                          Enviar print do pagamento
                        </button>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {s.cashbackPaymentProofUrl && (
                            <a
                              href={
                                s.cashbackPaymentProofUrl.startsWith('/uploads/')
                                  ? `${API_URL}${s.cashbackPaymentProofUrl}`
                                  : s.cashbackPaymentProofUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="cursor-pointer rounded-md bg-zinc-100 px-2 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-200"
                            >
                              Ver comprovante
                            </a>
                          )}
                          <button
                            type="button"
                            disabled={!s.cashbackEligible}
                            className="cursor-pointer rounded-md bg-emerald-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:hover:bg-zinc-300"
                            onClick={() => {
                              if (user?.tier !== 'MEMBER') {
                                window.dispatchEvent(
                                  new CustomEvent(OPEN_MEMBERSHIP_MODAL_EVENT),
                                );
                                return;
                              }
                              setMbwayModalSaleId(s.id);
                            }}
                          >
                            Solicitar cashback
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal de novo registro de compra */}
      {newSaleModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setNewSaleModalOpen(false)}
          role="presentation"
        >
          <div
            className="relative w-full max-w-lg rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setNewSaleModalOpen(false)}
              className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-zinc-200 text-zinc-700 transition-colors hover:bg-white hover:text-zinc-900"
              aria-label="Fechar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className="pr-8 text-base font-semibold text-zinc-900">
              Registar nova compra
            </h2>
            <p className="mt-1 text-xs text-zinc-600">
              Informe os detalhes da compra realizada com um parceiro da Comunidade RPM.
            </p>

            {loadingLookup ? (
              <p className="mt-4 text-sm text-zinc-600">Carregando dados…</p>
            ) : (
              <form
                onSubmit={handleCreateSale}
                className="mt-4 space-y-4"
              >
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
                          {s.priceOnRequest
                            ? ' — Sob consulta'
                            : s.price
                            ? ` — ${s.price}`
                            : ''}
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
                      Valor da compra
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder={
                        isAmountRequired
                          ? 'Ex: 120.50'
                          : 'Preenchido pelo valor do serviço'
                      }
                      required={isAmountRequired}
                      className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setNewSaleModalOpen(false)}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={
                      creating ||
                      !selectedPartnerId ||
                      !selectedServiceId ||
                      !month ||
                      !year ||
                      (isAmountRequired &&
                        (!amount.trim() ||
                          !Number.isFinite(
                            Number(amount.replace(',', '.')),
                          ) ||
                          Number(amount.replace(',', '.')) <= 0))
                    }
                    className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                  >
                    {creating ? 'A guardar…' : 'Salvar compra'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal MB Way — só para membros */}
      {mbwayModalSaleId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setMbwayModalSaleId(null)}
          role="presentation"
        >
          <div
            className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const sale = sales.find((s) => s.id === mbwayModalSaleId);
              const cashbackValue =
                sale?.service?.cashbackEuro != null ? sale.service.cashbackEuro : 20;
              return (
                <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  <span className="font-semibold">Cashback a receber:</span>{' '}
                  {cashbackValue.toFixed(2)} €
                </div>
              );
            })()}
            <button
              type="button"
              onClick={() => setMbwayModalSaleId(null)}
              className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-zinc-200 text-zinc-700 transition-colors hover:bg-white hover:text-zinc-900"
              aria-label="Fechar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="pr-8 text-lg font-semibold text-zinc-900">
              Solicitar cashback
            </h3>
            <p className="mt-1 text-sm text-zinc-600">
              Indique o número MB Way e o nome do titular para receber o cashback.
            </p>
            <form
              className="mt-4 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!mbwayModalSaleId || !mbwayNumber.trim() || !mbwayName.trim()) return;
                setMbwaySubmitting(true);
                try {
                  await api.sales.userRequestCashback(mbwayModalSaleId, {
                    mbwayNumber: mbwayNumber.trim().replace(/\s/g, ''),
                    mbwayName: mbwayName.trim(),
                  });
                  setStoredMbway(mbwayNumber.trim().replace(/\s/g, ''), mbwayName.trim());
                  setMbwayModalSaleId(null);
                  setError('');
                  await reloadUserSales();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Erro ao solicitar cashback.');
                } finally {
                  setMbwaySubmitting(false);
                }
              }}
            >
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  Número MB Way
                </label>
                <input
                  type="tel"
                  value={mbwayNumber}
                  onChange={(e) => setMbwayNumber(e.target.value)}
                  placeholder="ex: 912 345 678"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  Nome do titular do MB Way
                </label>
                <input
                  type="text"
                  value={mbwayName}
                  onChange={(e) => setMbwayName(e.target.value)}
                  placeholder="Nome como está no MB Way"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMbwayModalSaleId(null)}
                  className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={mbwaySubmitting || !mbwayNumber.trim() || !mbwayName.trim()}
                  className="flex-1 cursor-pointer rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {mbwaySubmitting ? 'A enviar…' : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal upload comprovativo de pagamento */}
      {uploadProofModalSaleId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !uploadingProof && setUploadProofModalSaleId(null)}
          role="presentation"
        >
          <div
            className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => !uploadingProof && setUploadProofModalSaleId(null)}
              className="absolute right-3 top-3 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-zinc-200 text-zinc-700 transition-colors hover:bg-white hover:text-zinc-900"
              aria-label="Fechar"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="pr-8 text-base font-semibold text-zinc-900">
              Enviar print do pagamento
            </h3>
            <p className="mt-1 text-xs text-zinc-600">
              Envie uma imagem do comprovativo de pagamento para que o parceiro
              possa voltar a analisar esta compra.
            </p>
            <form
              className="mt-4 space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!uploadProofModalSaleId) return;
                const input = e.currentTarget.elements.namedItem(
                  'payment-proof',
                ) as HTMLInputElement | null;
                const file = input?.files?.[0];
                if (!file) {
                  setError('Selecione uma imagem do comprovativo.');
                  return;
                }
                setUploadingProof(true);
                setError('');
                try {
                  const formData = new FormData();
                  formData.append('file', file);
                  const token = getAuthToken();
                  const res = await fetch(
                    `${API_URL}/uploads`,
                    {
                      method: 'POST',
                      headers: token
                        ? { Authorization: `Bearer ${token}` }
                        : undefined,
                      body: formData,
                    },
                  );
                  const data = await res.json();
                  if (!res.ok) {
                    throw new Error(
                      data.message ||
                        'Erro ao fazer upload do comprovativo.',
                    );
                  }
                  const url = `${API_URL}${data.url}`;
                  await api.sales.userAddPaymentProof(
                    uploadProofModalSaleId,
                    { paymentProofUrl: url },
                  );
                  setUploadProofModalSaleId(null);
                  await reloadUserSales();
                } catch (err) {
                  setError(
                    err instanceof Error
                      ? err.message
                      : 'Erro ao enviar print do pagamento.',
                  );
                } finally {
                  setUploadingProof(false);
                }
              }}
            >
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  Imagem do comprovativo
                </label>
                <input
                  type="file"
                  name="payment-proof"
                  accept="image/*"
                  className="mt-1 block w-full text-xs text-zinc-900 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
                  disabled={uploadingProof}
                />
                <p className="mt-1 text-[11px] text-zinc-500">
                  Formatos suportados: JPG, PNG, WebP. Tamanho máximo recomendado
                  5MB.
                </p>
              </div>
              <div className="mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => !uploadingProof && setUploadProofModalSaleId(null)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploadingProof}
                  className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {uploadingProof ? 'Enviando…' : 'Salvar print'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

