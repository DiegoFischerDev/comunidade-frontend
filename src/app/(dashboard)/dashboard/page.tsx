/* eslint-disable react/no-array-index-key */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { AffiliatePromoCard } from "@/components/affiliate/AffiliatePromoCard";
import { AffiliateEnrollModal } from "@/components/affiliate/AffiliateEnrollModal";

export default function DashboardPage() {
  const { user } = useAuth();
  const isMember = user?.tier === "MEMBER";
  const canSeeAffiliateCard =
    user?.tier === "MEMBER" || user?.role === "PARTNER" || user?.role === "ADMIN";
  const [affiliateModalOpen, setAffiliateModalOpen] = useState(false);
  const [affiliateSaving, setAffiliateSaving] = useState(false);
  const [affiliateError, setAffiliateError] = useState("");
  const [affiliateTerms, setAffiliateTerms] = useState(false);
  const [affiliateInstagram, setAffiliateInstagram] = useState(
    user?.instagram
      ? (user.instagram.startsWith("@") ? user.instagram : `@${user.instagram}`)
      : "",
  );
  const [affiliatePayoutMethod, setAffiliatePayoutMethod] = useState<"MBWAY" | "PIX">("MBWAY");
  const [affiliateMbwayNumber, setAffiliateMbwayNumber] = useState("");
  const [affiliateMbwayName, setAffiliateMbwayName] = useState("");
  const [affiliatePixKey, setAffiliatePixKey] = useState("");
  const [affiliatePixName, setAffiliatePixName] = useState("");
  const [affiliateProfileExists, setAffiliateProfileExists] = useState<boolean | null>(null);

  const pdfHref = isMember ? "/psp/full" : "/psp";

  useEffect(() => {
    setAffiliateInstagram(
      user?.instagram
        ? (user.instagram.startsWith("@") ? user.instagram : `@${user.instagram}`)
        : "",
    );
  }, [user?.instagram]);

  useEffect(() => {
    if (!user?.id || !canSeeAffiliateCard) {
      setAffiliateProfileExists(null);
      return;
    }
    let cancelled = false;
    setAffiliateProfileExists(null);
    (async () => {
      try {
        const a = await api.affiliate.me();
        if (!cancelled) setAffiliateProfileExists(!!a);
      } catch {
        if (!cancelled) setAffiliateProfileExists(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, canSeeAffiliateCard]);

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
      setAffiliateProfileExists(true);
      setAffiliateModalOpen(false);
    } catch (err) {
      setAffiliateError(
        err instanceof Error ? err.message : "Erro ao ativar programa de afiliados.",
      );
    } finally {
      setAffiliateSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Dashboard</h1>
        <p className="mt-2 text-zinc-600">
          Bem-vindo à Comunidade RPM. Em breve: Ebook, curso em vídeo e
          produtos.
        </p>
      </div>

      <section className="w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:w-1/2">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          {/* Wrapper com proporção fixa para não cortar a imagem */}
          <div className="relative w-full overflow-hidden rounded-xl bg-zinc-100 md:w-80 aspect-[2/1]">
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

      {canSeeAffiliateCard && affiliateProfileExists === false && (
        <AffiliatePromoCard onAction={() => setAffiliateModalOpen(true)} />
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
