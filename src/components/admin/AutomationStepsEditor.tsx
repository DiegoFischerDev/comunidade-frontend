'use client';

import type { WhatsappClientAutomationStepType } from '@/lib/api';
import { resolveUploadsUrl } from '@/lib/resolve-uploads-url';

export type AutomationDraftStep = {
  key: string;
  type: WhatsappClientAutomationStepType;
  textContent: string;
  mediaUrl: string;
  mediaMimeType: string;
  mediaFileName: string;
  /** Pausa após o passo, em segundos (enviada à API em ms). */
  delaySeconds: number;
  uploading?: boolean;
};

const inputClass =
  'mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm text-foreground focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25';

export function newAutomationStepKey() {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function emptyAutomationDraftStep(
  type: WhatsappClientAutomationStepType = 'TEXT',
): AutomationDraftStep {
  return {
    key: newAutomationStepKey(),
    type,
    textContent: '',
    mediaUrl: '',
    mediaMimeType: '',
    mediaFileName: '',
    delaySeconds: 1,
  };
}

export function automationStepTypeLabel(
  type: WhatsappClientAutomationStepType,
): string {
  if (type === 'AUDIO') return 'Áudio';
  if (type === 'IMAGE') return 'Imagem';
  return 'Texto';
}

function mediaHref(url: string): string {
  if (url.startsWith('/brand/')) return url;
  return resolveUploadsUrl(url);
}

type Props = {
  steps: AutomationDraftStep[];
  disabled?: boolean;
  /** Se false, permite lista vazia (ex.: boas-vindas com fallback). Default true. */
  requireAtLeastOne?: boolean;
  onChange: (steps: AutomationDraftStep[]) => void;
  onUpload: (key: string, file: File) => void | Promise<void>;
};

export function AutomationStepsEditor({
  steps,
  disabled = false,
  requireAtLeastOne = true,
  onChange,
  onUpload,
}: Props) {
  function updateStep(key: string, patch: Partial<AutomationDraftStep>) {
    onChange(steps.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function moveStep(key: string, dir: -1 | 1) {
    const idx = steps.findIndex((s) => s.key === key);
    if (idx < 0) return;
    const next = idx + dir;
    if (next < 0 || next >= steps.length) return;
    const copy = [...steps];
    const tmp = copy[idx]!;
    copy[idx] = copy[next]!;
    copy[next] = tmp;
    onChange(copy);
  }

  function removeStep(key: string) {
    if (requireAtLeastOne && steps.length <= 1) return;
    onChange(steps.filter((s) => s.key !== key));
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">
          Sequência de resposta
        </span>
        <div className="flex flex-wrap gap-1.5">
          {(['TEXT', 'AUDIO', 'IMAGE'] as const).map((t) => (
            <button
              key={t}
              type="button"
              disabled={disabled}
              onClick={() => onChange([...steps, emptyAutomationDraftStep(t)])}
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-page disabled:opacity-60"
            >
              + {automationStepTypeLabel(t)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {steps.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-page px-3 py-4 text-sm text-muted">
            Sem passos. Adiciona texto, áudio ou imagem.
          </p>
        ) : null}

        {steps.map((s, idx) => (
          <div
            key={s.key}
            className="rounded-xl border border-border bg-page p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Passo {idx + 1} · {automationStepTypeLabel(s.type)}
              </p>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => moveStep(s.key, -1)}
                  disabled={disabled || idx === 0}
                  className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-semibold disabled:opacity-40"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveStep(s.key, 1)}
                  disabled={disabled || idx === steps.length - 1}
                  className="rounded-lg border border-border bg-card px-2 py-1 text-xs font-semibold disabled:opacity-40"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => removeStep(s.key)}
                  disabled={
                    disabled || (requireAtLeastOne && steps.length <= 1)
                  }
                  className="rounded-lg border border-red-200 bg-card px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-40"
                >
                  Remover
                </button>
              </div>
            </div>

            {s.type === 'TEXT' ? (
              <textarea
                value={s.textContent}
                onChange={(e) =>
                  updateStep(s.key, { textContent: e.target.value })
                }
                rows={5}
                className={`${inputClass} bg-card`}
                placeholder="Texto da mensagem…"
                disabled={disabled}
              />
            ) : (
              <div className="mt-2 space-y-2">
                <input
                  type="file"
                  accept={
                    s.type === 'AUDIO'
                      ? 'audio/ogg,audio/opus,audio/mpeg,audio/mp4,audio/*'
                      : 'image/jpeg,image/png,image/webp,image/*'
                  }
                  disabled={disabled || s.uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void onUpload(s.key, file);
                    e.target.value = '';
                  }}
                  className="block w-full text-xs text-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand-primary file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                />
                {s.uploading ? (
                  <p className="text-xs text-muted">A carregar…</p>
                ) : null}
                {s.mediaUrl ? (
                  <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                    <p className="truncate text-xs text-muted">
                      {s.mediaFileName || s.mediaUrl}
                    </p>
                    {s.type === 'AUDIO' ? (
                      <audio
                        key={s.mediaUrl}
                        controls
                        preload="metadata"
                        className="w-full"
                        src={mediaHref(s.mediaUrl)}
                      >
                        O teu browser não reproduz este áudio.
                      </audio>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element -- preview admin de URL dinâmica (/uploads ou /brand)
                      <img
                        key={s.mediaUrl}
                        src={mediaHref(s.mediaUrl)}
                        alt={s.mediaFileName || 'Pré-visualização'}
                        className="max-h-56 w-full rounded-lg object-contain bg-page"
                      />
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted">
                    Ou cola URL / caminho{' '}
                    <code className="text-[10px]">/brand/…</code> ou{' '}
                    <code className="text-[10px]">/uploads/…</code>
                  </p>
                )}
                <input
                  value={s.mediaUrl}
                  onChange={(e) =>
                    updateStep(s.key, { mediaUrl: e.target.value })
                  }
                  className={`${inputClass} bg-card text-xs`}
                  placeholder="/uploads/… ou https://…"
                  disabled={disabled}
                />
                {s.type === 'IMAGE' ? (
                  <input
                    value={s.textContent}
                    onChange={(e) =>
                      updateStep(s.key, {
                        textContent: e.target.value,
                      })
                    }
                    className={`${inputClass} bg-card`}
                    placeholder="Legenda (opcional)"
                    disabled={disabled}
                  />
                ) : null}
              </div>
            )}

            <label className="mt-2 block text-xs text-muted">
              Pausa após este passo (segundos)
              <input
                type="number"
                min={0}
                max={30}
                step={0.1}
                value={s.delaySeconds}
                onChange={(e) =>
                  updateStep(s.key, {
                    delaySeconds: Number(e.target.value) || 0,
                  })
                }
                className="mt-1 w-28 rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground"
                disabled={disabled}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
