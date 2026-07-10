'use client';

import { SITE_NAME_FULL } from '@/lib/site-branding';

type MembershipTermsModalProps = {
  open: boolean;
  onClose: () => void;
};

export function MembershipTermsModal({ open, onClose }: MembershipTermsModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto brand-modal-scrim p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="membership-terms-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="my-8 w-full max-w-lg rounded-2xl bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <h2
            id="membership-terms-title"
            className="text-base font-semibold text-foreground"
          >
            Termos da {SITE_NAME_FULL}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border text-xs text-muted hover:bg-page"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 max-h-[min(70vh,32rem)] space-y-4 overflow-y-auto pr-1 text-sm leading-relaxed text-foreground/90">
          <p>
            Ao aderir como <strong className="font-medium text-foreground">membro VIP</strong> da{' '}
            {SITE_NAME_FULL}, aceitas as condições abaixo. Este resumo não substitui
            aconselhamento jurídico; em caso de dúvida, contacta-nos pelos canais de suporte da
            plataforma.
          </p>

          <section className="space-y-2">
            <h3 className="font-semibold text-foreground">1. Objeto e duração</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                A anuidade concede acesso às funcionalidades reservadas a membros VIP durante{' '}
                <strong className="font-medium text-foreground">12 meses</strong>, contados a partir
                da confirmação do pagamento.
              </li>
              <li>
                O acesso é pessoal e intransmissível, associado à conta criada no momento da
                adesão (e-mail, WhatsApp e credenciais definidas por ti).
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-foreground">2. Pagamento</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                O pagamento é processado de forma segura pela{' '}
                <strong className="font-medium text-foreground">Stripe</strong> (cartão, MB WAY ou
                Pix, conforme disponível).
              </li>
              <li>
                Após confirmação do pagamento, a conta de membro é ativada automaticamente na
                plataforma.
              </li>
              <li>
                Valores, moeda e impostos aplicáveis são os apresentados no checkout no momento
                do pagamento.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-foreground">3. Utilização da comunidade</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Comprometes-te a usar a plataforma e os canais da comunidade (incluindo grupos
                WhatsApp, quando aplicável) de forma respeitosa e em conformidade com a lei.
              </li>
              <li>
                Conteúdos, orientações e materiais disponibilizados têm carácter informativo e de
                apoio à comunidade; não constituem aconselhamento jurídico, fiscal ou financeiro
                personalizado.
              </li>
              <li>
                Reservamo-nos o direito de suspender ou encerrar o acesso em caso de violação
                grave destes termos ou de conduta que prejudique outros membros.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-foreground">4. Renovação e cancelamento</h3>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Findo o período da anuidade, o acesso às áreas de membro pode ser limitado até
                nova renovação.
              </li>
              <li>
                Pedidos de reembolso após pagamento confirmado serão analisados caso a caso,
                nos termos da legislação aplicável e da política comercial em vigor.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-semibold text-foreground">5. Dados pessoais</h3>
            <p>
              Os dados fornecidos no registo e no pagamento são tratados para gestão da conta,
              comunicação e cumprimento legal. Para mais informação, consulta a{' '}
              <a
                href="/privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-brand-primary underline-offset-2 hover:underline"
              >
                política de privacidade
              </a>
              .
            </p>
          </section>

          <p className="text-xs text-muted">Última atualização: maio de 2026.</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-5 flex w-full cursor-pointer items-center justify-center rounded-full bg-brand-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-primary-dark"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
