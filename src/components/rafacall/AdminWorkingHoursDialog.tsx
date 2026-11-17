'use client';

import { useEffect, useId, useState } from 'react';
import { api, getUserFacingApiError } from '@/lib/api';
import { toast } from '@/lib/toast';

type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type Range = { start: string; end: string };
type Days = Record<WeekdayKey, Range[]>;

type Settings = {
  timezone: string;
  durationMinutes: number;
  bufferMinutes: number;
  days: Days;
};

const WEEKDAYS: { key: WeekdayKey; label: string }[] = [
  { key: 'mon', label: 'Segunda' },
  { key: 'tue', label: 'Terça' },
  { key: 'wed', label: 'Quarta' },
  { key: 'thu', label: 'Quinta' },
  { key: 'fri', label: 'Sexta' },
  { key: 'sat', label: 'Sábado' },
  { key: 'sun', label: 'Domingo' },
];

const EMPTY_DAYS: Days = {
  mon: [],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
  sun: [],
};

const SUGGESTED_RANGE: Range = { start: '16:00', end: '18:20' };
const MAX_RANGES = 4;

function hmToMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function slotCount(range: Range, duration: number, buffer: number): number {
  const start = hmToMinutes(range.start);
  const end = hmToMinutes(range.end);
  if (start == null || end == null || end <= start || duration <= 0) return 0;
  const step = duration + Math.max(0, buffer);
  let count = 0;
  for (let cursor = start; cursor + duration <= end; cursor += step) count += 1;
  return count;
}

function timezoneCaption(timezone: string): string {
  if (timezone === 'Europe/Lisbon') return 'horário de Lisboa';
  return timezone;
}

function cloneDays(days: Days): Days {
  const copy = { ...EMPTY_DAYS };
  for (const { key } of WEEKDAYS) {
    copy[key] = days[key].map((range) => ({ ...range }));
  }
  return copy;
}

export function AdminWorkingHoursDialog({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const titleId = useId();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [days, setDays] = useState<Days>(EMPTY_DAYS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setSettings(null);
    void api.admin.rafacall
      .workingHours()
      .then((result) => {
        if (cancelled) return;
        setSettings(result);
        setDays(cloneDays(result.days));
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(getUserFacingApiError(cause, { context: 'Ao carregar horários' }));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, saving]);

  if (!open) return null;

  const duration = settings?.durationMinutes ?? 15;
  const buffer = settings?.bufferMinutes ?? 10;

  const updateRange = (key: WeekdayKey, index: number, patch: Partial<Range>) => {
    setDays((current) => ({
      ...current,
      [key]: current[key].map((range, rangeIndex) =>
        rangeIndex === index ? { ...range, ...patch } : range,
      ),
    }));
  };

  const openDay = (key: WeekdayKey) => {
    const template =
      WEEKDAYS.map(({ key: day }) => days[day][0]).find((range) => range?.start && range.end) ??
      SUGGESTED_RANGE;
    setDays((current) => ({ ...current, [key]: [{ ...template }] }));
  };

  const addRange = (key: WeekdayKey) => {
    setDays((current) => {
      const existing = current[key];
      if (existing.length >= MAX_RANGES) return current;
      const last = existing[existing.length - 1];
      const lastEnd = last ? hmToMinutes(last.end) : null;
      const startMinutes = lastEnd == null ? 16 * 60 : lastEnd + buffer;
      const endMinutes = Math.min(startMinutes + 60, 23 * 60 + 59);
      const toHm = (total: number) =>
        `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
      return {
        ...current,
        [key]: [
          ...existing,
          {
            start: toHm(Math.min(startMinutes, 23 * 60)),
            end: toHm(Math.max(endMinutes, Math.min(startMinutes + duration, 23 * 60 + 59))),
          },
        ],
      };
    });
  };

  const removeRange = (key: WeekdayKey, index: number) => {
    setDays((current) => ({
      ...current,
      [key]: current[key].filter((_, rangeIndex) => rangeIndex !== index),
    }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      await api.admin.rafacall.updateWorkingHours(days);
      toast.success('Horários da agenda atualizados.');
      onSaved();
      onClose();
    } catch (cause) {
      setError(getUserFacingApiError(cause, { context: 'Ao guardar horários' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-foreground">
              Horários das chamadas
            </h2>
            <p className="mt-1 text-sm text-muted">
              Dias e horas em que os clientes podem marcar. Cada chamada dura {duration} min
              {buffer > 0 ? `, com ${buffer} min de intervalo` : ''}. Horas em{' '}
              {timezoneCaption(settings?.timezone ?? 'Europe/Lisbon')}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-sm text-muted hover:bg-page hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? <p className="mt-6 text-sm text-muted">A carregar horários…</p> : null}

        {!loading && settings ? (
          <div className="mt-4 divide-y divide-border">
            {WEEKDAYS.map(({ key, label }) => {
              const ranges = days[key];
              return (
                <div key={key} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    {ranges.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => openDay(key)}
                        className="inline-flex min-h-11 cursor-pointer items-center rounded-[14px] border border-border bg-card px-3 text-sm font-medium text-foreground hover:bg-page"
                      >
                        Abrir este dia
                      </button>
                    ) : (
                      <span className="text-xs text-muted">
                        {ranges.reduce((sum, range) => sum + slotCount(range, duration, buffer), 0)}{' '}
                        horários
                      </span>
                    )}
                  </div>
                  {ranges.map((range, index) => (
                    <div key={`${key}-${index}`} className="mt-2 flex flex-wrap items-end gap-2">
                      <label className="text-xs text-muted">
                        Início
                        <input
                          type="time"
                          value={range.start}
                          aria-label={`${label}, início do intervalo ${index + 1}`}
                          onChange={(event) => updateRange(key, index, { start: event.target.value })}
                          className="mt-1 block min-h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-brand-primary"
                        />
                      </label>
                      <label className="text-xs text-muted">
                        Fim
                        <input
                          type="time"
                          value={range.end}
                          aria-label={`${label}, fim do intervalo ${index + 1}`}
                          onChange={(event) => updateRange(key, index, { end: event.target.value })}
                          className="mt-1 block min-h-11 rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-brand-primary"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeRange(key, index)}
                        className="inline-flex min-h-11 cursor-pointer items-center rounded-[14px] px-2 text-sm text-muted hover:text-foreground"
                      >
                        Remover
                      </button>
                    </div>
                  ))}
                  {ranges.length > 0 && ranges.length < MAX_RANGES ? (
                    <button
                      type="button"
                      onClick={() => addRange(key)}
                      className="mt-2 cursor-pointer text-sm font-medium text-brand-primary hover:opacity-80"
                    >
                      Adicionar intervalo
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}

        <p className="mt-2 text-xs text-muted">
          Chamadas já marcadas mantêm-se. A nova grelha vale para marcações a partir de agora.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || loading || !settings}
            className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-[14px] bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'A guardar…' : 'Guardar horários'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-[14px] border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
