"use client";

import { type Ref, useEffect, useRef, useState } from "react";

import {
  LOGIN_COUNTRY_CUSTOM_SELECT,
  LOGIN_COUNTRY_DIALS,
  isPresetCountryDial,
  loginPhoneDigitsOnly,
  parseFullDigitsToDialLocal,
  persistLoginPhonePartsToStorage,
  readDialAndLocalFromStorageAndValue,
} from "@/lib/login-phone-storage";

type Props = {
  idPrefix: string;
  value: string;
  onChange: (fullDigits: string) => void;
  disabled?: boolean;
  /** Por defeito: "WhatsApp". */
  label?: string;
  /** Mensagem de erro (checkout). */
  error?: string;
  /** Ref do contentor para scroll/focus em validação. */
  fieldRef?: Ref<HTMLDivElement>;
};

/**
 * País (dropdown) + número local. Lembra país e dígitos em localStorage (sem senha).
 */
export function LoginWhatsappFields({
  idPrefix,
  value,
  onChange,
  disabled,
  label = "WhatsApp",
  error,
  fieldRef,
}: Props) {
  const hasError = Boolean(error);
  const [dial, setDial] = useState(LOGIN_COUNTRY_DIALS[0]!.dial);
  const [local, setLocal] = useState("");
  const [ready, setReady] = useState(false);
  const dialRef = useRef(dial);
  dialRef.current = dial;

  useEffect(() => {
    const { dial: d, local: l } = readDialAndLocalFromStorageAndValue(value);
    setDial(d);
    setLocal(l);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!isPresetCountryDial(dialRef.current)) {
      return;
    }
    const v = loginPhoneDigitsOnly(value);
    if (!v) return;
    const p = parseFullDigitsToDialLocal(
      v,
      LOGIN_COUNTRY_DIALS[0]!.dial,
      dialRef.current,
    );
    setDial(p.dial);
    setLocal(p.local);
  }, [value, ready]);

  useEffect(() => {
    if (!ready) return;
    const full = dial + loginPhoneDigitsOnly(local);
    onChange(full);
    persistLoginPhonePartsToStorage(dial, local);
  }, [ready, dial, local, onChange]);

  const selectId = `${idPrefix}-country`;
  const localId = `${idPrefix}-whatsapp-local`;
  const customDialId = `${idPrefix}-custom-dial`;

  const isCustom = !isPresetCountryDial(dial);
  const selectedMeta = isCustom
    ? { label: "Outro (DDI manual)", flag: "✏️" }
    : (LOGIN_COUNTRY_DIALS.find((c) => c.dial === dial) ??
      LOGIN_COUNTRY_DIALS[0]!);

  const selectValue = isCustom
    ? LOGIN_COUNTRY_CUSTOM_SELECT
    : dial;

  function handleCountrySelect(next: string) {
    if (next === LOGIN_COUNTRY_CUSTOM_SELECT) {
      setDial("");
      persistLoginPhonePartsToStorage("", local);
      return;
    }
    setDial(next);
    persistLoginPhonePartsToStorage(next, local);
  }

  const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`;

  return (
    <div ref={fieldRef} className="space-y-1.5">
      {!hasError ? (
        <label htmlFor={selectId} className="block text-sm font-medium text-zinc-700">
          {label}
        </label>
      ) : (
        <p id={`${idPrefix}-phone-error`} className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
      <div className="grid w-full min-w-0 grid-cols-[3.75rem_minmax(0,1fr)] items-stretch gap-1.5 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-2">
        <select
          id={selectId}
          disabled={disabled}
          value={selectValue}
          onChange={(e) => handleCountrySelect(e.target.value)}
          aria-label={`País do telefone: ${selectedMeta.label}`}
          title={selectedMeta.label}
          aria-invalid={hasError || undefined}
          className={`box-border h-full min-h-[2.5rem] w-full min-w-0 max-w-full cursor-pointer appearance-none rounded-lg border bg-white py-1.5 pl-1 pr-5 text-center text-lg leading-none sm:min-h-0 sm:py-2 sm:pl-1.5 sm:pr-7 sm:text-2xl ${
            hasError
              ? 'border-red-700 focus:border-red-700 focus:outline-none focus:ring-1 focus:ring-red-700'
              : 'border-zinc-300 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
          }`}
          style={{
            backgroundImage: chevronBg,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0.2rem center",
            backgroundSize: "0.875rem",
          }}
          autoComplete="country"
        >
          {LOGIN_COUNTRY_DIALS.map((c) => (
            <option key={c.dial} value={c.dial} title={c.label}>
              {c.flag}
            </option>
          ))}
          <option
            value={LOGIN_COUNTRY_CUSTOM_SELECT}
            title="Outro país — introduz o DDI manualmente"
          >
            ✏️
          </option>
        </select>
        <div
          className={`relative flex min-w-0 flex-1 overflow-hidden rounded-lg border ${
            hasError
              ? 'border-red-700 focus-within:border-red-700 focus-within:ring-1 focus-within:ring-red-700'
              : 'border-zinc-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500'
          }`}
        >
          {isCustom ? (
            <>
              <span
                className="flex shrink-0 items-center border-r border-zinc-200 bg-zinc-50 px-2 text-sm font-medium text-zinc-600"
                aria-hidden
              >
                +
              </span>
              <input
                id={customDialId}
                type="tel"
                name={`${idPrefix}-custom-dial`}
                inputMode="numeric"
                disabled={disabled}
                value={dial}
                onChange={(e) => {
                  const next = loginPhoneDigitsOnly(e.target.value).slice(0, 5);
                  setDial(next);
                  persistLoginPhonePartsToStorage(next, local);
                }}
                placeholder="DDI"
                maxLength={5}
                autoComplete="tel-country-code"
                aria-label="Código de país (DDI), só dígitos"
                required
                className="w-[4.75rem] shrink-0 border-r border-zinc-200 bg-zinc-50 px-2 py-2 text-center text-sm font-medium text-zinc-900 outline-none placeholder:text-zinc-400"
              />
            </>
          ) : (
            <span
              className="flex shrink-0 items-center border-r border-zinc-200 bg-zinc-50 px-2.5 text-sm font-medium text-zinc-600"
              aria-hidden
            >
              +{dial}
            </span>
          )}
          <input
            id={localId}
            type="tel"
            name="username"
            inputMode="numeric"
            autoComplete="tel-national"
            disabled={disabled}
            value={local}
            onChange={(e) => {
              const next = e.target.value;
              setLocal(next);
              persistLoginPhonePartsToStorage(dial, next);
            }}
            placeholder={
              dial === "351"
                ? "9XX XXX XXX"
                : dial === "55"
                  ? "XX XXXXX XXXX"
                  : "XXX XXX XXX"
            }
            required
            aria-label="Número de telemóvel sem código do país"
            aria-invalid={hasError || undefined}
            aria-describedby={hasError ? `${idPrefix}-phone-error` : undefined}
            className={`min-w-0 flex-1 border-0 bg-white px-3 py-2 text-sm outline-none placeholder:text-zinc-400 ${
              hasError ? 'text-red-900' : 'text-zinc-900'
            }`}
          />
          {hasError ? (
            <span
              className="pointer-events-none absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-red-700 text-white"
              aria-hidden
            >
              <span className="text-xs font-bold leading-none">!</span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
