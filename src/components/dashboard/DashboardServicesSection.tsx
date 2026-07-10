import type { ReactNode } from "react";

import { ServicesSpecialistsImage } from "@/components/brand/ServicesSpecialistsImage";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";
import { CardLinkButton } from "@/components/ui/CardButton";
import { TapedCard } from "@/components/ui/taped-card";
import {
  DASHBOARD_EXTRA_SERVICES,
  DASHBOARD_INCLUDED_SERVICES,
  DASHBOARD_RELOCATION_PACKAGES,
  eurToBrl,
  formatBrlAmount,
  formatEurAmount,
} from "@/lib/dashboard-services";
import { SITE_FOUNDERS_WHATSAPP_URL } from "@/lib/site-branding";

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary"
      aria-hidden
    >
      <path
        d="M5 10.5 8.2 13.7 15 6.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DualPrice({
  priceEur,
  suffix = "",
}: {
  priceEur: number;
  suffix?: string;
}) {
  const brl = eurToBrl(priceEur);

  return (
    <span className="inline-flex shrink-0 flex-wrap items-baseline justify-end gap-x-1 whitespace-nowrap text-right tabular-nums">
      <span className="text-sm font-semibold text-foreground">
        €{formatEurAmount(priceEur)}
        {suffix}
      </span>
      <span className="text-[0.65rem] text-muted"> / </span>
      <span className="text-xs font-medium text-muted">
        R${formatBrlAmount(brl)}
        {suffix}
      </span>
    </span>
  );
}

function RelocationPackageCard({
  location,
  priceEur,
}: {
  location: string;
  priceEur: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2">
      <span className="text-sm font-semibold leading-tight text-foreground">
        {location}
      </span>
      <DualPrice priceEur={priceEur} />
    </div>
  );
}

function RelocationPackagesList() {
  return (
    <div className="overflow-hidden rounded-[12px] border border-border bg-card">
      {DASHBOARD_RELOCATION_PACKAGES.map((pkg, index) => (
        <div
          key={pkg.location}
          className={
            index > 0 ? "border-t border-border/80" : undefined
          }
        >
          <RelocationPackageCard
            location={pkg.location}
            priceEur={pkg.priceEur}
          />
        </div>
      ))}
    </div>
  );
}

function IncludedServiceItem({ name }: { name: string }) {
  return (
    <li className="flex items-start gap-2.5 py-1.5 text-sm leading-snug text-foreground">
      <CheckIcon />
      <span>{name}</span>
    </li>
  );
}

function ExtraServiceRow({
  name,
  priceEur,
  priceSuffix,
}: {
  name: string;
  priceEur: number;
  priceSuffix?: string;
}) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 py-2.5 last:border-b-0">
      <span className="text-sm leading-snug text-foreground">{name}</span>
      <DualPrice priceEur={priceEur} suffix={priceSuffix} />
    </li>
  );
}

function ServicesFoundersWhatsappCta({ className = "" }: { className?: string }) {
  return (
    <CardLinkButton
      href={SITE_FOUNDERS_WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      variant="secondary"
      className={`gap-2 px-8 shadow-sm ${className}`.trim()}
      aria-label="Quero falar com as meninas — WhatsApp"
    >
      <WhatsappIcon className="h-5 w-5 shrink-0 text-current" />
      Falar com as meninas
    </CardLinkButton>
  );
}

type ServicesPricingCardProps = {
  showLearnMoreCta?: boolean;
  showExtraServices?: boolean;
  imageFloatingCta?: ReactNode;
};

export function ServicesPricingCard({
  showLearnMoreCta = true,
  showExtraServices = true,
  imageFloatingCta,
}: ServicesPricingCardProps) {
  return (
    <TapedCard>
      <div className="space-y-5">
        <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] md:gap-4">
          <ServicesSpecialistsImage
            layout="sidebar"
            showFloatingCta={showLearnMoreCta && !imageFloatingCta}
            floatingCta={imageFloatingCta}
            className="hidden md:block"
          />

          <div className="flex min-w-0 flex-col gap-3 pt-6 md:pt-0">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-accent">
                Pacotes
              </p>
              <h3 className="mt-0.5 text-xl font-bold tracking-tight text-foreground">
                Relocation
              </h3>
            </div>

            <RelocationPackagesList />

            <div className="border-t border-border pt-3">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                Inclusos no relocation
                <span className="inline-flex -rotate-3 rounded-xl bg-brand-primary/8 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-brand-primary">
                  Incluso
                </span>
              </h4>
              <ul className="mt-2">
                {DASHBOARD_INCLUDED_SERVICES.map((service) => (
                  <IncludedServiceItem
                    key={service.name}
                    name={service.name}
                  />
                ))}
              </ul>
            </div>
          </div>
        </div>

        {showExtraServices ? (
          <div className="border-t border-border pt-4">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <h4 className="text-sm font-semibold text-foreground">
                Serviços extra
              </h4>
              <span className="inline-flex -rotate-3 rounded-xl bg-page px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                A partir de
              </span>
            </div>

            <ul>
              {DASHBOARD_EXTRA_SERVICES.map((service) => (
                <ExtraServiceRow
                  key={service.name}
                  name={service.name}
                  priceEur={service.priceEur!}
                  priceSuffix={service.priceSuffix}
                />
              ))}
            </ul>
          </div>
        ) : null}

        {showExtraServices ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-[0.7rem] leading-relaxed text-muted">
            <p>* Mais o valor dos produtos.</p>
            <p>** Valor do transfer varia conforme aeroporto de chegada.</p>
          </div>
        ) : null}

        <ServicesSpecialistsImage
          layout="footer"
          showFloatingCta={showLearnMoreCta && !imageFloatingCta}
          floatingCta={imageFloatingCta}
          className="md:hidden"
        />
      </div>
    </TapedCard>
  );
}

type Props = {
  className?: string;
};

export function DashboardServicesSection({ className = "" }: Props) {
  return (
    <section
      className={`relative mx-auto w-full max-w-6xl overflow-visible px-4 py-10 md:px-6 md:py-14 ${className}`.trim()}
      aria-label="Serviços e valores"
    >
      <div className="mb-6 text-center md:mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
          Tudo o que precisas
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Serviços
        </h2>
        <p className="mx-auto mt-3 max-w-[52ch] text-sm leading-relaxed text-muted sm:text-base">
          Qualidade e segurança, com os menores preços de Portugal.
        </p>
      </div>

      <ServicesPricingCard
        showLearnMoreCta={false}
        imageFloatingCta={
          <ServicesFoundersWhatsappCta className="w-[min(100%,18rem)] sm:min-w-[20rem] md:w-[min(100%,16rem)]" />
        }
      />
    </section>
  );
}
