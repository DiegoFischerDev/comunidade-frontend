import Image from 'next/image';
import { LoginWhatsappFields } from '@/components/auth/LoginWhatsappFields';
import { CardButton } from '@/components/ui/CardButton';

export type NewSupportTicketModalProps = {
  open: boolean;
  onClose: () => void;
  message: string;
  onMessageChange: (value: string) => void;
  onSend: () => void | Promise<void>;
  sending: boolean;
  sent: boolean;
  error: string;
  /** Visitante sem conta: pede nome e WhatsApp antes da mensagem. */
  collectGuestContact?: boolean;
  guestName?: string;
  guestWhatsapp?: string;
  onGuestNameChange?: (value: string) => void;
  onGuestWhatsappChange?: (value: string) => void;
  guestNameError?: string;
  guestWhatsappError?: string;
};

const SUBTITLE =
  'Escreve a tua mensagem (elogio, reclamação de parceiro ou bug do sistema).';

/**
 * Modal único para criar ticket (elogio, reclamação, bug) — usado no rodapé
 * do dashboard e na página "Reclame aqui".
 */
export function NewSupportTicketModal({
  open,
  onClose,
  message,
  onMessageChange,
  onSend,
  sending,
  sent,
  error,
  collectGuestContact = false,
  guestName = '',
  guestWhatsapp = '',
  onGuestNameChange,
  onGuestWhatsappChange,
  guestNameError,
  guestWhatsappError,
}: NewSupportTicketModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4"
      role="presentation"
      onClick={() => !sending && onClose()}
    >
      <div
        className="my-8 w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="relative h-12 w-12 shrink-0">
              <Image
                src="/services2.png"
                alt=""
                fill
                className="object-contain"
                sizes="48px"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-zinc-900" id="new-ticket-title">
                Reclame aqui
              </h2>
              <p className="mt-1 text-sm text-zinc-600" id="new-ticket-desc">
                {SUBTITLE}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-200 text-xs text-zinc-500 hover:bg-zinc-50 disabled:opacity-50"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        {error ? (
          <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </div>
        ) : null}

        {sent ? (
          <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Mensagem enviada. Obrigado por compartilhar com a gente!
          </div>
        ) : null}

        {collectGuestContact && !sent ? (
          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-zinc-700" htmlFor="new-ticket-guest-name">
                Nome
              </label>
              <input
                id="new-ticket-guest-name"
                type="text"
                value={guestName}
                onChange={(e) => onGuestNameChange?.(e.target.value)}
                disabled={sending}
                autoComplete="name"
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                placeholder="O teu nome"
              />
              {guestNameError ? (
                <p className="mt-1 text-xs text-red-600">{guestNameError}</p>
              ) : null}
            </div>
            <LoginWhatsappFields
              idPrefix="new-ticket-guest"
              label="Telefone / WhatsApp"
              value={guestWhatsapp}
              error={guestWhatsappError}
              onChange={(v) => onGuestWhatsappChange?.(v)}
              disabled={sending}
            />
          </div>
        ) : null}

        <div className="mt-4">
          <label
            className="block text-sm font-medium text-zinc-700"
            htmlFor="new-ticket-message"
          >
            Mensagem
          </label>
          <textarea
            id="new-ticket-message"
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            rows={7}
            disabled={sending || sent}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            placeholder="Escreve aqui…"
            aria-labelledby="new-ticket-title"
            aria-describedby="new-ticket-desc"
          />
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <CardButton
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={sending}
          >
            {sent ? 'Fechar' : 'Cancelar'}
          </CardButton>
          <CardButton
            type="button"
            variant="primary"
            onClick={() => void onSend()}
            loading={sending}
            disabled={sent}
          >
            Enviar
          </CardButton>
        </div>
      </div>
    </div>
  );
}
