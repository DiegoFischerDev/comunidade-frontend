'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { CatalogCarousel } from '@/components/CatalogCarousel';
import { RelocationHouseCard } from '@/components/relocation/RelocationHouseCard';
import { type RelocationHouseRow } from '@/components/relocation/relocation-house-shared';
import { CardButton, CardLinkButton } from '@/components/ui/CardButton';
import { PartnerEngagementBar } from '@/components/PartnerEngagementBar';
import { PartnerServicePriceCallout } from '@/components/PartnerServicePriceCallout';
import { PartnerCommentsSection } from '@/components/PartnerCommentsSection';
import { OPEN_MEMBERSHIP_MODAL_EVENT } from '@/components/FloatingWhatsAppButton';
import {
  buildPartnerHeroWhatsAppUrl,
  buildWhatsAppApiSendUrl,
} from '@/lib/partner-whatsapp';
import { getPublicSiteUrl } from '@/lib/site-url';

type PartnerDetails = {
  id: string;
  name: string;
  whatsapp: string;
  logoUrl: string | null;
  shortDescription: string | null;
  fullDescription: string | null;
  backgroundImageUrl: string | null;
  catalogImageUrls?: string[];
  instagram?: string | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  user: { email: string };
  services: {
    id: string;
    title: string;
    description: string | null;
    price: string | null;
    priceOnRequest: boolean;
  }[];
};

