import type { Metadata } from "next";
import Link from "next/link";
import { DASHBOARD_HOME_PATH } from "@/lib/dashboard-home";
import { SITE_CONTACT_EMAIL, SITE_NAME_FULL } from "@/lib/site-branding";

export const metadata: Metadata = {
  title: "Termos de Serviço",
  description: `Termos de utilização da plataforma ${SITE_NAME_FULL} e dos canais digitais associados.`,
  robots: { index: true, follow: true },
};

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href={DASHBOARD_HOME_PATH}
            className="text-sm font-medium text-brand-primary underline-offset-4 hover:underline"
          >
            ← Voltar ao painel
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Termos de Serviço
        </h1>
        <p className="mt-2 text-sm text-muted">
          Última atualização: novembro de 2026. Estes termos regulam o uso da plataforma{" "}
          <strong className="font-semibold text-foreground/90">{SITE_NAME_FULL}</strong>{" "}
          (site, área de membros, CRM e canais digitais associados, incluindo WhatsApp e Instagram).
          Não substituem aconselhamento jurídico. Em caso de dúvida, contacte{" "}
          <a
            href={`mailto:${SITE_CONTACT_EMAIL}`}
            className="font-medium text-brand-primary underline-offset-4 hover:underline"
          >
            {SITE_CONTACT_EMAIL}
          </a>
          .
        </p>

        <section className="mt-10 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Quem somos</h2>
          <p className="text-sm leading-relaxed text-foreground/90">
            A {SITE_NAME_FULL} (&quot;nós&quot;, &quot;a plataforma&quot;) opera serviços de
            acompanhamento e informação relacionados com imigração e vida em Portugal, bem como
            ferramentas digitais para a comunidade, parceiros e atendimento. O site público está em{" "}
            <strong className="font-medium text-foreground">movecasa.pt</strong>.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. Aceitação</h2>
          <p className="text-sm leading-relaxed text-foreground/90">
            Ao aceder ao site, criar conta, utilizar a área de membros, agendar chamadas, interagir
            com os nossos chatbots ou contactar-nos por WhatsApp / Instagram, aceita estes Termos e a
            nossa{" "}
            <Link
              href="/privacidade"
              className="font-medium text-brand-primary underline-offset-4 hover:underline"
            >
              Política de privacidade
            </Link>
            . Se não concordar, não utilize os serviços.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. Serviços</h2>
          <p className="text-sm leading-relaxed text-foreground/90">
            Podemos disponibilizar, entre outros:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
            <li>conteúdos e ferramentas da comunidade / área de membros;</li>
            <li>informação e encaminhamento sobre relocation, crédito, vistos e temas relacionados;</li>
            <li>agendamento de videochamadas e gestão de contactos (CRM);</li>
            <li>
              atendimento automatizado por chatbots em WhatsApp e Instagram (menu e assistentes
              virtuais), com possibilidade de handoff para atendimento humano;
            </li>
            <li>áreas para parceiros, leads e anúncios, quando aplicável.</li>
          </ul>
          <p className="text-sm leading-relaxed text-foreground/90">
            A descrição comercial de cada serviço (preços, âmbito, prazos) prevalece sobre este texto
            genérico quando existir contrato ou proposta específica.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. Contas e utilização adequada</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-foreground/90">
            <li>É responsável pela exactidão dos dados que nos fornece e pela segurança da sua conta.</li>
            <li>
              Não pode usar a plataforma para spam, fraude, abuso, conteúdo ilegal ou para contornar
              medidas de segurança.
            </li>
            <li>
              Podemos suspender ou encerrar o acesso em caso de violação destes termos, risco de
              segurança ou obrigação legal.
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">
            5. Mensagens, chatbots e canais (WhatsApp / Instagram)
          </h2>
          <p className="text-sm leading-relaxed text-foreground/90">
            Ao enviar-nos mensagens nestes canais, autoriza o tratamento necessário para responder,
            qualificar o pedido e, quando fizer sentido, criar ou actualizar uma ficha de contacto.
            Parte das respostas pode ser gerada automaticamente por assistentes virtuais; em
            qualquer momento a conversa pode passar a atendimento humano. Os chatbots não substituem
            aconselhamento jurídico, fiscal ou de imigração personalizado.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">6. Conteúdos e propriedade intelectual</h2>
          <p className="text-sm leading-relaxed text-foreground/90">
            Textos, marcas, logótipos, imagens e software da plataforma são nossos ou de licenciantes.
            Não pode copiar, revender ou explorar comercialmente esses materiais sem autorização
            prévia, excepto o uso normal permitido pela própria interface.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">7. Limitação de responsabilidade</h2>
          <p className="text-sm leading-relaxed text-foreground/90">
            Esforçamo-nos por manter a plataforma disponível e correcta, mas o serviço pode sofrer
            interrupções, erros ou alterações. Na medida permitida pela lei aplicável, não somos
            responsáveis por danos indirectos, perda de oportunidades ou decisões tomadas com base
            apenas em informação genérica ou respostas automatizadas. Nada nestes termos exclui
            responsabilidade que a lei não permita excluir.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">8. Dados pessoais</h2>
          <p className="text-sm leading-relaxed text-foreground/90">
            O tratamento de dados pessoais está descrito na{" "}
            <Link
              href="/privacidade"
              className="font-medium text-brand-primary underline-offset-4 hover:underline"
            >
              Política de privacidade
            </Link>
            .
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">9. Alterações</h2>
          <p className="text-sm leading-relaxed text-foreground/90">
            Podemos actualizar estes Termos quando o serviço ou a lei evoluírem. A data no topo
            indica a última revisão relevante. O uso continuado após a publicação constitui
            aceitação da versão actualizada, salvo quando a lei exigir outro formalismo.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">10. Lei aplicável e contacto</h2>
          <p className="text-sm leading-relaxed text-foreground/90">
            Estes Termos regem-se pela lei portuguesa, sem prejuízo de normas imperativas de
            protecção do consumidor que lhe sejam aplicáveis. Para questões sobre estes Termos:
            {" "}
            <a
              href={`mailto:${SITE_CONTACT_EMAIL}`}
              className="font-medium text-brand-primary underline-offset-4 hover:underline"
            >
              {SITE_CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </article>
    </div>
  );
}
