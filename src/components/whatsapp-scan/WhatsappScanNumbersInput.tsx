'use client';

import { useState } from 'react';

function parseNumbers(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.replace(/\D+/g, ''))
    .filter((s) => s.length > 0);
}

/** Lista de números + input com botão «Adicionar»; cada linha tem botão para remover. */
export function WhatsappScanNumbersInput({
  value,
  onChange,
  variant = 'amber',
}: {
  value: string[];
  onChange: (next: string[]) => void;
  variant?: 'amber' | 'blue';
}) {
  const [draft, setDraft] = useState('');

  const addBtnClass =
    variant === 'blue'
      ? 'bg-brand-primary text-white hover:bg-brand-primary-dark'
      : 'bg-brand-primary text-white hover:bg-brand-primary-dark';
  const removeBtnClass =
    variant === 'blue'
      ? 'text-muted hover:bg-primary-1 hover:text-red-600'
      : 'text-muted hover:bg-primary-1 hover:text-red-600';

  const addFromDraft = () => {
    const parts = parseNumbers(draft);
    if (parts.length === 0) {
      setDraft('');
      return;
    }
    onChange(Array.from(new Set([...value, ...parts])));
    setDraft('');
  };

  const remove = (n: string) => onChange(value.filter((v) => v !== n));

  return (
    <div className="rounded-lg border border-border bg-card">
      {value.length > 0 ? (
        <ul className="divide-y divide-zinc-100 border-b border-border/60">
          {value.map((n) => (
            <li
              key={n}
              className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-foreground"
            >
              <span className="font-mono tabular-nums">+{n}</span>
              <button
                type="button"
                onClick={() => remove(n)}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-base leading-none ${removeBtnClass}`}
                aria-label={`Remover ${n}`}
                title="Remover"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="border-b border-border/60 px-3 py-2 text-xs text-muted">
          Nenhum número na lista — serão monitorizadas todas as mensagens do grupo.
        </p>
      )}

      <div className="flex gap-2 p-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addFromDraft();
            }
          }}
          inputMode="numeric"
          placeholder="Ex.: 351912345678"
          className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/25"
        />
        <button
          type="button"
          onClick={addFromDraft}
          className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${addBtnClass}`}
          disabled={!draft.trim()}
        >
          Adicionar
        </button>
      </div>
    </div>
  );
}
