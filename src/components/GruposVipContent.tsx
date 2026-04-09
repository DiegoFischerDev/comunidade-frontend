'use client';

import Image from 'next/image';
import { CardButton } from '@/components/ui/CardButton';

export type VipGroup = {
  id: string;
  title: string;
  description: string;
  isPublic: boolean;
  comingSoon?: boolean;
};

export const GROUPS: VipGroup[] = [
  {
    id: 'geral',
    title: 'Geral Comunidade RPM',
    description: 'Grupo geral, aberto para visitantes, para tratar de assuntos em geral.',
    isPublic: true,
  },
  {
    id: 'rpm-brasil',
    title: 'Ainda estou no Brasil',
    description:
      'Para membros que pretendem imigrar para portugal mas ainda estao no brasil. Indicado para quem ainda esta decidindo para qual cidade imigrar, qual tipo de visto aplicar, e buscando a primeira moradia em Portugal.',
    isPublic: false,
  },
  {
    id: 'rpm-portugal',
    title: 'Já estou em Portugal',
    description:
      'Para membros que ja estao em Portugal, buscam trocar informaçoes sobre oportunidades de emprego, processos da AIMA, autorização de residencia, nacionalidade, escolas, etc.',
    isPublic: false,
  },
  {
    id: 'rpm-alugueis',
    title: 'Aluguel de imóveis (Relocation)',
    description:
      'Grupo onde sao postados semalmente os imoveis disponiveis para Arrendamento (aluguel) onde a maioria ainda nao foi publicado nos sites de busca.',
    isPublic: false,
  },
  {
    id: 'rpm-compra-imoveis',
    title: 'Compra de imóveis (Financiamento)',
    description:
      'Grupo onde sao postados semanalmente os imoveis disponiveis para venda onde a maioria ainda nao foi publicados nos sites de busca.',
    isPublic: false,
  },
  {
    id: 'compra-automovel',
    title: 'Compra de automóveis',
    description:
      'Grupo para trocar dicas e oportunidades de compra de automóvel em Portugal, com recomendações e alertas do que evitar.',
    isPublic: false,
    comingSoon: true,
  },
];

function WhatsAppLogo() {
  return (
    <Image
      src="/whatsapp.png"
      alt=""
      width={56}
      height={56}
      className="h-14 w-14 object-contain"
      priority={false}
    />
  );
}

function VipCornerBadge() {
  return (
    <div className="absolute right-3 top-3">
      <Image
        src="/vip-card.png"
        alt="VIP"
        width={42}
        height={42}
        className="h-[42px] w-[42px] object-contain"
        priority={false}
      />
    </div>
  );
}

export function GruposVipContent() {
  return (
    <div className="mx-auto w-full max-w-[820px] space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">Grupos whatsapp</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Entra nos grupos certos para o teu momento. Alguns grupos são públicos e outros são
          exclusivos para membros VIP.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {GROUPS.map((g) => (
            <div
              key={g.id}
              className={`relative rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ${
                g.id === 'geral' ? 'md:col-span-2' : ''
              }`}
            >
              {!g.isPublic ? <VipCornerBadge /> : null}
              <div className="flex h-full flex-col items-center text-center">
                <WhatsAppLogo />

                <h2 className="mt-3 text-lg font-semibold text-zinc-900">{g.title}</h2>

                <p className="mt-3 text-sm leading-relaxed text-zinc-600">{g.description}</p>

                <div className="mt-6 w-full">
                  <CardButton
                    type="button"
                    variant="secondary"
                    fullWidth
                    className="border-transparent !bg-gradient-to-r !from-[#25D366] !to-[#128C7E] !text-white font-semibold hover:!from-[#1ebe5d] hover:!to-[#0b6d63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/40 focus-visible:ring-offset-2"
                    disabled={Boolean(g.comingSoon)}
                    onClick={() => {
                      // ainda não faz nada (link será adicionado depois)
                    }}
                  >
                    {g.comingSoon ? 'Em breve' : 'Quero entrar'}
                  </CardButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

