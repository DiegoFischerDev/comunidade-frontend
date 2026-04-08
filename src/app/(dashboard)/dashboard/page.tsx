/* eslint-disable react/no-array-index-key */
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { OPEN_MEMBERSHIP_MODAL_EVENT } from "@/components/FloatingWhatsAppButton";
import { OPEN_AUTH_LOGIN_EVENT } from "@/lib/auth-ui-events";
import { AffiliatePromoCard } from "@/components/affiliate/AffiliatePromoCard";
import { AffiliateEnrollModal } from "@/components/affiliate/AffiliateEnrollModal";
import { AffiliateMemberDashboardCard } from "@/components/affiliate/AffiliateMemberDashboardCard";
import { RafaCallCard } from "@/components/RafaCallCard";
import { CardButton, CardLinkButton } from "@/components/ui/CardButton";

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
          ? "Membro VIP"
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

  const [complaintOpen, setComplaintOpen] = useState(false);
  const [complaintMsg, setComplaintMsg] = useState("");
  const [complaintSending, setComplaintSending] = useState(false);
  const [complaintSent, setComplaintSent] = useState(false);
  const [complaintError, setComplaintError] = useState("");

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
    if (!user) {
      window.dispatchEvent(new Event(OPEN_AUTH_LOGIN_EVENT));
      return;
    }
    window.dispatchEvent(new Event(OPEN_MEMBERSHIP_MODAL_EVENT));
  }

  function handleOpenComplaint() {
    if (typeof window === "undefined") return;
    if (!user) {
      window.dispatchEvent(new Event(OPEN_AUTH_LOGIN_EVENT));
      return;
    }
    if (user.tier !== "MEMBER") {
      window.dispatchEvent(new Event(OPEN_MEMBERSHIP_MODAL_EVENT));
      return;
    }
    setComplaintError("");
    setComplaintSent(false);
    setComplaintMsg("");
    setComplaintOpen(true);
  }

  async function handleSendComplaint() {
    if (!complaintMsg.trim()) {
      setComplaintError("Escreve a tua mensagem antes de enviar.");
      return;
    }
    setComplaintSending(true);
    setComplaintError("");
    try {
      await api.support.createTicket(complaintMsg);
      setComplaintSent(true);
    } catch (err) {
      setComplaintError(err instanceof Error ? err.message : "Não foi possível enviar.");
    } finally {
      setComplaintSending(false);
    }
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

  const hasAffiliateEnrollment = Boolean(affiliate?.affiliateCode?.trim());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Comunidade Rafa pelo mundo
        </h1>
        <p className="mt-2 text-zinc-600">
          Aqui encontras tudo o que precisa para imigrar do brasil para portugal
          do jeito certo.
        </p>
      </div>

      <div className="mx-auto w-full max-w-[800px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <div className="flex w-full flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
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
                  {user?.name || "Visitante"}
                </p>
                <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
                  Plano atual:{" "}
                  <span className="font-semibold text-zinc-800">{tierLabel}</span>
                </p>
                {isMember && user?.membershipExpiresAt && (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Válido até{" "}
                    <span className="font-medium text-zinc-800">
                      {new Date(user.membershipExpiresAt).toLocaleDateString("pt-PT")}
                    </span>
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600">
                Vantagens VIP
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-zinc-700">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    ✓
                  </span>
                  <span>
                    <span className="font-medium text-zinc-900">E-book PSP completo</span> com atualizações
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    ✓
                  </span>
                  <span>
                    <span className="font-medium text-zinc-900">Acesso às lives da Rafa</span> exclusivas para VIPs
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    ✓
                  </span>
                  <span>
                    <span className="font-medium text-zinc-900">Acesso a todos os grupos</span> no WhatsApp
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    ✓
                  </span>
                  <span>
                    <span className="font-medium text-zinc-900">10€ de desconto</span> em cada serviço contratado com parceiros
                  </span>
                </li>
              </ul>
            </div>

            {!isMember && (
              <div className="mt-3 flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
                <div className="max-w-xl text-sm text-zinc-700">
                  <p className="font-semibold text-zinc-900">
                    Torne-se membro da Comunidade RPM
                  </p>
                </div>
                <CardButton
                  type="button"
                  onClick={handleOpenMembershipModal}
                  variant="primary"
                >
                  Quero ser membro VIP
                </CardButton>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-6">
          <RafaCallCard />
        </div>

        <section className="lg:col-span-12 w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
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
                E-book PSP - Portugal Sem Perrengue
              </h2>
              <p className="text-sm text-zinc-600">
                O guia real pra sair do Brasil e morar legalmente em Portugal.
                Aqui você encontra o passo a passo, documentos, prazos e
                estratégias para fazer essa mudança com segurança.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <CardLinkButton href={pdfHref} variant="primary">
                  Acessar PDF
                </CardLinkButton>
              </div>
            </div>
          </div>
        </section>

        {canSeeAffiliateCard && affiliate !== undefined && (
          <div className="lg:col-span-12 w-full">
            {hasAffiliateEnrollment && affiliate ? (
              <AffiliateMemberDashboardCard
                affiliateCode={affiliate.affiliateCode}
                inviteLink={`${typeof window !== "undefined" ? window.location.origin : ""}/?aff=${affiliate.affiliateCode}`}
                pendingTotal={affiliate.totals?.pending ?? 0}
                paidTotal={affiliate.totals?.paid ?? 0}
              />
            ) : (
              <AffiliatePromoCard
                onAction={() => setAffiliateModalOpen(true)}
                className="w-full"
              />
            )}
          </div>
        )}

        <section className="lg:col-span-12 w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-50">
                <Image
                  src="/reclame.png"
                  alt=""
                  fill
                  className="object-contain"
                  sizes="56px"
                />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-zinc-900">Reclame aqui</h2>
                <p className="text-sm text-zinc-600">
                  Tem algum elogio ou reclamação de algum parceiro da comunidade ou bug do sistema?
                  Compartilhe com nosso time de suporte.
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <CardButton type="button" onClick={handleOpenComplaint} variant="primary">
                Reclame aqui
              </CardButton>
            </div>
          </div>
        </section>
      </div>
      </div>

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

      {complaintOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => !complaintSending && setComplaintOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-zinc-900">Reclame aqui</h3>
                <p className="mt-1 text-sm text-zinc-600">
                  Escreve a tua mensagem. Se for sobre um parceiro, diz qual parceiro.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setComplaintOpen(false)}
                disabled={complaintSending}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-zinc-200 text-xs text-zinc-500 hover:bg-zinc-50 disabled:opacity-50"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {complaintError ? (
              <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {complaintError}
              </div>
            ) : null}

            {complaintSent ? (
              <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                Mensagem enviada. Obrigado por compartilhar com a gente!
              </div>
            ) : null}

            <div className="mt-4">
              <label className="block text-sm font-medium text-zinc-700">Mensagem</label>
              <textarea
                value={complaintMsg}
                onChange={(e) => setComplaintMsg(e.target.value)}
                rows={7}
                disabled={complaintSending || complaintSent}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                placeholder="Escreve aqui…"
              />
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <CardButton
                type="button"
                variant="secondary"
                onClick={() => setComplaintOpen(false)}
                disabled={complaintSending}
              >
                Fechar
              </CardButton>
              <CardButton
                type="button"
                variant="primary"
                onClick={handleSendComplaint}
                loading={complaintSending}
                disabled={complaintSent}
              >
                Enviar
              </CardButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
