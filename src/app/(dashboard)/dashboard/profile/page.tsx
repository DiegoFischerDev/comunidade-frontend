"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { api, getAuthToken } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { OPEN_MEMBERSHIP_MODAL_EVENT } from "@/components/FloatingWhatsAppButton";

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
  const [affiliateInstagram, setAffiliateInstagram] = useState(user?.instagram ?? '');
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
        <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="relative mb-4 h-56 w-full overflow-hidden rounded-xl">
            <Image
              src="/afiliados.png"
              alt="Programa de afiliados"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 640px"
            />
          </div>
          <h2 className="text-base font-semibold text-zinc-900">
            Programa de Afiliados
          </h2>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
            <Image
              src="/euro2.png"
              alt="Comissão por indicação"
              width={18}
              height={18}
            />
            <span>€10 por indicação</span>
          </div>
          <p className="mt-2 text-sm text-zinc-600">
            Ajude a nossa comunidade a crescer e seja recompensado por isso.
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Convide pessoas com o seu link exclusivo. Quando alguém se tornar membro ativo da Comunidade RPM, você recebe comissão por indicação.
          </p>
          {affiliate ? (
            <div className="mt-4 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
              <div className="relative h-44 w-full overflow-hidden rounded-lg">
                <Image
                  src="/afiliados.png"
                  alt="Afiliado da Comunidade RPM"
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 640px"
                />
              </div>
              <p className="text-sm text-zinc-700">
                É um prazer ter você no time de afiliados da Comunidade RPM! Agora é só compartilhar, com a sua audiência, como a comunidade te ajudou no processo de imigração e convidar outras pessoas usando o seu link exclusivo.
              </p>
              <p className="text-sm text-zinc-700">
                Crie stories e conteúdos nas redes sociais para que mais imigrantes conheçam a comunidade. Assim, além de ajudar outras pessoas nesse caminho, você também pode receber uma comissão extra no fim do mês. 🙂
              </p>
              <p>
                <span className="font-semibold">Código:</span> {affiliate.affiliateCode}
              </p>
              <p>
                <span className="font-semibold">Link:</span>{' '}
                {`${typeof window !== 'undefined' ? window.location.origin : ''}/?aff=${affiliate.affiliateCode}`}
              </p>
              <p>
                <span className="font-semibold">Comissões pendentes:</span>{' '}
                {affiliate.totals.pending.toFixed(2)}
              </p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAffiliateModalOpen(true)}
              className="mt-4 inline-flex cursor-pointer items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Ver programa de afiliados
            </button>
          )}
        </div>
      )}

      {affiliateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !affiliateSaving && setAffiliateModalOpen(false)}
          role="presentation"
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative mb-4 h-52 w-full overflow-hidden rounded-xl">
              <Image
                src="/afiliados.png"
                alt="Programa de afiliados"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 512px"
              />
            </div>
            <h3 className="text-base font-semibold text-zinc-900">
              Tornar-se afiliado
            </h3>
            <div className="mt-2 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
              <p className="font-medium text-zinc-800">Termos e condições de afiliação</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>
                  A comissão é de <span className="font-semibold">€ 10</span> por cada indicado que concluir o pagamento da anuidade e se tornar membro ativo.
                </li>
                <li>
                  Indicações que não concluírem o pagamento da anuidade não geram comissão.
                </li>
                <li>
                  Cada usuário indicado gera comissão uma única vez.
                </li>
                <li>
                  Os pagamentos das comissões aprovadas são processados ao final de cada mês.
                </li>
                <li>
                  O afiliado é responsável por manter os dados de pagamento atualizados (MB Way ou PIX).
                </li>
              </ul>
            </div>
            <form className="mt-4 space-y-4" onSubmit={handleAffiliateSubmit}>
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  Seu usuário do Instagram
                </label>
                <input
                  type="text"
                  value={affiliateInstagram}
                  onChange={(e) => setAffiliateInstagram(e.target.value)}
                  placeholder="@seuinstagram"
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  Como deseja receber comissões?
                </label>
                <select
                  value={affiliatePayoutMethod}
                  onChange={(e) => setAffiliatePayoutMethod(e.target.value as 'MBWAY' | 'PIX')}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                >
                  <option value="MBWAY">MB Way</option>
                  <option value="PIX">PIX</option>
                </select>
              </div>
              {affiliatePayoutMethod === 'MBWAY' ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    value={affiliateMbwayNumber}
                    onChange={(e) => setAffiliateMbwayNumber(e.target.value)}
                    placeholder="Número MB Way"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                    required
                  />
                  <input
                    type="text"
                    value={affiliateMbwayName}
                    onChange={(e) => setAffiliateMbwayName(e.target.value)}
                    placeholder="Nome do titular"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                    required
                  />
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    type="text"
                    value={affiliatePixKey}
                    onChange={(e) => setAffiliatePixKey(e.target.value)}
                    placeholder="Chave PIX"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                    required
                  />
                  <input
                    type="text"
                    value={affiliatePixName}
                    onChange={(e) => setAffiliatePixName(e.target.value)}
                    placeholder="Nome do titular"
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                    required
                  />
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={affiliateTerms}
                  onChange={(e) => setAffiliateTerms(e.target.checked)}
                  required
                />
                Li e aceito os termos de afiliação
              </label>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => !affiliateSaving && setAffiliateModalOpen(false)}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={affiliateSaving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
                >
                  {affiliateSaving ? 'Confirmando…' : 'Confirmar afiliação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

