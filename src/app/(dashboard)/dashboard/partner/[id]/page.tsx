'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { CatalogCarousel } from '@/components/CatalogCarousel';

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
    commission: string | null;
  }[];
};

export default function PartnerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [partner, setPartner] = useState<PartnerDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showContact, setShowContact] = useState(false);

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

  const whatsappUrl = `https://wa.me/${partner.whatsapp.replace(/\D/g, '')}`;
  const buildServiceWhatsAppUrl = (serviceTitle: string) => {
    const text = `Olá, tenho interesse em saber mais informações sobre o serviço ${serviceTitle}`;
    return `${whatsappUrl}?text=${encodeURIComponent(text)}`;
  };
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
    try {
      await api.marketplace.registerLead(partner!.id);
    } catch {
      // não bloqueia: abre contacto mesmo se o registo do lead falhar
    }
    openContact();
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        {partner.backgroundImageUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-40"
            style={{ backgroundImage: `url(${partner.backgroundImageUrl})` }}
          />
        )}
        <div className="relative z-10 px-6 py-6 sm:px-10 sm:py-8">
          <button
            type="button"
            onClick={() =>
              partner.category
                ? router.push(`/dashboard/category/${partner.category.slug}`)
                : router.back()
            }
            className="absolute left-4 top-4 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/95 text-emerald-700 shadow-lg ring-1 ring-emerald-500/40 hover:bg-white sm:left-6 sm:top-6"
            aria-label={
              partner.category
                ? `Voltar para ${partner.category.name}`
                : 'Voltar'
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              aria-hidden="true"
            >
              <path
                d="M15.75 19.5 8.25 12l7.5-7.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center">
            {logoSrc && (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/90 p-2 shadow-md sm:h-24 sm:w-24">
                <img
                  src={logoSrc}
                  alt={partner.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-emerald-100">
                {partner.category?.name ?? 'Parceiro'}
              </p>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
                {partner.name}
              </h1>
              {partner.shortDescription && (
                <p className="mt-3 max-w-2xl text-sm text-emerald-50 sm:text-base">
                  {partner.shortDescription}
                </p>
              )}
              <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => registerLeadThenOpen(() => setShowContact(true))}
                className="inline-flex cursor-pointer items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-50"
              >
                Entrar em contacto
              </button>
              <button
                type="button"
                onClick={() =>
                  registerLeadThenOpen(() =>
                    window.open(whatsappUrl, '_blank', 'noopener,noreferrer'),
                  )
                }
                className="inline-flex cursor-pointer items-center rounded-full border border-emerald-100 bg-emerald-500/40 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500/60"
              >
                Falar no WhatsApp
              </button>
            </div>
          </div>
          </div>
        </div>
      </section>

      {/* Descrição completa */}
      {partner.fullDescription && (
        <>
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">
            Sobre {partner.name}
          </h2>
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
            <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-700">
              {partner.fullDescription}
            </p>
          </section>
        </>
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
        <h2 className="text-sm font-semibold text-zinc-900">
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
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-zinc-900">
                    {service.title}
                  </h3>
                  {service.priceOnRequest ? (
                    <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
                      Sob consulta
                    </span>
                  ) : service.price ? (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                      {service.price} €
                    </span>
                  ) : null}
                </div>
                {service.description && (
                  <p className="mt-2 text-sm text-zinc-700">
                    {service.description}
                  </p>
                )}
                <div className="mt-3">
                  <a
                    href={user ? buildServiceWhatsAppUrl(service.title) : '#'}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => {
                      if (!user) {
                        e.preventDefault();
                        window.dispatchEvent(
                          new CustomEvent('open-auth-modal', {
                            detail: {
                              mode: 'login',
                            },
                          }),
                        );
                      } else {
                        // registo de lead não é obrigatório aqui, apenas contacto direto
                        void api.marketplace
                          .registerLead(partner.id)
                          .catch(() => {});
                      }
                    }}
                    className="inline-flex cursor-pointer items-center rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    Mais informações
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal de contacto */}
      {showContact && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center gap-3">
              {logoSrc && (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-50 p-1">
                  <img
                    src={logoSrc}
                    alt={partner.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}
              <div>
                <h2 className="text-base font-semibold text-zinc-900">
                  Contactos do parceiro
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Use estes dados para falar diretamente com {partner.name}.
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium uppercase text-zinc-500">
                  Email
                </p>
                <a
                  href={`mailto:${partner.user.email}`}
                  className="mt-0.5 text-zinc-800 underline-offset-2 hover:underline"
                >
                  {partner.user.email}
                </a>
              </div>
              <div>
                <p className="text-xs font-medium uppercase text-zinc-500">
                  WhatsApp
                </p>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-0.5 text-zinc-800 underline-offset-2 hover:underline"
                >
                  {partner.whatsapp}
                </a>
              </div>
              {partner.instagram && partner.instagram.trim() && (
                <div>
                  <p className="text-xs font-medium uppercase text-zinc-500">
                    Instagram
                  </p>
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
                    className="mt-0.5 text-zinc-800 underline-offset-2 hover:underline"
                  >
                    {partner.instagram}
                  </a>
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

