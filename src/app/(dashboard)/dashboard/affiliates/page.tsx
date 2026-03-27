'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type AffiliateRow = Awaited<ReturnType<typeof api.affiliate.adminList>>[number];
type PaidCommissionRow = Awaited<ReturnType<typeof api.affiliate.adminPaidCommissions>>[number];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function resolveProofUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl?.trim()) return null;
  const u = pathOrUrl.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  return `${API_BASE}${u.startsWith('/') ? u : `/${u}`}`;
}

function formatCommissionValue(amount: number, currency: 'EUR' | 'BRL'): string {
  if (currency === 'EUR') {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AdminAffiliatesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<AffiliateRow[]>([]);
  const [payModalAffiliate, setPayModalAffiliate] = useState<AffiliateRow | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const [historyAffiliate, setHistoryAffiliate] = useState<AffiliateRow | null>(null);
  const [historyRows, setHistoryRows] = useState<PaidCommissionRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  async function load() {
    const list = await api.affiliate.adminList();
    setRows(list);
  }

  async function openPaymentsHistory(a: AffiliateRow) {
    setPayModalAffiliate(null);
    setHistoryAffiliate(a);
    setHistoryRows([]);
    setHistoryError('');
    setHistoryLoading(true);
    try {
      const data = await api.affiliate.adminPaidCommissions(a.id);
      setHistoryRows(data);
    } catch (err) {
      setHistoryError(
        err instanceof Error ? err.message : 'Erro ao carregar histórico de pagamentos.',
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  function openPayModal(a: AffiliateRow) {
    setHistoryAffiliate(null);
    setPayModalAffiliate(a);
    setProofFile(null);
  }

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    (async () => {
      try {
        setError('');
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar afiliados.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.role]);

  if (user?.role !== 'ADMIN') return null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Afiliados</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Gestão de afiliados, indicações e pagamentos de comissão.
      </p>
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">Carregando afiliados…</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-3 py-2 text-left">Afiliado</th>
                <th className="px-3 py-2 text-left">Instagram</th>
                <th className="px-3 py-2 text-left">Código</th>
                <th className="px-3 py-2 text-left">Método</th>
                <th className="px-3 py-2 text-left">Indicados</th>
                <th className="px-3 py-2 text-left">Pendente</th>
                <th className="px-3 py-2 text-left">Pago</th>
                <th className="px-3 py-2 text-left">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-t border-zinc-200">
                  <td className="px-3 py-2">{a.user.name}</td>
                  <td className="px-3 py-2">{a.instagramHandle}</td>
                  <td className="px-3 py-2">{a.affiliateCode}</td>
                  <td className="px-3 py-2">{a.payoutMethod}</td>
                  <td className="px-3 py-2">
                    VISITOR {a.referralsByTier.visitor} / MEMBER {a.referralsByTier.member}
                  </td>
                  <td className="px-3 py-2">{(a.totals?.pending ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-2">{(a.totals?.paid ?? 0).toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() => openPayModal(a)}
                        className="cursor-pointer rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Pagar comissão
                      </button>
                      <button
                        type="button"
                        onClick={() => void openPaymentsHistory(a)}
                        className="cursor-pointer rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        Ver pagamentos
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {payModalAffiliate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !payingId && setPayModalAffiliate(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-zinc-900">Pagar comissão</h3>
            <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700">
              <p><span className="font-semibold">Afiliado:</span> {payModalAffiliate.user.name}</p>
              <p className="mt-1"><span className="font-semibold">Método:</span> {payModalAffiliate.payoutMethod}</p>
              <p className="mt-1">
                <span className="font-semibold">Dados:</span>{' '}
                {payModalAffiliate.payoutMethod === 'PIX'
                  ? `${payModalAffiliate.pixName ?? '—'} / ${payModalAffiliate.pixKey ?? '—'}`
                  : `${payModalAffiliate.mbwayName ?? '—'} / ${payModalAffiliate.mbwayNumber ?? '—'}`}
              </p>
              <p className="mt-1"><span className="font-semibold">Total pendente:</span> {(payModalAffiliate.totals?.pending ?? 0).toFixed(2)}</p>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-zinc-700">
                Comprovante de pagamento
              </label>
              <input
                type="file"
                accept="image/*,application/pdf,.pdf"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-xs text-zinc-900 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5"
              />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !payingId && setPayModalAffiliate(null)}
                className="cursor-pointer rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!proofFile || payingId === payModalAffiliate.id}
                onClick={async () => {
                  if (!proofFile) return;
                  setPayingId(payModalAffiliate.id);
                  try {
                    await api.affiliate.adminPay(payModalAffiliate.id, proofFile);
                    setPayModalAffiliate(null);
                    setProofFile(null);
                    await load();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Erro ao pagar comissão.');
                  } finally {
                    setPayingId(null);
                  }
                }}
                className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {payingId === payModalAffiliate.id ? 'Enviando…' : 'Confirmar pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {historyAffiliate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setHistoryAffiliate(null)}
          role="presentation"
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-zinc-100 p-5 pb-4">
              <h3 className="text-base font-semibold text-zinc-900">Histórico de pagamentos</h3>
              <p className="mt-1 text-sm text-zinc-600">
                {historyAffiliate.user.name} · {historyAffiliate.affiliateCode}
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5 pt-4">
              {historyLoading ? (
                <p className="text-sm text-zinc-600">Carregando…</p>
              ) : historyError ? (
                <p className="text-sm text-red-600">{historyError}</p>
              ) : historyRows.length === 0 ? (
                <p className="text-sm text-zinc-500">Nenhum pagamento de comissão registado.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-zinc-200">
                  <table className="min-w-full text-xs sm:text-sm">
                    <thead className="bg-zinc-50 text-zinc-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Data</th>
                        <th className="px-3 py-2 text-left">Valor</th>
                        <th className="px-3 py-2 text-left">Indicação</th>
                        <th className="px-3 py-2 text-left">Comprovante</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.map((row) => {
                        const paymentDate = row.paidAt ?? row.createdAt;
                        const proofHref = resolveProofUrl(row.paymentProofUrl);
                        return (
                          <tr key={row.id} className="border-t border-zinc-200 bg-white">
                            <td className="px-3 py-2 text-zinc-800">
                              {new Date(paymentDate).toLocaleString('pt-PT', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-3 py-2 tabular-nums font-medium text-zinc-900">
                              {formatCommissionValue(row.amount, row.currency)}
                            </td>
                            <td className="px-3 py-2 text-zinc-700">
                              <span className="font-medium text-zinc-900">{row.referredUser.name}</span>
                              <span className="mt-0.5 block text-[11px] text-zinc-500">{row.referredUser.email}</span>
                            </td>
                            <td className="px-3 py-2">
                              {proofHref ? (
                                <a
                                  href={proofHref}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex cursor-pointer rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50"
                                >
                                  Ver comprovante
                                </a>
                              ) : (
                                <span className="text-zinc-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="border-t border-zinc-100 p-4">
              <button
                type="button"
                onClick={() => setHistoryAffiliate(null)}
                className="cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
