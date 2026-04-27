'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { OPEN_MEMBERSHIP_MODAL_EVENT } from '@/components/FloatingWhatsAppButton';
import { OPEN_AUTH_LOGIN_EVENT } from '@/lib/auth-ui-events';
import { CardButton } from '@/components/ui/CardButton';

export type FlagCode = 'pt' | 'br';

export type VipGroup = {
  id: string;
  title: string;
  /** Segunda linha, mais pequena, por baixo do título. */
  subtitle?: string;
  /** Bandeira antes do nome ( /public/flags/*_round.png ). */
  titleFlag?: FlagCode;
  description: string;
  isPublic: boolean;
  joinUrl?: string;
  comingSoon?: boolean;
  /**
   * Grupo exclusivo: não mostra o link; ao clicar em "Quero entrar" exige
   * utilizador com sessão e `tier === MEMBER`.
   */
  memberOnlyVip?: boolean;
};

function VipGroupTitleFlag({ code, size = 'row' }: { code: FlagCode; size?: 'row' | 'hero' }) {
  if (size === 'hero') {
    return (
      <Image
        src={code === 'pt' ? '/flags/portugal_round.png' : '/flags/brasil_round.png'}
        alt=""
        unoptimized
        width={56}
        height={56}
        className="h-14 w-14 shrink-0 rounded-full object-cover object-center"
        priority={false}
      />
    );
  }
  return (
    <Image
      src={code === 'pt' ? '/flags/portugal_round.png' : '/flags/brasil_round.png'}
      alt=""
      unoptimized
      width={20}
      height={20}
      className="inline-block h-3.5 w-3.5 shrink-0 rounded-full object-cover"
    />
  );
}

function CopyLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function VipGroupLinkCopy({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mx-auto mt-4 w-full min-w-0 max-w-md px-0.5">
      <p className="mb-1 text-center text-xs font-medium text-zinc-500">Link do grupo</p>
      <div className="flex w-full min-w-0 items-stretch overflow-hidden rounded-md border border-zinc-200 bg-zinc-50/90">
        <p className="min-w-0 flex-1 break-all px-2.5 py-1.5 text-left text-[0.55rem] leading-snug text-zinc-700 sm:text-[0.625rem]">
          {url}
        </p>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2000);
            } catch {
              /* ignore */
            }
          }}
          className="flex h-auto shrink-0 cursor-pointer items-center border-l border-zinc-200 bg-white px-2.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          aria-label={copied ? 'Link copiado' : 'Copiar link do grupo'}
        >
          {copied ? <CheckLinkIcon className="h-4 w-4 text-emerald-600" /> : <CopyLinkIcon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

/** Pequeno ícone WhatsApp ao lado do subtítulo (não no botão). */
function WhatsappBySubtitle({ compact }: { compact?: boolean }) {
  return (
    <Image
      src="/whatsapp.png"
      alt=""
      width={compact ? 18 : 22}
      height={compact ? 18 : 22}
      className={compact ? 'h-4 w-4 shrink-0 object-contain' : 'h-5 w-5 shrink-0 object-contain'}
      priority={false}
    />
  );
}

/** Título (maior) + subtítulo (menor) opcional; bandeira alinhada à linha do título. */
export function VipGroupTitle({
  group,
  variant = 'card',
  className,
}: {
  group: VipGroup;
  variant?: 'card' | 'row';
  className?: string;
}) {
  const st = group.subtitle;
  const hasSt = Boolean(st);
  const row = 'inline-flex w-full min-w-0 items-center gap-1.5';
  if (variant === 'row') {
    return (
      <div className={className ? `${row} ${className}` : row}>
        {group.titleFlag ? <VipGroupTitleFlag code={group.titleFlag} /> : null}
        <div className="flex min-w-0 w-full flex-1 items-center gap-1.5 text-sm">
          <span className="min-w-0 flex-1 basis-0 truncate font-semibold leading-tight text-zinc-900">
            {group.title}
          </span>
          {hasSt && (
            <span
              className="flex min-w-0 max-w-[min(11.5rem,40%)] shrink-0 items-center gap-1.5 text-xs font-medium leading-tight text-zinc-500"
            >
              <WhatsappBySubtitle compact />
              <span className="min-w-0 flex-1 truncate">{st}</span>
            </span>
          )}
        </div>
      </div>
    );
  }

  const textRoot = `w-full min-w-0 text-center text-zinc-900${className ? ` ${className}` : ''}`;
  return (
    <div className={textRoot}>
      <div className="text-lg font-semibold leading-tight text-zinc-900">{group.title}</div>
      {hasSt && (
        <div className="mt-0.5 flex w-full min-w-0 max-w-full items-center justify-center gap-2 text-sm font-medium text-zinc-500">
          <WhatsappBySubtitle />
          <span className="min-w-0 truncate">{st}</span>
        </div>
      )}
    </div>
  );
}

export const GROUPS: VipGroup[] = [
  {
    id: 'geral',
    title: 'Comunidade Rafa Portugal',
    subtitle: 'Geral',
    titleFlag: 'pt',
    description: 'Grupo aberto para tratar de assuntos relacionados a imigração para Portugal.',
    isPublic: true,
    joinUrl: 'https://chat.whatsapp.com/FOsUUXtA3z57qaLX7oBkdb?mode=gi_t',
  },
  {
    id: 'rpm-brasil',
    title: 'VIP - Rafa Portugal',
    subtitle: 'fase 1 - Brasil',
    titleFlag: 'br',
    description:
      'Para membros que ainda estao no brasil.',
    isPublic: false,
    joinUrl: 'https://chat.whatsapp.com/KV8al94ZUzMLC8ORLKxnrq?mode=gi_t',
    memberOnlyVip: true,
  },
  {
    id: 'rpm-portugal',
    title: 'VIP - Rafa Portugal',
    subtitle: 'fase 2 - Portugal',
    titleFlag: 'pt',
    description:
      'Para membros que ja estao em Portugal.',
    isPublic: false,
    joinUrl: 'https://chat.whatsapp.com/E3WgVeBAUylHwLjsrILLlX?mode=gi_t',
    memberOnlyVip: true,
  },
  {
    id: 'rpm-alugueis',
    title: 'Casas para Relocation',
    subtitle: 'Aluguel',
    titleFlag: 'pt',
    description:
      'Grupo onde sao postados semalmente os imoveis disponiveis para Arrendamento (aluguel) onde a maioria ainda nao foi publicado nos sites de busca.',
    isPublic: false,
    joinUrl: 'https://chat.whatsapp.com/Kt4ylOIU0qMBbtfHKlyvVt?mode=gi_t',
  },
  {
    id: 'rpm-compra-imoveis',
    title: 'Casas para Compra',
    subtitle: 'Financiamento',
    titleFlag: 'pt',
    description:
      'Grupo onde sao postados semanalmente os imoveis disponiveis para venda onde a maioria ainda nao foi publicados nos sites de busca.',
    isPublic: false,
    joinUrl: 'https://chat.whatsapp.com/L5Lo18rPzut7lF6BFO0i67?mode=gi_t',
  },
  {
    id: 'compra-automovel',
    title: 'Compra de automóveis',
    titleFlag: 'pt',
    description:
      'Grupo para trocar dicas e oportunidades de compra de automóvel em Portugal, com recomendações e alertas do que evitar.',
    isPublic: false,
    comingSoon: true,
  },
];

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
  const { user } = useAuth();

  const goToGroup = (g: (typeof GROUPS)[number]) => {
    if (g.comingSoon) return;
    if (!g.joinUrl) return;
    if (typeof window === 'undefined') return;
    if (g.memberOnlyVip) {
      if (!user) {
        window.dispatchEvent(new Event(OPEN_AUTH_LOGIN_EVENT));
        return;
      }
      if (user.tier !== 'MEMBER') {
        window.dispatchEvent(new Event(OPEN_MEMBERSHIP_MODAL_EVENT));
        return;
      }
    }
    window.open(g.joinUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="mx-auto w-full max-w-[820px] space-y-5">
      <div>
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
              {!g.isPublic &&
              g.id !== 'rpm-alugueis' &&
              g.id !== 'rpm-compra-imoveis' &&
              g.id !== 'compra-automovel' ? (
                <VipCornerBadge />
              ) : null}
              <div className="flex h-full w-full min-w-0 flex-col items-center text-center">
                {g.titleFlag ? <VipGroupTitleFlag code={g.titleFlag} size="hero" /> : null}

                <h2 className="mt-3 w-full min-w-0 self-stretch px-0.5 text-zinc-900">
                  <VipGroupTitle group={g} variant="card" />
                </h2>

                <p className="mt-3 text-sm leading-relaxed text-zinc-600">{g.description}</p>

                {g.joinUrl && !g.memberOnlyVip ? <VipGroupLinkCopy url={g.joinUrl} /> : null}

                <div className="mx-auto mt-6 w-full max-w-xs">
                  <CardButton
                    type="button"
                    variant="outline"
                    fullWidth
                    className={[
                      'inline-flex !rounded-md !border-0 !px-4 !py-2.5 !font-medium !tracking-tight !text-white',
                      '!bg-[#1a9c4a] !shadow-sm !shadow-zinc-900/10',
                      'transition-[background-color,box-shadow] duration-200 ease-out',
                      'hover:!bg-[#178a41] hover:!shadow-md hover:!shadow-zinc-900/12',
                      'active:!bg-[#147a39]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a9c4a]/40 focus-visible:ring-offset-1',
                      'disabled:!cursor-not-allowed disabled:!bg-stone-300 disabled:!text-stone-500 disabled:!shadow-none',
                      'disabled:hover:!bg-stone-300 disabled:hover:!shadow-none',
                      'disabled:!opacity-100',
                    ].join(' ')}
                    disabled={Boolean(g.comingSoon)}
                    onClick={() => goToGroup(g)}
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

