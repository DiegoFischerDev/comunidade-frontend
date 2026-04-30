'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  OPEN_MEMBERSHIP_MODAL_EVENT,
  USER_PROFILE_UPDATED_EVENT,
} from '@/components/FloatingWhatsAppButton';
import { AffiliatePromoCard } from '@/components/affiliate/AffiliatePromoCard';
import { AffiliateEnrollModal } from '@/components/affiliate/AffiliateEnrollModal';
import { AffiliateMemberDashboardCard } from '@/components/affiliate/AffiliateMemberDashboardCard';
import { CardButton } from '@/components/ui/CardButton';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function resolveAffiliateProofUrl(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl?.trim()) return null;
  const u = pathOrUrl.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  return `${API_BASE}${u.startsWith('/') ? u : `/${u}`}`;
}

function TierPlanoBadge({ tier }: { tier: 'VISITOR' | 'MEMBER' }) {
  if (tier === 'MEMBER') {
    return (
      <span className="inline-flex rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
        Membro
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full border border-zinc-200/90 bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800">
      Visitante
    </span>
  );
}

export default function MyReferralsPage() {
  const { user } = useAuth();
  const isVisitor = user?.tier !== 'MEMBER';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [affiliate, setAffiliate] = useState<Awaited<ReturnType<typeof api.affiliate.me>>>(null);
  const [referrals, setReferrals] = useState<Awaited<ReturnType<typeof api.affiliate.myReferrals>> | null>(null);
  const [commissions, setCommissions] = useState<Awaited<ReturnType<typeof api.affiliate.myCommissions>> | null>(null);
  const [savingPayout, setSavingPayout] = useState(false);
  const [affiliateModalOpen, setAffiliateModalOpen] = useState(false);
  const [affiliateSaving, setAffiliateSaving] = useState(false);
  const [affiliateTerms, setAffiliateTerms] = useState(false);
  const [affiliateInstagram, setAffiliateInstagram] = useState('');
  const [affiliatePayoutMethod, setAffiliatePayoutMethod] = useState<'MBWAY' | 'PIX'>('MBWAY');
  const [affiliateMbwayNumber, setAffiliateMbwayNumber] = useState('');
  const [affiliateMbwayName, setAffiliateMbwayName] = useState('');
  const [affiliatePixKey, setAffiliatePixKey] = useState('');
  const [affiliatePixName, setAffiliatePixName] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<'MBWAY' | 'PIX'>('MBWAY');
  const [mbwayNumber, setMbwayNumber] = useState('');
  const [mbwayName, setMbwayName] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixName, setPixName] = useState('');

  useEffect(() => {
    if (!user) return;
    setAffiliateInstagram(
      user.instagram ? (user.instagram.startsWith('@') ? user.instagram : `@${user.instagram}`) : '',
    );
  }, [user?.id, user?.instagram]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const [a, r, c] = await Promise.all([
          api.affiliate.me(),
          api.affiliate.myReferrals(),
          api.affiliate.myCommissions(),
        ]);
        if (cancelled) return;
        setAffiliate(a);
        setReferrals(r);
        setCommissions(c);
        if (a) {
          setPayoutMethod(a.payoutMethod);
          setMbwayNumber(a.mbwayNumber ?? '');
          setMbwayName(a.mbwayName ?? '');
          setPixKey(a.pixKey ?? '');
          setPixName(a.pixName ?? '');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar indicações.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const refreshFromServer = () => {
      void (async () => {
        try {
          setError('');
          const [a, r, c] = await Promise.all([
            api.affiliate.me(),
            api.affiliate.myReferrals(),
            api.affiliate.myCommissions(),
          ]);
          setAffiliate(a);
          setReferrals(r);
          setCommissions(c);
          if (a) {
            setPayoutMethod(a.payoutMethod);
            setMbwayNumber(a.mbwayNumber ?? '');
            setMbwayName(a.mbwayName ?? '');
            setPixKey(a.pixKey ?? '');
            setPixName(a.pixName ?? '');
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar indicações.');
        }
      })();
    };

    window.addEventListener(USER_PROFILE_UPDATED_EVENT, refreshFromServer);
    return () => window.removeEventListener(USER_PROFILE_UPDATED_EVENT, refreshFromServer);
  }, []);

  const inviteLink = useMemo(() => {
    if (!affiliate?.affiliateCode) return '';
    if (typeof window === 'undefined') return `/?aff=${affiliate.affiliateCode}`;
    return `${window.location.origin}/?aff=${affiliate.affiliateCode}`;
  }, [affiliate?.affiliateCode]);

  const paidCommissionPayments = useMemo(() => {
    const list = commissions?.commissions ?? [];
    return list
      .filter((c) => c.status === 'PAID')
      .sort((a, b) => {
        const ta = a.paidAt ? new Date(a.paidAt).getTime() : new Date(a.createdAt).getTime();
        const tb = b.paidAt ? new Date(b.paidAt).getTime() : new Date(b.createdAt).getTime();
        return tb - ta;
      });
  }, [commissions]);

  if (!user) return null;

  const hasAffiliateEnrollment = Boolean(affiliate?.affiliateCode?.trim());

  function openMembershipModal() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(OPEN_MEMBERSHIP_MODAL_EVENT));
  }

  async function handleAffiliateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setAffiliateSaving(true);
    try {
      await api.affiliate.enroll({
        instagramHandle: affiliateInstagram,
        termsAccepted: affiliateTerms,
        payoutMethod: affiliatePayoutMethod,
        mbwayNumber: affiliatePayoutMethod === 'MBWAY' ? affiliateMbwayNumber : undefined,
        mbwayName: affiliatePayoutMethod === 'MBWAY' ? affiliateMbwayName : undefined,
        pixKey: affiliatePayoutMethod === 'PIX' ? affiliatePixKey : undefined,
        pixName: affiliatePayoutMethod === 'PIX' ? affiliatePixName : undefined,
      });

      const [a, r, c] = await Promise.all([
        api.affiliate.me(),
        api.affiliate.myReferrals(),
        api.affiliate.myCommissions(),
      ]);
      setAffiliate(a);
      setReferrals(r);
      setCommissions(c);
      setAffiliateModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao ativar afiliado.');
    } finally {
      setAffiliateSaving(false);
    }
  }

  const affiliatePromoCard = (
    <AffiliatePromoCard
      onAction={isVisitor ? openMembershipModal : () => setAffiliateModalOpen(true)}
    />
  );

  function formatReferralInstagram(handle: string | null | undefined): string {
    if (!handle?.trim()) return '—';
    const h = handle.trim();
    return h.startsWith('@') ? h : `@${h}`;
  }

  function formatComissaoGerada(
    commission: { amount: number; currency: 'EUR' | 'BRL' } | null | undefined,
  ): string {
    if (!commission) return '—';
    if (commission.currency === 'EUR') {
      return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(commission.amount);
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(commission.amount);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Minhas indicações</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Acompanhe seus convidados e comissões de afiliado.
      </p>

      {isVisitor && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 flex-shrink-0">
                <Image
                  src="/icon_vip.png"
                  alt="Tornar-se membro VIP"
                  fill
                  className="rounded-xl object-contain"
                  sizes="48px"
                />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Torne-se membro VIP</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Desbloqueie benefícios exclusivos e participe do programa de afiliados.
                </p>
              </div>
            </div>
            <div className="mt-4">
              <CardButton type="button" onClick={openMembershipModal} variant="primary">
                Tornar-se membro VIP
              </CardButton>
            </div>
          </section>

          {!loading && !affiliate && affiliatePromoCard}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-zinc-600">Carregando dados…</p>
      ) : !hasAffiliateEnrollment ? (
        // Visitante: o card já está na grelha acima com "Torne-se membro VIP"
        !isVisitor ? (
          <div className="mt-4">{affiliatePromoCard}</div>
        ) : null
      ) : (
        <div className="mt-6 space-y-4">
          <div className="mx-auto flex w-full max-w-[650px] flex-col gap-4">
            <AffiliateMemberDashboardCard
              className="min-w-0 w-full"
              affiliateCode={affiliate!.affiliateCode}
              inviteLink={inviteLink}
              pendingTotal={commissions?.totals.pending ?? affiliate!.totals?.pending ?? 0}
              paidTotal={commissions?.totals.paid ?? affiliate!.totals?.paid ?? 0}
            />

            <section className="min-w-0 w-full rounded-lg border border-zinc-200 bg-white p-4">
              <h2 className="text-base font-semibold text-zinc-900">Dados para recebimento</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as 'MBWAY' | 'PIX')}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 md:col-span-2"
                >
                  <option value="MBWAY">MB Way</option>
                  <option value="PIX">PIX</option>
                </select>
                {payoutMethod === 'MBWAY' ? (
                  <>
                    <input
                      type="text"
                      value={mbwayNumber}
                      onChange={(e) => setMbwayNumber(e.target.value)}
                      placeholder="Número MB Way"
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                    />
                    <input
                      type="text"
                      value={mbwayName}
                      onChange={(e) => setMbwayName(e.target.value)}
                      placeholder="Nome do titular"
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                    />
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={pixKey}
                      onChange={(e) => setPixKey(e.target.value)}
                      placeholder="Chave PIX"
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                    />
                    <input
                      type="text"
                      value={pixName}
                      onChange={(e) => setPixName(e.target.value)}
                      placeholder="Nome do titular"
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                    />
                  </>
                )}
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  disabled={savingPayout}
                  onClick={async () => {
                    try {
                      setSavingPayout(true);
                      setError('');
                      await api.affiliate.updatePayout({
                        payoutMethod,
                        mbwayNumber: payoutMethod === 'MBWAY' ? mbwayNumber : undefined,
                        mbwayName: payoutMethod === 'MBWAY' ? mbwayName : undefined,
                        pixKey: payoutMethod === 'PIX' ? pixKey : undefined,
                        pixName: payoutMethod === 'PIX' ? pixName : undefined,
                      });
                      const updated = await api.affiliate.me();
                      setAffiliate(updated);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Erro ao atualizar dados de pagamento.');
                    } finally {
                      setSavingPayout(false);
                    }
                  }}
                  className="cursor-pointer rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {savingPayout ? 'Salvando…' : 'Salvar dados de pagamento'}
                </button>
              </div>
            </section>

            <section className="min-w-0 w-full rounded-lg border border-zinc-200 bg-white p-4">
              <h2 className="text-base font-semibold text-zinc-900">Pagamentos recebidos</h2>
              <p className="mt-1 text-sm text-zinc-500">
                As comissões são geralmente pagas no final de cada mês.
              </p>
              {!paidCommissionPayments.length ? (
                <p className="mt-3 text-sm text-zinc-500">Ainda não há pagamentos de comissão registados.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {paidCommissionPayments.map((c) => {
                    const proofUrl = resolveAffiliateProofUrl(c.paymentProofUrl ?? null);
                    const paidDate = c.paidAt ?? c.createdAt;
                    return (
                      <li
                        key={c.id}
                        className="flex flex-col gap-3 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Data</p>
                            <p className="font-medium text-zinc-900">
                              {new Date(paidDate).toLocaleDateString('pt-PT', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">Valor</p>
                            <p className="tabular-nums font-semibold text-zinc-900">
                              {formatComissaoGerada({ amount: c.amount, currency: c.currency })}
                            </p>
                          </div>
                        </div>
                        {proofUrl ? (
                          <a
                            href={proofUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:border-zinc-400 hover:bg-zinc-50"
                          >
                            Ver comprovante
                          </a>
                        ) : (
                          <span className="shrink-0 text-xs text-zinc-500">Comprovante indisponível</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>

          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="text-base font-semibold text-zinc-900">Contas indicadas</h2>
            {!referrals?.referrals?.length ? (
              <p className="mt-2 text-sm text-zinc-500">Nenhum usuário indicado ainda.</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50 text-zinc-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="px-3 py-2 text-left">@ do Instagram</th>
                      <th className="px-3 py-2 text-left">Plano atual</th>
                      <th className="px-3 py-2 text-left">Comissões geradas</th>
                      <th className="px-3 py-2 text-left">Criado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.referrals.map((r) => (
                      <tr key={r.id} className="border-t border-zinc-200">
                        <td className="px-3 py-2">{r.name}</td>
                        <td className="px-3 py-2">{formatReferralInstagram(r.instagram)}</td>
                        <td className="px-3 py-2">
                          <TierPlanoBadge tier={r.tier} />
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatComissaoGerada(r.commission)}
                        </td>
                        <td className="px-3 py-2">
                          {new Date(r.createdAt).toLocaleDateString('pt-PT')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      <AffiliateEnrollModal
        open={affiliateModalOpen}
        saving={affiliateSaving}
        error={error}
        instagram={affiliateInstagram}
        payoutMethod={affiliatePayoutMethod}
        mbwayNumber={affiliateMbwayNumber}
        mbwayName={affiliateMbwayName}
        pixKey={affiliatePixKey}
        pixName={affiliatePixName}
        termsAccepted={affiliateTerms}
        onClose={() => setAffiliateModalOpen(false)}
        onSubmit={handleAffiliateSubmit}
        onInstagramChange={setAffiliateInstagram}
        onPayoutMethodChange={setAffiliatePayoutMethod}
        onMbwayNumberChange={setAffiliateMbwayNumber}
        onMbwayNameChange={setAffiliateMbwayName}
        onPixKeyChange={setAffiliatePixKey}
        onPixNameChange={setAffiliatePixName}
        onTermsAcceptedChange={setAffiliateTerms}
      />
    </div>
  );
}

