import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description:
    "Informação sobre tratamento de dados pessoais na plataforma Comunidade Rafa Portugal.",
  robots: { index: true, follow: true },
};

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-amber-800 underline-offset-4 hover:underline"
          >
            ← Voltar ao painel
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Política de privacidade
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Última atualização: abril de 2026. Este texto descreve, de forma simples, como tratamos dados na
          plataforma <strong className="font-semibold text-zinc-700">Comunidade Rafa Portugal</strong>. Não
          substitui aconselhamento jurídico; para questões específicas contacte-nos pelos canais indicados em
          baixo.
        </p>

        <section className="mt-10 space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">Quem é responsável pelo tratamento?</h2>
          <p className="text-sm leading-relaxed text-zinc-700">
            O responsável pelo tratamento dos dados pessoais tratados através desta aplicação é a entidade que
            opera a Comunidade Rafa Portugal (doravante &quot;nós&quot; ou &quot;a plataforma&quot;). Para
            exercer os seus direitos ou pedir esclarecimentos, pode utilizar o mesmo contacto que usa para
            suporte (por exemplo, a área de tickets / reclamações disponível após entrar na conta, quando
            aplicável).
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">Que dados tratamos?</h2>
          <p className="text-sm leading-relaxed text-zinc-700">
            Dependendo da forma como usa a plataforma, podemos tratar, entre outros:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
            <li>
              <strong className="font-medium text-zinc-800">Conta e perfil:</strong> nome, número de WhatsApp,
              palavra-passe (armazenada de forma segura no servidor), e-mail quando indicado, papel na aplicação
              (utilizador, parceiro ou administrador), plano / tipo de conta quando aplicável (por exemplo
              visitante ou membro VIP).
            </li>
            <li>
              <strong className="font-medium text-zinc-800">Sessão no seu dispositivo:</strong> após o login,
              guardamos um token de sessão no <strong className="font-medium text-zinc-800">armazenamento local
              do browser</strong> (<code className="rounded bg-zinc-100 px-1 text-xs">localStorage</code>) para
              o manter autenticado. Não utilizamos, neste momento, cookies HTTP próprios para esse efeito na nossa
              aplicação web.
            </li>
            <li>
              <strong className="font-medium text-zinc-800">Plano de imigração / checklist:</strong> respostas e
              estado que guarda na sua área reservada.
            </li>
            <li>
              <strong className="font-medium text-zinc-800">Parceiros e marketplace:</strong> dados do perfil de
              parceiro (nome comercial, WhatsApp de contacto, descrições, media), serviços, vendas e comissões
              quando utilizados na plataforma; registos de contactos / leads quando um utilizador autenticado
              manifesta interesse (por exemplo ao seguir para WhatsApp).
            </li>
            <li>
              <strong className="font-medium text-zinc-800">Anúncios de imóveis (relocation):</strong> título,
              descrição, localização livre (texto), preços, fotografias e vídeo armazenados nos nossos servidores
              ou armazenamento de ficheiros; mensagens de texto podem ser enviadas a grupos WhatsApp da comunidade
              conforme descrito na própria área de publicação (sem envio repetido de médias ao grupo).
            </li>
            <li>
              <strong className="font-medium text-zinc-800">Pagamentos:</strong> quando paga serviços na
              plataforma (por exemplo subscrição ou taxas associadas), os dados de pagamento são tratados pelo
              prestador de pagamentos (<strong className="font-medium text-zinc-800">Stripe</strong> ou fluxo
              equivalente). Nós não armazenamos o número completo do seu cartão.
            </li>
            <li>
              <strong className="font-medium text-zinc-800">Suporte e reclamações:</strong> mensagens que nos
              envia através do sistema de tickets; estado de cada pedido (registado, em análise, concluído).
            </li>
            <li>
              <strong className="font-medium text-zinc-800">Programa de afiliados e chamadas com a Rafa:</strong>
              dados necessários para participação e agendamento quando utiliza essas funcionalidades.
            </li>
            <li>
              <strong className="font-medium text-zinc-800">Registos técnicos:</strong> dados de utilização da API
              e logs necessários à segurança, diagnóstico e bom funcionamento do serviço.
            </li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">Para que fins utilizamos os dados?</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-700">
            <li>Criar e gerir a sua conta e dar acesso às áreas reservadas da comunidade.</li>
            <li>Prestar os serviços que contratou ou solicitou (conteúdos, parceiros, imóveis, suporte).</li>
            <li>Processar pagamentos e cumprir obrigações contabilísticas e fiscais aplicáveis.</li>
            <li>Comunicar consigo sobre o serviço, tickets ou pedidos que tenha feito.</li>
            <li>Garantir segurança, prevenir abuso e melhorar a estabilidade da plataforma.</li>
            <li>Cumprir obrigações legais quando aplicável.</li>
          </ul>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">Base legal</h2>
          <p className="text-sm leading-relaxed text-zinc-700">
            Tratamos dados com fundamento na execução do contrato ou medidas pré-contratuais (gestão da conta e
            serviços pedidos), no consentimento quando o solicitamos de forma explícita (por exemplo em
            funcionalidades opcionais), no interesse legítimo quando aplicável (segurança, melhoria técnica do
            serviço, desde que balanceado com os seus direitos), e no cumprimento de obrigações legais.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">Cookies e tecnologias semelhantes</h2>
          <p className="text-sm leading-relaxed text-zinc-700">
            A sessão na nossa aplicação web assenta principalmente em&nbsp;
            <strong className="font-medium text-zinc-800">localStorage</strong>, não em cookies HTTP próprios para
            login. Serviços de terceiros integrados (por exemplo <strong className="font-medium text-zinc-800">
            Stripe</strong> no checkout) podem definir cookies ou tecnologias equivalentes nos seus domínios,
            subordinados às respetivas políticas. Recomendamos que reveja as definições do seu browser e as
            políticas desses prestadores quando utiliza pagamentos online.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">Quanto tempo conservamos os dados?</h2>
          <p className="text-sm leading-relaxed text-zinc-700">
            Conservamos os dados pelo tempo necessário para as finalidades acima — tipicamente enquanto mantiver
            conta ativa ou exista relação contratual ou legal que o justifique — e apagamos ou anonimizamos quando
            já não forem necessários, salvo quando a lei exija conservação por período superior.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">Com quem partilhamos dados?</h2>
          <p className="text-sm leading-relaxed text-zinc-700">
            Podemos partilhar dados com prestadores que nos ajudam a operar o serviço (alojamento, base de dados,
            pagamentos, envio de mensagens quando configurado), sempre no âmbito do necessário à prestação do
            serviço e com salvaguardas adequadas. Alguns prestadores podem estar situados fora do Espaço
            Económico Europeu; nesses casos aplicamos as garantias previstas na lei aplicável (por exemplo
            cláusulas contratuais-tipo da Comissão Europeia, quando relevante).
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">Os seus direitos</h2>
          <p className="text-sm leading-relaxed text-zinc-700">
            Nos termos do RGPD, pode solicitar acesso, retificação ou apagamento dos seus dados pessoais,
            limitação ou oposição ao tratamento, portabilidade quando aplicável, e retirar consentimentos quando o
            tratamento se baseie neles. Também pode apresentar reclamação à autoridade de supervisão competente
            em Portugal — a <strong className="font-medium text-zinc-800">Comissão Nacional de Protecção de Dados
            (CNPD)</strong>. Para exercer direitos connosco, utilize os contactos de suporte disponíveis na
            plataforma.
          </p>
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-lg font-semibold text-zinc-900">Alterações</h2>
          <p className="text-sm leading-relaxed text-zinc-700">
            Podemos atualizar esta página quando a plataforma ou a lei evoluírem. A data no topo indica a última
            revisão relevante.
          </p>
        </section>
      </article>
    </div>
  );
}
