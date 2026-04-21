/* eslint-disable react/no-array-index-key */
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
import { GROUPS as VIP_GROUPS } from "@/components/GruposVipContent";

type AffiliateMe = NonNullable<Awaited<ReturnType<typeof api.affiliate.me>>>;
type MarketplaceCategory =
  NonNullable<Awaited<ReturnType<typeof api.marketplace.categoriesWithPartners>>>[number];

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

  const [serviceCategories, setServiceCategories] = useState<
    MarketplaceCategory[] | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    setServiceCategories(null);
    (async () => {
      try {
        const data = await api.marketplace.categoriesWithPartners();
        if (!cancelled) setServiceCategories(data);
      } catch {
        if (!cancelled) setServiceCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
      <section className="relative w-full overflow-hidden rounded-2xl bg-zinc-100">
        <div className="relative h-80 w-full sm:h-[320px] lg:h-[530px]">
          <Image
            src="/capa_rpm.png"
            alt="Comunidade RPM"
            fill
            className="object-cover opacity-50"
            sizes="100vw"
            priority
          />
        </div>

        <div className="pointer-events-none absolute inset-0 flex items-center justify-center -translate-y-16 sm:translate-y-0">
          <div className="flex flex-col items-center">
            <div className="relative h-32 w-[88vw] max-w-[880px] sm:h-40 md:h-44 lg:h-48">
              <Image
                src="/logo_comunidade.png"
                alt="Comunidade RPM"
                fill
                className="object-contain drop-shadow-sm"
                sizes="(min-width: 1024px) 880px, 88vw"
              />
            </div>
            <p className="mt-3 text-4xl leading-none sm:mt-4 sm:text-5xl" aria-hidden>
              🇧🇷 🇵🇹
            </p>
          </div>
        </div>

        <div className="absolute inset-0 hidden items-start sm:flex">
          <div className="w-full px-5 pt-5 sm:px-7 sm:pt-7">
            <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
              Bem vindo!
            </h1>
            <p className="mt-2 max-w-[60ch] text-sm text-zinc-900 sm:text-base">
              Aqui encontras tudo o que precisa para imigrar do brasil para portugal do jeito certo.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-[800px] sm:hidden">
        <h1 className="text-2xl font-semibold text-zinc-900">Bem vindo!</h1>
        <p className="mt-2 text-zinc-600">
          Aqui encontras tudo o que precisa para imigrar do brasil para portugal do jeito certo.
        </p>
      </div>

      <div className="mx-auto w-full max-w-[800px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-12 w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="relative aspect-[2/1] w-full overflow-hidden rounded-xl bg-zinc-100 md:w-80">
              <Image
                src="/plan.png"
                alt="Plano de imigração"
                fill
                className="object-contain"
                sizes="(min-width: 768px) 320px, 100vw"
                priority
              />
            </div>

            <div className="flex-1 space-y-3">
              <h2 className="text-xl font-semibold text-zinc-900">
                Plano de imigração 🇧🇷 → 🇵🇹
              </h2>
              <p className="text-sm text-zinc-600">
                Organize o teu plano, acompanhe as etapas e veja uma estimativa de custos para se
                preparar com mais segurança.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <CardLinkButton href="/plano-de-imigracao" variant="primary">
                  Acessar plano
                </CardLinkButton>
              </div>
            </div>
          </div>
        </section>
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
                E-book - Portugal Sem Perrengue
              </h2>
              <p className="text-sm text-zinc-600">
                O guia real pra sair do Brasil e morar legalmente em Portugal. Aqui você encontra o
                passo a passo, documentos, prazos e estratégias para fazer essa mudança com
                segurança.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <CardLinkButton href={pdfHref} variant="primary">
                  Acessar PDF
                </CardLinkButton>
              </div>
            </div>
          </div>
        </section>

        <section className="lg:col-span-12 w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-50">
                <Image src="/services.png" alt="" fill className="object-contain" sizes="56px" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-zinc-900">Serviços</h2>
                <p className="text-sm text-zinc-600">
                  Encontra parceiros e serviços por categoria.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <CardLinkButton href="/dashboard/services" variant="primary">
                Acessar serviços
              </CardLinkButton>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {serviceCategories === null ? (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 w-full animate-pulse rounded-xl border border-zinc-200 bg-zinc-50"
                  />
                ))}
              </>
            ) : serviceCategories.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Ainda não há categorias disponíveis.
              </p>
            ) : (
              serviceCategories.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard/category/${c.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 transition-colors hover:bg-zinc-100"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <Image
                      src="/services.png"
                      alt=""
                      width={18}
                      height={18}
                      className="h-[18px] w-[18px] object-contain"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {c.name}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-zinc-500 group-hover:text-zinc-700">
                    Ver
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="lg:col-span-12 w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-50">
                <Image
                  src="/whatsapp.png"
                  alt=""
                  fill
                  className="object-contain"
                  sizes="56px"
                />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-zinc-900">Grupos whatsapp</h2>
                <p className="text-sm text-zinc-600">
                  Entra nos grupos do WhatsApp da comunidade de acordo com o teu momento.
                </p>
              </div>
            </div>

            <div className="shrink-0">
              <CardLinkButton href="/grupos-vip" variant="primary">
                Acessar grupos
              </CardLinkButton>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {VIP_GROUPS.map((g) => (
              <div
                key={g.title}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Image
                    src="/whatsapp.png"
                    alt=""
                    width={18}
                    height={18}
                    className="h-[18px] w-[18px] object-contain"
                  />
                  <p className="truncate text-sm font-medium text-zinc-900">{g.title}</p>
                </div>
                {!g.isPublic &&
                g.id !== "rpm-alugueis" &&
                g.id !== "rpm-compra-imoveis" &&
                g.id !== "compra-automovel" ? (
                  <Image
                    src="/vip-card.png"
                    alt="VIP"
                    width={24}
                    height={24}
                    className="h-6 w-6 shrink-0 object-contain"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </section>

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
              <div className="mt-3 flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
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
                  Para abrir um ticket (elogio/reclamação/bug). Essa funcionalidade é exclusiva para membros da Comunidade RPM.
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

        <section className="lg:col-span-12 w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-50">
                <Image src="/youtube.png" alt="" fill className="object-contain" sizes="56px" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Nosso canal no Youtube</h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Assiste os nossos episódios e conteúdos sobre a vida em Portugal.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <CardLinkButton
                href="https://www.youtube.com/@rafaapelomundo"
                target="_blank"
                rel="noreferrer"
                variant="primary"
              >
                Ver canal
              </CardLinkButton>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
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

      {complaintOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
          role="presentation"
          onClick={() => !complaintSending && setComplaintOpen(false)}
        >
          <div
            className="my-8 w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl"
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