export default function PartnerPage() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [partner, setPartner] = useState<PartnerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showContact, setShowContact] = useState(false);
  const [relocationPreview, setRelocationPreview] = useState<RelocationHouseRow[]>([]);
  const [relocationHousesLoading, setRelocationHousesLoading] = useState(false);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const siteBase = getPublicSiteUrl();
  const sharePageUrl = `${siteBase}/partner/${partner?.id ?? params.id}`;

  useEffect(() => {
    if (!params?.id) return;
    (async () => {
      try {
        const data = await api.marketplace.partnerDetails(params.id);
        setPartner(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erro ao carregar dados do parceiro.',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  useEffect(() => {
    if (!partner?.category || partner.category.slug !== 'relocation') {
      setRelocationPreview([]);
      setRelocationHousesLoading(false);
      return;
    }
    let cancelled = false;
    setRelocationHousesLoading(true);
    (async () => {
      try {
        const data = await api.marketplace.relocationHouses({
          partnerId: partner.id,
        });
        if (!cancelled) setRelocationPreview(data.slice(0, 3));
      } catch {
        if (!cancelled) setRelocationPreview([]);
      } finally {
        if (!cancelled) setRelocationHousesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [partner?.id, partner?.category?.slug]);

  if (loading) {
    return <p className="text-sm text-zinc-600">Carregando parceiro…</p>;
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!partner) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">
          Parceiro não encontrado
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Este parceiro pode não existir ou ter sido removido.
        </p>
      </div>
    );
  }

  const waDigits = partner.whatsapp.replace(/\D/g, '');
  const whatsappUrl = buildWhatsAppApiSendUrl(waDigits, '');
  const buildServiceWhatsAppUrl = (serviceTitle: string) => {
    const text = `Olá, tenho interesse em saber mais informações sobre o serviço ${serviceTitle} sou membro VIP da Comunidade Rafa Portugal`;
    return buildWhatsAppApiSendUrl(waDigits, text);
  };
  const heroContactUrl = buildPartnerHeroWhatsAppUrl(partner.whatsapp);
  const hasHeroWhatsapp = partner.whatsapp.replace(/\D/g, '').length > 0;
  const logoSrc =
    partner.logoUrl && partner.logoUrl.startsWith('/uploads/')
      ? `${API_URL}${partner.logoUrl}`
      : partner.logoUrl;

  async function registerLeadThenOpen(openContact: () => void) {
    if (!user) {
      window.dispatchEvent(
        new CustomEvent('open-auth-modal', {
          detail: {
            mode: 'login',
          },
        }),
      );
      return;
    }
    if (user.tier !== 'MEMBER') {
      window.dispatchEvent(new CustomEvent(OPEN_MEMBERSHIP_MODAL_EVENT));
      return;
    }
    try {
      await api.marketplace.registerLead(partner!.id);
    } catch {
      // não bloqueia: abre contacto mesmo se o registo do lead falhar
    }
    openContact();
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center">
        <CardLinkButton
          href="/dashboard/services"
          variant="primary"
          className="shadow-sm"
        >
          <span className="opacity-90" aria-hidden>
            ←
          </span>
          Outros serviços
        </CardLinkButton>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-800 via-rose-900 to-red-950 text-white">
        {partner.backgroundImageUrl && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40"
              style={{ backgroundImage: `url(${partner.backgroundImageUrl})` }}
            />
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-red-900/35 via-red-950/65 to-red-950/92"
              aria-hidden
            />
          </>
        )}
        <div className="relative z-10 min-h-[260px] px-6 py-9 sm:min-h-[340px] sm:px-10 sm:py-12">
          <div className="mt-0 flex flex-col gap-6 sm:flex-row sm:items-center">
            {logoSrc && (
              <div className="shrink-0">
                <img
                  src={logoSrc}
                  alt={partner.name}
                  className="h-32 w-32 object-contain drop-shadow-lg sm:h-40 sm:w-40"
                />
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-red-100/95">
                {partner.category?.name ?? 'Parceiro'}
              </p>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
                {partner.name}
              </h1>
              {partner.shortDescription && (
                <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-white/95 sm:text-base">
                  {partner.shortDescription}
                </p>
              )}
              {hasHeroWhatsapp && heroContactUrl !== '#' ? (
                <div className="mt-5 flex justify-center sm:justify-start">
                  <CardButton
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void registerLeadThenOpen(() => {
                        window.open(
                          heroContactUrl,
                          '_blank',
                          'noopener,noreferrer',
                        );
                      });
                    }}
                    className="px-5 py-2.5 shadow-sm"
                  >
                    <svg
                      className="h-5 w-5 shrink-0"
                      viewBox="0 0 24 24"
                      fill="#25D366"
                      aria-hidden
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.123 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    Entre em contato
                  </CardButton>
                </div>
              ) : null}
          </div>
          </div>
        </div>
        <PartnerEngagementBar
          partnerId={partner.id}
          sharePageUrl={sharePageUrl}
          variant="hero"
          partnerName={partner.name}
          partnerLogoUrl={logoSrc}
          className="relative z-10 border-t border-white/20 bg-black/15 px-6 py-3 sm:px-10"
        />
      </section>

      {/* Descrição completa */}
      {partner.fullDescription && (
        <section>
          <h2 className="mb-3 text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            Sobre {partner.name}
          </h2>
          <p className="whitespace-pre-line text-base leading-relaxed text-zinc-700">
            {partner.fullDescription}
          </p>
        </section>
      )}

      {/* Carrossel de catálogo */}
      {partner.catalogImageUrls && partner.catalogImageUrls.length > 0 && (
        <section>
          <CatalogCarousel
            images={partner.catalogImageUrls}
            apiBaseUrl={API_URL}
          />
        </section>
      )}

      {/* Lista de serviços */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
          Serviços oferecidos
        </h2>
        {partner.services.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Este parceiro ainda não cadastrou serviços.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {partner.services.map((service) => (
              <div
                key={service.id}
                className="flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <h3 className="text-base font-semibold tracking-tight text-zinc-900 sm:text-lg">
                  {service.title}
                </h3>
                {service.description && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-700">
                    {service.description}
                  </p>
                )}
                <PartnerServicePriceCallout
                  price={service.price}
                  priceOnRequest={service.priceOnRequest}
                />
                <div className="mt-4 flex flex-col items-stretch gap-3 sm:items-end">
                  <CardButton
                    type="button"
                    variant="primary"
                    onClick={() => {
                      void registerLeadThenOpen(() => {
                        window.open(
                          buildServiceWhatsAppUrl(service.title),
                          '_blank',
                          'noopener,noreferrer',
                        );
                      });
                    }}
                  >
                    Contactar
                  </CardButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {partner.category?.slug === 'relocation' && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            Imóveis
          </h2>
          {relocationHousesLoading ? (
            <p className="text-sm text-zinc-600">A carregar imóveis…</p>
          ) : relocationPreview.length === 0 ? (
            <p className="text-sm text-zinc-600">
              Ainda não há imóveis publicados por este parceiro.
            </p>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {relocationPreview.map((h) => (
                  <RelocationHouseCard key={h.id} house={h} />
                ))}
              </div>
              <div className="flex justify-center pt-1">
                <CardLinkButton
                  href={`/relocation/imoveis?parceiro=${encodeURIComponent(partner.id)}`}
                  variant="primary"
                  className="min-w-[14rem] shadow-sm"
                >
                  Ver todos os imóveis
                </CardLinkButton>
              </div>
            </>
          )}
        </section>
      )}

      <PartnerCommentsSection partnerId={partner.id} partnerName={partner.name} />

      {/* Modal de contacto */}
      {showContact && (
        <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center gap-3">
              {logoSrc && (
                <div className="h-14 w-14 shrink-0">
                  <img
                    src={logoSrc}
                    alt={partner.name}
                    className="h-full w-full object-contain"
                  />
                </div>
              )}
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Informações de contatos
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Use estes dados para falar diretamente com {partner.name}.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center text-zinc-600" aria-hidden>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L12 9.128l8.073-5.635C21.69 2.28 24 3.434 24 5.457z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase text-zinc-500">Email</p>
                  <a
                    href={`mailto:${partner.user.email}`}
                    className="mt-0.5 block text-zinc-800 underline-offset-2 hover:underline truncate"
                  >
                    {partner.user.email}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center text-[#25D366]" aria-hidden>
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase text-zinc-500">WhatsApp</p>
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 block text-zinc-800 underline-offset-2 hover:underline"
                  >
                    {partner.whatsapp}
                  </a>
                </div>
              </div>
              {partner.instagram && partner.instagram.trim() && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center text-[#E4405F]" aria-hidden>
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium uppercase text-zinc-500">Instagram</p>
                    <a
                      href={
                        partner.instagram.startsWith('http')
                          ? partner.instagram
                          : partner.instagram.startsWith('@')
                            ? `https://instagram.com/${partner.instagram.slice(1)}`
                            : `https://instagram.com/${partner.instagram}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="mt-0.5 block text-zinc-800 underline-offset-2 hover:underline truncate"
                    >
                      {partner.instagram}
                    </a>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowContact(false)}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

