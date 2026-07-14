'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

type RafacallAvailabilityPayload = Awaited<
  ReturnType<typeof api.rafacall.guestAvailability>
>;

function prettyYmdPt(ymd: string, timeZone: string): string {
  const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return ymd;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utcMidday = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return utcMidday.toLocaleDateString('pt-PT', {
    timeZone,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

function hmInTz(utcIso: string, timeZone: string): string {
  const date = new Date(utcIso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatSlotTimeInTz(utcIso: string, timeZone: string): string {
  const date = new Date(utcIso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('pt-PT', { timeZone, hour: '2-digit', minute: '2-digit' });
}

function AvailabilityGridSection({
  tz,
  availability,
  selectedDate,
  manualDate,
  manualTime,
  disabled,
  onDateChange,
  onSlotSelect,
}: {
  tz: string;
  availability: RafacallAvailabilityPayload;
  selectedDate: string;
  manualDate: string;
  manualTime: string;
  disabled?: boolean;
  onDateChange: (date: string) => void;
  onSlotSelect: (slot: { startsAt: string; endsAt: string }) => void;
}) {
  const daySlots = availability.days.find((day) => day.date === selectedDate)?.slots ?? [];

  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Dia</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {availability.days
            .filter((day) => day.slots.length > 0)
            .map((day) => (
              <button
                key={day.date}
                type="button"
                disabled={disabled}
                onClick={() => onDateChange(day.date)}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  selectedDate === day.date
                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                    : 'border-border bg-card text-foreground hover:bg-page'
                }`}
              >
                {prettyYmdPt(day.date, tz)}
              </button>
            ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Horário</p>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {daySlots.map((slot) => {
            const slotTime = hmInTz(slot.startsAt, tz);
            const isSelected = manualDate === selectedDate && manualTime === slotTime;
            return (
              <button
                key={slot.startsAt}
                type="button"
                disabled={disabled}
                onClick={() => onSlotSelect(slot)}
                className={`cursor-pointer rounded-xl border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  isSelected
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                    : 'border-border bg-card text-foreground hover:bg-page'
                }`}
              >
                {formatSlotTimeInTz(slot.startsAt, tz)}
              </button>
            );
          })}
        </div>
        {daySlots.length === 0 ? (
          <p className="mt-2 text-xs text-muted">Sem horários neste dia.</p>
        ) : null}
      </div>
    </div>
  );
}

function ManualSlotFields({
  idPrefix,
  date,
  time,
  timeZone,
  disabled,
  onDateChange,
  onTimeChange,
}: {
  idPrefix: string;
  date: string;
  time: string;
  timeZone: string;
  disabled?: boolean;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label
          className="block text-xs font-medium uppercase tracking-wide opacity-80"
          htmlFor={`${idPrefix}-date`}
        >
          Data
        </label>
        <input
          id={`${idPrefix}-date`}
          type="date"
          value={date}
          disabled={disabled}
          onChange={(event) => onDateChange(event.target.value)}
          className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-brand-primary disabled:opacity-50"
        />
      </div>
      <div>
        <label
          className="block text-xs font-medium uppercase tracking-wide opacity-80"
          htmlFor={`${idPrefix}-time`}
        >
          Hora
        </label>
        <input
          id={`${idPrefix}-time`}
          type="time"
          value={time}
          disabled={disabled}
          onChange={(event) => onTimeChange(event.target.value)}
          className="mt-2 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-brand-primary disabled:opacity-50"
        />
      </div>
      <p className="text-xs text-muted sm:col-span-2">
        Horário livre em {timeZone}.
      </p>
    </div>
  );
}

export function AdminVideoCallSlotPicker({
  idPrefix,
  tz,
  availability,
  isLoadingAvailability,
  selectedDate,
  manualDate,
  manualTime,
  disabled,
  onDateChange,
  onSlotSelect,
  onManualDateChange,
  onManualTimeChange,
}: {
  idPrefix: string;
  tz: string;
  availability: RafacallAvailabilityPayload | null;
  isLoadingAvailability: boolean;
  selectedDate: string;
  manualDate: string;
  manualTime: string;
  disabled?: boolean;
  onDateChange: (date: string) => void;
  onSlotSelect: (slot: { startsAt: string; endsAt: string }) => void;
  onManualDateChange: (value: string) => void;
  onManualTimeChange: (value: string) => void;
}) {
  const [useManualMode, setUseManualMode] = useState(false);

  if (isLoadingAvailability) {
    return <p className="text-xs text-muted">A carregar horários…</p>;
  }

  if (!availability) {
    return (
      <p className="text-xs text-muted">
        Não foi possível carregar os horários disponíveis.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {useManualMode ? (
        <>
          <ManualSlotFields
            idPrefix={idPrefix}
            date={manualDate}
            time={manualTime}
            timeZone={tz}
            disabled={disabled}
            onDateChange={onManualDateChange}
            onTimeChange={onManualTimeChange}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => setUseManualMode(false)}
            className="inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-page disabled:cursor-not-allowed disabled:opacity-50"
          >
            Voltar à grelha
          </button>
        </>
      ) : (
        <>
          <AvailabilityGridSection
            tz={tz}
            availability={availability}
            selectedDate={selectedDate}
            manualDate={manualDate}
            manualTime={manualTime}
            disabled={disabled}
            onDateChange={onDateChange}
            onSlotSelect={onSlotSelect}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => setUseManualMode(true)}
            className="inline-flex min-h-9 cursor-pointer items-center rounded-lg border border-sky-200 bg-sky-50/80 px-3 text-xs font-medium text-sky-900 transition-colors hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Outros horários
          </button>
        </>
      )}
    </div>
  );
}
