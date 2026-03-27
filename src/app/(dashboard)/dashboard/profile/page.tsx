"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { api, getAuthToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { OPEN_MEMBERSHIP_MODAL_EVENT } from "@/components/FloatingWhatsAppButton";
import { AffiliatePromoCard } from "@/components/affiliate/AffiliatePromoCard";
import { AffiliateEnrollModal } from "@/components/affiliate/AffiliateEnrollModal";
import { AffiliateMemberDashboardCard } from "@/components/affiliate/AffiliateMemberDashboardCard";

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp ?? '');
  const [instagram, setInstagram] = useState(user?.instagram ?? '' );
  const [profileImageUrl, setProfileImageUrl] = useState(user?.profileImageUrl ?? '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [affiliate, setAffiliate] = useState<{
    id: string;
    affiliateCode: string;
    instagramHandle: string;
    payoutMethod: 'MBWAY' | 'PIX';
    mbwayNumber?: string | null;
    mbwayName?: string | null;
    pixKey?: string | null;
    pixName?: string | null;
    totals: { pending: number; paid: number };
  } | null>(null);
  const [affiliateModalOpen, setAffiliateModalOpen] = useState(false);
  const [affiliateSaving, setAffiliateSaving] = useState(false);
  const [affiliateTerms, setAffiliateTerms] = useState(false);
  const [affiliateInstagram, setAffiliateInstagram] = useState(
    user?.instagram
      ? (user.instagram.startsWith('@') ? user.instagram : `@${user.instagram}`)
      : '',
  );
  const [affiliatePayoutMethod, setAffiliatePayoutMethod] = useState<'MBWAY' | 'PIX'>('MBWAY');
  const [affiliateMbwayNumber, setAffiliateMbwayNumber] = useState('');
  const [affiliateMbwayName, setAffiliateMbwayName] = useState('');
  const [affiliatePixKey, setAffiliatePixKey] = useState('');
  const [affiliatePixName, setAffiliatePixName] = useState('');

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const data = await api.affiliate.me();
        setAffiliate(data);
      } catch {
        // silencioso
      }
    })();
  }, [user?.id]);

  if (!user) return null;

  const isMember = user.tier === "MEMBER";
  const tierLabel =
    user.role === "ADMIN"
      ? "Admin"
      : user.role === "PARTNER"
      ? "Parceiro"
      : isMember
      ? "Membro"
      : "Convidado";

  function handleOpenMembershipModal() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(OPEN_MEMBERSHIP_MODAL_EVENT));
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = getAuthToken();
      const res = await fetch(`${API_URL}/uploads`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Erro ao fazer upload da imagem de perfil.');
      }
      const url = `${API_URL}${data.url}`;
      setProfileImageUrl(url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao fazer upload da imagem de perfil. Tente novamente.',
      );
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.auth.updateMe({
        name,
        email,
        whatsapp,
        instagram: instagram || undefined,
        profileImageUrl: profileImageUrl || undefined,
      });
      await refreshUser();
      setSuccess('Perfil atualizado com sucesso.');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erro ao atualizar perfil. Tente novamente.',
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAffiliateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
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
      const data = await api.affiliate.me();
      setAffiliate(data);
      setAffiliateModalOpen(false);
      setSuccess('Perfil de afiliado criado com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao ativar afiliado.');
    } finally {
      setAffiliateSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Meu perfil</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Ajuste as informações pessoais da sua conta na Comunidade RPM.
        </p>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4"
      >
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileImageUrl}
                alt="Imagem de perfil"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-lg font-semibold text-zinc-500">
                {user.name?.charAt(0).toUpperCase() ?? '?'}
              </span>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-700">
              Imagem de perfil
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="mt-1 block w-full text-xs text-zinc-900 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-zinc-700 hover:file:bg-zinc-200"
            />
            <p className="mt-1 text-[11px] text-zinc-500">
              {uploadingAvatar
                ? 'Enviando imagem…'
                : 'Formatos recomendados: quadrado ou circular.'}
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-700">
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-700">
              WhatsApp
            </label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Ex.: 351912345678"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-zinc-700">
              Instagram
            </label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') setInstagram('');
                else if (v.startsWith('@')) setInstagram(v);
                else setInstagram('@' + v);
              }}
              placeholder="@utilizador"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-xs text-zinc-500">
              Apenas utilizador com @ (ex: @minha_conta)
            </p>
          </div>
        </div>

        <div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex cursor-pointer items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </form>

      <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative h-20 w-20 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100">
            {profileImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profileImageUrl}
                alt="Imagem de perfil"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-base font-semibold text-zinc-500">
                {user.name?.charAt(0).toUpperCase() ?? "?"}
              </span>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-zinc-900">
              {user.name || "Visitante"}
            </p>
            <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
              Plano atual:{" "}
              <span className="font-semibold text-zinc-800">{tierLabel}</span>
            </p>
            {isMember && user.membershipExpiresAt && (
              <p className="mt-0.5 text-xs text-zinc-500">
                Válido até{" "}
                <span className="font-medium text-zinc-800">
                  {new Date(user.membershipExpiresAt).toLocaleDateString("pt-PT")}
                </span>
              </p>
            )}
          </div>
        </div>

        {!isMember && (
          <div className="mt-3 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 flex-shrink-0">
                <Image
                  src="/vip-card.png"
                  alt="Cartão VIP Comunidade RPM"
                  fill
                  className="rounded-xl object-contain"
                  sizes="48px"
                />
              </div>
              <div className="max-w-xs text-left text-xs text-zinc-700">
                <p className="font-semibold text-zinc-900">
                  Torne-se membro da Comunidade RPM
                </p>
                <p className="text-[11px] text-zinc-600">
                  Desbloqueie o guia completo Portugal Sem Perrengue, grupos exclusivos,
                  chat direto com a Rafa e cashback em serviços de parceiros.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenMembershipModal}
              className="inline-flex cursor-pointer items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              Tornar-se membro
            </button>
          </div>
        )}
      </div>

      {(user.tier === 'MEMBER' || user.role === 'PARTNER' || user.role === 'ADMIN') && (
        <div className="w-full max-w-2xl">
          {affiliate ? (
            <AffiliateMemberDashboardCard
              affiliateCode={affiliate.affiliateCode}
              inviteLink={
                affiliate.affiliateCode
                  ? `${typeof window !== 'undefined' ? window.location.origin : ''}/?aff=${affiliate.affiliateCode}`
                  : ''
              }
              pendingTotal={affiliate.totals?.pending ?? 0}
              paidTotal={affiliate.totals?.paid ?? 0}
            />
          ) : (
            <AffiliatePromoCard onAction={() => setAffiliateModalOpen(true)} className="w-full" />
          )}
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

