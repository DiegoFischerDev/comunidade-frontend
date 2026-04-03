/* eslint-disable react/no-array-index-key */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { OPEN_MEMBERSHIP_MODAL_EVENT } from "@/components/FloatingWhatsAppButton";
import { AffiliatePromoCard } from "@/components/affiliate/AffiliatePromoCard";
import { AffiliateEnrollModal } from "@/components/affiliate/AffiliateEnrollModal";
import { AffiliateMemberDashboardCard } from "@/components/affiliate/AffiliateMemberDashboardCard";

type AffiliateMe = NonNullable<Awaited<ReturnType<typeof api.affiliate.me>>>;

export default function DashboardPage() {
  const { user } = useAuth();
  const isMember = user?.tier === "MEMBER";
  const canSeeAffiliateCard =
    user?.tier === "MEMBER" || user?.role === "PARTNER" || user?.role === "ADMIN";

  const tierLabel =
    user?.role === "ADMIN"
      ? "Admin"
      : user?.role === "PARTNER"
        ? "Parceiro"
        : isMember
          ? "Membro"
          : "Visitante";

  const [affiliateModalOpen, setAffiliateModalOpen] = useState(false);
  const [affiliateSaving, setAffiliateSaving] = useState(false);
  const [affiliateError, setAffiliateError] = useState("");
  const [affiliateTerms, setAffiliateTerms] = useState(false);
  const [affiliateInstagram, setAffiliateInstagram] = useState(
    user?.instagram
      ? user.instagram.startsWith("@")
        ? user.instagram
        : `@${user.instagram}`
      : "",
  );
  const [affiliatePayoutMethod, setAffiliatePayoutMethod] = useState<"MBWAY" | "PIX">("MBWAY");
  const [affiliateMbwayNumber, setAffiliateMbwayNumber] = useState("");
  const [affiliateMbwayName, setAffiliateMbwayName] = useState("");
  const [affiliatePixKey, setAffiliatePixKey] = useState("");
  const [affiliatePixName, setAffiliatePixName] = useState("");
  /** undefined = a carregar; null = sem perfil de afiliado */
  const [affiliate, setAffiliate] = useState<AffiliateMe | null | undefined>(undefined);

  const pdfHref = isMember ? "/psp/full" : "/psp";

  useEffect(() => {
    setAffiliateInstagram(
      user?.instagram
        ? user.instagram.startsWith("@")
          ? user.instagram
          : `@${user.instagram}`
        : "",
    );
  }, [user?.instagram]);

  useEffect(() => {
    if (!user?.id || !canSeeAffiliateCard) {
      setAffiliate(undefined);
      return;
    }
    let cancelled = false;
    setAffiliate(undefined);
    (async () => {
      try {
        const data = await api.affiliate.me();
        if (!cancelled) setAffiliate(data ?? null);
      } catch {
        if (!cancelled) setAffiliate(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, canSeeAffiliateCard]);

  function handleOpenMembershipModal() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new Event(OPEN_MEMBERSHIP_MODAL_EVENT));
  }

  async function handleAffiliateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAffiliateError("");
    setAffiliateSaving(true);
    try {
      await api.affiliate.enroll({
        instagramHandle: affiliateInstagram,
        termsAccepted: affiliateTerms,
        payoutMethod: affiliatePayoutMethod,
        mbwayNumber: affiliatePayoutMethod === "MBWAY" ? affiliateMbwayNumber : undefined,
        mbwayName: affiliatePayoutMethod === "MBWAY" ? affiliateMbwayName : undefined,
        pixKey: affiliatePayoutMethod === "PIX" ? affiliatePixKey : undefined,
        pixName: affiliatePayoutMethod === "PIX" ? affiliatePixName : undefined,
      });
      const data = await api.affiliate.me();
      setAffiliate(data ?? null);
      setAffiliateModalOpen(false);
    } catch (err) {
      setAffiliateError(
        err instanceof Error ? err.message : "Erro ao ativar programa de afiliados.",
      );
    } finally {
      setAffiliateSaving(false);
    }
  }

  if (!user) {
    return null;
  }

  const hasAffiliateEnrollment = Boolean(affiliate?.affiliateCode?.trim());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-2 text-zinc-600">
          Bem-vindo à Comunidade RPM. Em breve: Ebook, curso em vídeo e
          produtos.
        </p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative h-20 w-20 flex-shrink-0">
            <Image
              src="/vip-card.png"
              alt="Cartão VIP Comunidade RPM"
              fill
              className="object-contain"
              sizes="80px"
            />
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
            <div className="max-w-xs text-center text-xs text-zinc-700">
              <p className="font-semibold text-zinc-900">
                Torne-se membro da Comunidade RPM
              </p>
              <p className="mt-1 text-[11px] text-zinc-600">
                Desbloqueie o guia completo Portugal Sem Perrengue, grupos exclusivos,
                chat direto com a Rafa e benefícios em serviços de parceiros.
              </p>
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

      <section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:w-1/2">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="relative aspect-[2/1] w-full overflow-hidden rounded-xl bg-zinc-100 md:w-80">
            <Image
              src="/capa_psp-1000x500.png"
              alt="Capa do guia PSP - Portugal Sem Perrengue"
              fill
              className="object-contain"
              sizes="(min-width: 768px) 320px, 100vw"
              priority
            />
          </div>

          <div className="flex-1 space-y-3">
            <h2 className="text-xl font-semibold text-zinc-900">
              PSP - Portugal Sem Perrengue
            </h2>
            <p className="text-sm text-zinc-600">
              O guia real pra sair do Brasil e morar legalmente em Portugal.
              Aqui você encontra o passo a passo, documentos, prazos e
              estratégias para fazer essa mudança com segurança.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={pdfHref}
                className="inline-flex items-center rounded-lg bg-[#edbfbf] px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-[#e3afaf]"
              >
                Acessar PDF
              </Link>
            </div>
          </div>
        </div>
      </section>

      {canSeeAffiliateCard && affiliate !== undefined && (
        <div className="w-full max-w-2xl">
          {hasAffiliateEnrollment && affiliate ? (
            <AffiliateMemberDashboardCard
              affiliateCode={affiliate.affiliateCode}
              inviteLink={`${typeof window !== "undefined" ? window.location.origin : ""}/?aff=${affiliate.affiliateCode}`}
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
        error={affiliateError}
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
