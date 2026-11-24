'use client';

import { useMemo, useState } from 'react';
import {
  api,
  getUserFacingApiError,
  type AdminChatbotSlug,
} from '@/lib/api';
import { toast } from '@/lib/toast';

const CRM_TRANSFER_TARGETS: Array<{
  slug: AdminChatbotSlug;
  label: string;
}> = [
  { slug: 'joana', label: 'Joana / Relocation' },
  { slug: 'bruna', label: 'Bruna / Crédito' },
  { slug: 'gabi', label: 'Gabi / Publicidade' },
  { slug: 'outros', label: 'Outros / Assuntos gerais' },
];

type Props = {
  sourceSlug: AdminChatbotSlug;
  sourceId: string;
  disabled?: boolean;
  onTransferred: (result: {
    targetSlug: AdminChatbotSlug;
    targetId: string;
  }) => void;
};

export function CrmTransferToBotControls({
  sourceSlug,
  sourceId,
  disabled = false,
  onTransferred,
}: Props) {
  const options = useMemo(
    () => CRM_TRANSFER_TARGETS.filter((bot) => bot.slug !== sourceSlug),
    [sourceSlug],
  );
  const [targetSlug, setTargetSlug] = useState<AdminChatbotSlug>(
    options[0]?.slug ?? 'joana',
  );
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const targetLabel =
    CRM_TRANSFER_TARGETS.find((bot) => bot.slug === targetSlug)?.label ??
    targetSlug;

  async function handleTransfer() {
    if (busy || disabled) return;
    setBusy(true);
    try {
      const result = await api.admin.chatbots.crm.transferLead({
        sourceSlug,
        sourceId,
        targetSlug,
      });
      toast.success(`Lead enviado para ${targetLabel}.`);
      setConfirming(false);
      onTransferred({
        targetSlug: result.targetSlug,
        targetId: result.targetId,
      });
    } catch (err) {
      toast.error(
        getUserFacingApiError(err, { context: 'Ao enviar o lead para outro CRM' }),
      );
    } finally {
      setBusy(false);
    }
  }

  if (options.length === 0) return null;

  return (
    <div className="mt-4 rounded-xl border border-border bg-page/60 px-3 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
        Enviar para outro CRM
      </p>
      <p className="mt-1 text-xs text-muted">
        O lead sai deste board e entra no CRM escolhido. O histórico de chat
        mantém-se.
      </p>
      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="block min-w-0 flex-1 text-sm font-medium text-foreground">
          <span className="sr-only">CRM de destino</span>
          <select
            value={targetSlug}
            disabled={disabled || busy || confirming}
            onChange={(event) => {
              setTargetSlug(event.target.value as AdminChatbotSlug);
              setConfirming(false);
            }}
            className="mt-0 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm disabled:opacity-50"
          >
            {options.map((bot) => (
              <option key={bot.slug} value={bot.slug}>
                {bot.label}
              </option>
            ))}
          </select>
        </label>
        {!confirming ? (
          <button
            type="button"
            disabled={disabled || busy}
            onClick={() => setConfirming(true)}
            className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center rounded-[14px] border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
          >
            Enviar
          </button>
        ) : (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="inline-flex min-h-10 cursor-pointer items-center rounded-[14px] border border-border bg-card px-3 text-sm font-medium text-foreground disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleTransfer()}
              className="inline-flex min-h-10 cursor-pointer items-center rounded-[14px] bg-brand-primary px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'A enviar…' : `Confirmar → ${targetLabel}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
