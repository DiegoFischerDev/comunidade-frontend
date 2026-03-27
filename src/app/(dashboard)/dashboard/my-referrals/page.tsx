'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { OPEN_MEMBERSHIP_MODAL_EVENT } from '@/components/FloatingWhatsAppButton';
import { AffiliatePromoCard } from '@/components/affiliate/AffiliatePromoCard';
import { AffiliateEnrollModal } from '@/components/affiliate/AffiliateEnrollModal';
import { AffiliateMemberDashboardCard } from '@/components/affiliate/AffiliateMemberDashboardCard';

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
    (async () => {
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
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const inviteLink = useMemo(() => {
    if (!affiliate?.affiliateCode) return '';
    if (typeof window === 'undefined') return `/?aff=${affiliate.affiliateCode}`;
    return `${window.location.origin}/?aff=${affiliate.affiliateCode}`;
  }, [affiliate?.affiliateCode]);

  if (!user) return null;

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
                  src="/vip-card.png"
                  alt="Tornar-se membro"
                  fill
                  className="rounded-xl object-contain"
                  sizes="48px"
                />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Torne-se membro</h2>
                <p className="mt-1 text-xs text-zinc-600">
                  Desbloqueie benefícios exclusivos e participe do programa de afiliados.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={openMembershipModal}
              className="mt-4 inline-flex cursor-pointer items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Tornar-se membro
            </button>
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
      ) : !affiliate ? (
        // Visitante: o card já está na grelha acima com "Torne-se membro"
        !isVisitor ? (
          <div className="mt-4">{affiliatePromoCard}</div>
        ) : null
      ) : (
        <div className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 md:items-start">
            <AffiliateMemberDashboardCard
              className="min-w-0"
              affiliateCode={affiliate.affiliateCode}
              inviteLink={inviteLink}
              pendingTotal={commissions?.totals.pending ?? affiliate.totals?.pending ?? 0}
              paidTotal={commissions?.totals.paid ?? affiliate.totals?.paid ?? 0}
            />

            <section className="min-w-0 rounded-lg border border-zinc-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-zinc-900">Dados para recebimento</h2>
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
          </div>

          <section className="rounded-lg border border-zinc-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-zinc-900">Contas indicadas</h2>
            {!referrals?.referrals?.length ? (
              <p className="mt-2 text-sm text-zinc-500">Nenhum usuário indicado ainda.</p>
            ) : (
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-zinc-50 text-zinc-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Nome</th>
                      <th className="px-3 py-2 text-left">E-mail</th>
                      <th className="px-3 py-2 text-left">Tier</th>
                      <th className="px-3 py-2 text-left">Criado em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrals.referrals.map((r) => (
                      <tr key={r.id} className="border-t border-zinc-200">
                        <td className="px-3 py-2">{r.name}</td>
                        <td className="px-3 py-2">{r.email}</td>
                        <td className="px-3 py-2">{r.tier}</td>
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

