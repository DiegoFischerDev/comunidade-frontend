import { DashboardTestimonialsSection } from "@/components/dashboard/DashboardTestimonialsSection";
import { ServicesPricingCard } from "@/components/dashboard/DashboardServicesSection";
import { WhatsappIcon } from "@/components/icons/WhatsappIcon";
import { CardLinkButton } from "@/components/ui/CardButton";
import { SITE_FOUNDERS_WHATSAPP_URL } from "@/lib/site-branding";

function ServicosWhatsappCta() {
  return (
    <CardLinkButton
      href={SITE_FOUNDERS_WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      variant="secondary"
      className="w-[min(100%,18rem)] gap-2 px-8 shadow-sm sm:min-w-[20rem]"
      aria-label="Falar com Rafa e Carol no WhatsApp"
    >
      <WhatsappIcon className="h-5 w-5 shrink-0 text-current" />
      Falar com Rafa &amp; Carol
    </CardLinkButton>
  );
}

export default function ServicosPage() {
  return (
    <div className="space-y-0">
      <section
        className="relative mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-14"
        aria-label="Serviço de relocation"
      >
        <header className="mb-8 text-center md:mb-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
            Relocation
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Chegue em Portugal com tudo organizado
          </h1>
        </header>

        <div className="space-y-6 text-sm leading-relaxed text-muted sm:text-base">
          <p>
            Mudar de país já é um grande desafio. Encontrar uma casa, entender a
            documentação e resolver tudo sozinho pode tornar esse processo ainda
            mais difícil.
          </p>

          <p>
            Com o nosso serviço de Relocation, você chega com muito mais
            tranquilidade. Cuidamos das etapas essenciais da sua mudança para que
            você possa começar sua nova vida com segurança e sem preocupações.
          </p>

          <p className="font-medium text-foreground">
            Atendemos presencialmente em Viseu e São Pedro do Sul, com planos a
            partir de 500€.
          </p>

          <div className="space-y-3 pt-2">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Por que escolher Viseu ou São Pedro do Sul?
            </h2>
            <p>
              Essas são duas das regiões com melhor custo-benefício para quem
              está chegando em Portugal. O custo de vida é mais baixo do que em
              Lisboa e Porto, há boas oportunidades de trabalho, excelente
              qualidade de vida e muito mais tranquilidade para viver e criar uma
              família.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              Atendimento próximo e personalizado
            </h2>
            <p>
              Cada mudança é única. Por isso, acompanhamos você em cada etapa,
              desde a busca pelo imóvel até a sua chegada em Portugal, oferecendo
              um atendimento próximo, transparente e focado nas suas necessidades.
            </p>
          </div>
        </div>
      </section>

      <section
        className="relative mx-auto w-full max-w-6xl px-4 pb-10 md:px-6 md:pb-14"
        aria-label="Preços e pacotes"
      >
        <div className="mb-6 text-center md:mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
            Tudo o que precisas
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Serviços e valores
          </h2>
          <p className="mx-auto mt-3 max-w-[52ch] text-sm leading-relaxed text-muted sm:text-base">
            Qualidade e segurança, com os menores preços de Portugal.
          </p>
        </div>

        <ServicesPricingCard
          showLearnMoreCta={false}
          imageFloatingCta={<ServicosWhatsappCta />}
        />
      </section>

      <DashboardTestimonialsSection />
    </div>
  );
}
