"use client";

import Image from "next/image";
import Link from "next/link";
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
      <section className="w-full">
        <h1 className="sr-only">Comunidade RPM — Início</h1>
        <div className="w-full">
          <Image
            src="/hero_mobile2.png"
            width={1172}
            height={2084}
            alt="Comunidade RPM"
            className="h-auto w-full rounded-2xl md:hidden"
            sizes="100vw"
            priority
          />
          <Image
            src="/hero2.png"
            width={5000}
            height={2188}
            alt="Comunidade RPM"
            className="hidden h-auto w-full rounded-2xl md:block"
            sizes="100vw"
            priority
          />
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-1 sm:px-2">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-[repeat(auto-fit,minmax(20rem,1fr))]">
        <section className="h-full min-w-0 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/80 shadow-sm transition-shadow hover:shadow-md">
          <Link
            href="/plano-de-imigracao"
            className="group block min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
            aria-label="Plano de imigração — aceder"
          >
            <Image
              src="/card_plano3.png"
              alt="Plano de imigração — partiu Portugal, etapas e custos"
              width={800}
              height={1280}
              className="h-auto w-full object-contain"
              sizes="(max-width: 639px) 100vw, (max-width: 1279px) 50vw, 25vw"
              priority
            />
          </Link>
        </section>
        <section className="flex h-full min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex h-full min-h-0 flex-1 flex-col gap-6">
            <div className="relative aspect-[2/1] w-full shrink-0 overflow-hidden rounded-xl bg-zinc-100">
              <Image
                src="/capa_psp-1000x500.png"
                alt="Capa do guia PSP - Portugal Sem Perrengue"
                fill
                className="object-contain"
                sizes="(min-width: 640px) 50vw, 100vw"
                priority
              />
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <h2 className="text-xl font-semibold text-zinc-900">
                E-book - Portugal Sem Perrengue
              </h2>
              <p className="text-sm text-zinc-600">
                O guia real pra sair do Brasil e morar legalmente em Portugal. Aqui você encontra o
                passo a passo, documentos, prazos e estratégias para fazer essa mudança com
                segurança.
              </p>

              <div className="w-full">
                <CardLinkButton href={pdfHref} variant="primary" fullWidth>
                  Acessar PDF
                </CardLinkButton>
              </div>
            </div>
          </div>
        </section>

        <section className="flex h-full min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-50">
                <Image src="/services2.png" alt="" fill className="object-contain" sizes="56px" />
              </div>
              <div className="min-w-0 space-y-1">
                <h2 className="text-xl font-semibold text-zinc-900">Serviços</h2>
                <p className="text-sm text-zinc-600">
                  Encontre parceiros de confiança indicados pela Rafa.
                </p>
              </div>
            </div>
            <div className="w-full">
              <CardLinkButton href="/dashboard/services" variant="primary" fullWidth>
                Acessar serviços
              </CardLinkButton>
            </div>
          </div>
        </section>

        <section className="flex h-full min-w-0 flex-col rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-50">
                <Image
                  src="/whatsapp.png"
                  alt=""
                  fill
                  className="object-contain"
                  sizes="56px"
                />
              </div>
              <div className="min-w-0 space-y-1">
                <h2 className="text-xl font-semibold text-zinc-900">Grupos whatsapp</h2>
                <p className="text-sm text-zinc-600">
                  Entra nos grupos do WhatsApp da comunidade de acordo com o teu momento.
                </p>
              </div>
            </div>
            <div className="w-full">
              <CardLinkButton href="/grupos-vip" variant="primary" fullWidth>
                Acessar grupos
              </CardLinkButton>
            </div>
          </div>
        </section>

        <div className="flex h-full min-w-0 flex-col">
          <div className="flex h-full min-h-0 w-full flex-1 flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
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

            {!isMember && (
              <div className="max-w-xl text-sm text-zinc-700">
                  <p className="font-semibold text-zinc-900">
                    Torne-se membro da Comunidade Rafa Pelo Mundo
                  </p>
              </div>
            )}

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
                    <span className="font-medium text-zinc-900">Acesso completo ao plano de imigração</span>
                  </span>
                </li>
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
              <div className="mt-1 flex w-full flex-col items-stretch gap-3">
                <CardButton
                  type="button"
                  onClick={handleOpenMembershipModal}
                  variant="primary"
                  fullWidth
                >
                  Quero ser membro VIP
                </CardButton>
              </div>
            )}
          </div>
        </div>

        <div className="flex h-full min-w-0 flex-col">
          <RafaCallCard />
        </div>

        {canSeeAffiliateCard && affiliate !== undefined && (
          <div className="col-span-full w-full min-w-0">
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

        <section className="col-span-full w-full min-w-0 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-50 sm:h-16 sm:w-16">
                <Image
                  src="/youtube.png"
                  alt=""
                  fill
                  className="object-contain p-0.5"
                  sizes="(max-width: 639px) 80px, 64px"
                />
              </div>
              <div className="min-w-0 max-w-xl">
                <h2 className="text-xl font-semibold text-zinc-900">Nosso canal no Youtube</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Assiste os nossos episódios e conteúdos sobre a vida em Portugal.
                </p>
              </div>
            </div>
            <div className="flex w-full shrink-0 justify-center sm:w-auto sm:justify-end sm:self-start sm:pt-0.5">
              <CardLinkButton
                href="https://www.youtube.com/@rafaapelomundo"
                target="_blank"
                rel="noreferrer"
                variant="primary"
                className="min-w-[10.5rem] justify-center px-4 py-2.5 text-sm font-medium sm:min-w-0 sm:py-2"
              >
                Ver canal
              </CardLinkButton>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                id: "yt-1",
                title:
                  "🏡 Ep 8 | VALEU A PENA? Valor e financiamento da nossa casa numa vila no interior de Portugal 🇵🇹",
                thumb: "/youtube_1.png",
                href: "https://www.youtube.com/watch?v=nSuXTX0z9Vk&list=PLE6qyBhvOLI0C0Ardu5fY3z8JK3kv-OKI&index=8",
              },
              {
                id: "yt-2",
                title:
                  "🏡 Ep 13 | Tiramos as maiores dúvidas sobre crédito habitação em Portugal 🇵🇹",
                thumb: "/youtube_2.png",
                href: "https://www.youtube.com/watch?v=v04RVqeT9aQ&list=PLE6qyBhvOLI0C0Ardu5fY3z8JK3kv-OKI&index=12",
              },
              {
                id: "yt-3",
                title:
                  "🏡 Ep 6 | Primeiros dias na nossa casa na aldeia em Portugal 🇵🇹",
                thumb: "/youtube_3.png",
                href: "https://www.youtube.com/watch?v=Z4Dv3M2ZLOQ&list=PLE6qyBhvOLI0C0Ardu5fY3z8JK3kv-OKI",
              },
            ].map((v) => {
              return (
                <a
                  key={v.id}
                  href={v.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-zinc-100">
                    <Image
                      src={v.thumb}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(min-width: 768px) 33vw, 100vw"
                    />
                    <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/5" />
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-2 text-sm font-semibold text-zinc-900">
                      {v.title}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1 font-medium text-zinc-700">
                        <span className="relative h-4 w-4" aria-hidden>
                          <Image src="/youtube.png" alt="" fill className="object-contain" />
                        </span>
                        YouTube
                      </span>
                      <span className="truncate">Rafa Pelo Mundo</span>
                    </div>
                  </div>
                </a>
              );
            })}
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
    </div>
  );
}
