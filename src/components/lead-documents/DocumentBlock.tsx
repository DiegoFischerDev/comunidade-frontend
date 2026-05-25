'use client';

import { useRef } from 'react';
import {
  ACCEPTED_FILE_TYPES,
  bytesToHumanReadable,
  type DocFieldName,
} from '@/lib/lead-documents';

type Props = {
  index: number;
  fieldName: DocFieldName;
  label: string;
  description: string;
  file: File | null;
  onPick: (file: File) => void;
  onRemove: () => void;
  uploading: boolean;
  error: string | null;
};

/** Card de um documento — mostra estado "Anexado" + ações ver / trocar / remover. */
export function DocumentBlock({
  index,
  fieldName,
  label,
  description,
  file,
  onPick,
  onRemove,
  uploading,
  error,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isAttached = !!file;

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) onPick(picked);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleView() {
    if (!file) return;
    const url = URL.createObjectURL(file);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <div
      className={`rounded-2xl border p-4 transition ${
        isAttached
          ? 'border-emerald-300 bg-emerald-50/60'
          : 'border-zinc-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900">
            {index}. {label}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-zinc-600">{description}</p>
        </div>
        {isAttached ? (
          <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
            Anexado
          </span>
        ) : null}
      </div>

      {file ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="break-all text-zinc-700">
            {file.name}{' '}
            <span className="text-zinc-500">({bytesToHumanReadable(file.size)})</span>
          </span>
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs font-medium text-red-700">{error}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES}
          onChange={handlePick}
          className="hidden"
          aria-label={`Selecionar ${label}`}
          data-field={fieldName}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50 disabled:cursor-wait disabled:opacity-60"
        >
          {isAttached ? 'Trocar ficheiro' : 'Anexar ficheiro'}
        </button>
        {isAttached ? (
          <>
            <button
              type="button"
              onClick={handleView}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
            >
              Ver
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="inline-flex items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
            >
              Remover
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
