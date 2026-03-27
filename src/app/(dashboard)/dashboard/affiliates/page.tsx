'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type AffiliateRow = Awaited<ReturnType<typeof api.affiliate.adminList>>[number];

export default function AdminAffiliatesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<AffiliateRow[]>([]);
  const [modalAffiliate, setModalAffiliate] = useState<AffiliateRow | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  async function load() {
    const list = await api.affiliate.adminList();
    setRows(list);
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
                  <td className="px-3 py-2">{a.totals.pending.toFixed(2)}</td>
                  <td className="px-3 py-2">{a.totals.paid.toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => {
                        setModalAffiliate(a);
                        setProofFile(null);
                      }}
                      className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      Pagar comissão
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAffiliate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !payingId && setModalAffiliate(null)}
          role="presentation"
        >
          <div
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-zinc-900">Pagar comissão</h3>
            <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700">
              <p><span className="font-semibold">Afiliado:</span> {modalAffiliate.user.name}</p>
              <p className="mt-1"><span className="font-semibold">Método:</span> {modalAffiliate.payoutMethod}</p>
              <p className="mt-1">
                <span className="font-semibold">Dados:</span>{' '}
                {modalAffiliate.payoutMethod === 'PIX'
                  ? `${modalAffiliate.pixName ?? '—'} / ${modalAffiliate.pixKey ?? '—'}`
                  : `${modalAffiliate.mbwayName ?? '—'} / ${modalAffiliate.mbwayNumber ?? '—'}`}
              </p>
              <p className="mt-1"><span className="font-semibold">Total pendente:</span> {modalAffiliate.totals.pending.toFixed(2)}</p>
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
                onClick={() => !payingId && setModalAffiliate(null)}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!proofFile || payingId === modalAffiliate.id}
                onClick={async () => {
                  if (!proofFile) return;
                  setPayingId(modalAffiliate.id);
                  try {
                    await api.affiliate.adminPay(modalAffiliate.id, proofFile);
                    setModalAffiliate(null);
                    setProofFile(null);
                    await load();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Erro ao pagar comissão.');
                  } finally {
                    setPayingId(null);
                  }
                }}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {payingId === modalAffiliate.id ? 'Enviando…' : 'Confirmar pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

