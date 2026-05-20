import { CatalogCarousel } from '@/components/CatalogCarousel';
import { PartnerCatalogVideo } from '@/components/PartnerCatalogVideo';
import { PartnerServicePriceCallout } from '@/components/PartnerServicePriceCallout';
import { RelocationHouseCard } from '@/components/relocation/RelocationHouseCard';
import type { RelocationHouseRow } from '@/components/relocation/relocation-house-shared';
import { CardLinkButton } from '@/components/ui/CardButton';
import { PartnerEngagementBar } from '@/components/PartnerEngagementBar';
import { PartnerCommentsSection } from '@/components/PartnerCommentsSection';
import {
  buildAdminWhatsAppUrl,
  partnerAtendimentoMessage,
  partnerServiceInterestMessage,
} from '@/lib/admin-contact-whatsapp';
import { partnerContactHref } from '@/lib/partner-contact-redirect';
import type { PartnerPublic } from '@/lib/partner-public-shared';
import {
  absolutePartnerAssetUrl,
  PARTNER_PUBLIC_API_URL,
} from '@/lib/partner-public-shared';

type Props = {
  partner: PartnerPublic;
  relocationHouses: RelocationHouseRow[];
  sharePageUrl: string;
};

export function PartnerPublicPageView({ partner, relocationHouses, sharePageUrl }: Props) {
  const visibleServices = partner.services;

  const heroBgImage = absolutePartnerAssetUrl(partner.backgroundImageUrl);
  const logoSrc = absolutePartnerAssetUrl(partner.logoUrl);

  const heroContactHref = partnerContactHref(
    partner.heroContactRedirectPath,
    buildAdminWhatsAppUrl(partnerAtendimentoMessage(partner.name)),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-800 via-rose-900 to-red-950 text-white">
        {heroBgImage && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40"
              style={{ backgroundImage: `url(${heroBgImage})` }}
            />
            <div
              className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-red-900/35 via-red-950/65 to-red-950/92"
              aria-hidden
            />
          </>
        )}
        <div className="relative z-10 flex flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:px-10 sm:py-14">
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
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{partner.name}</h1>
            {partner.shortDescription && (
              <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-white/95 sm:text-base">
                {partner.shortDescription}
              </p>
            )}
            <div className="mt-5 flex justify-center sm:justify-start">
              <CardLinkButton
                href={heroContactHref}
                target="_blank"
                rel="noopener noreferrer"
                variant="outline"
                className="px-5 py-2.5 shadow-sm"
              >
                Entre em contato
              </CardLinkButton>
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

      <PartnerCatalogVideo
        videoUrl={partner.catalogVideoUrl}
        apiBaseUrl={PARTNER_PUBLIC_API_URL}
      />

      {partner.catalogImageUrls && partner.catalogImageUrls.length > 0 && (
        <section>
          <CatalogCarousel
            images={partner.catalogImageUrls}
            apiBaseUrl={PARTNER_PUBLIC_API_URL}
          />
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
          Serviços oferecidos
        </h2>
        {visibleServices.length === 0 ? (
          <p className="text-sm text-zinc-500">Este parceiro ainda não cadastrou serviços.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {visibleServices.map((service) => (
              <article
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
                  <CardLinkButton
                    href={partnerContactHref(
                      service.contactRedirectPath,
                      buildAdminWhatsAppUrl(
                        partnerServiceInterestMessage(partner.name, service.title),
                      ),
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="primary"
                    className="w-full min-w-0 sm:w-auto"
                  >
                    Contactar
                  </CardLinkButton>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {partner.category?.slug === 'relocation' && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl">
            Imóveis
          </h2>
          {relocationHouses.length === 0 ? (
            <p className="text-sm text-zinc-600">Ainda não há imóveis publicados por este parceiro.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relocationHouses.map((h) => (
                <RelocationHouseCard key={h.id} house={h} showContactButton={false} />
              ))}
            </div>
          )}
        </section>
      )}

      <PartnerCommentsSection partnerId={partner.id} partnerName={partner.name} />
    </div>
  );
}
