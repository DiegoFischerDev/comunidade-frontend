"use client";

import { type ReactNode, type Ref, useEffect, useRef, useState } from "react";

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
  /** Ação à direita da label (ex.: «Utilizar e-mail»). */
  labelAction?: ReactNode;
  /** Por defeito grava país/número no localStorage (login). Desativar em formulários admin avulsos. */
  rememberInStorage?: boolean;
};

function buildFullDigits(
  dial: string,
  localRaw: string,
  rememberInStorage: boolean,
): string {
  const localDigits = loginPhoneDigitsOnly(localRaw);
  if (!rememberInStorage && !localDigits) return "";
  return `${loginPhoneDigitsOnly(dial)}${localDigits}`;
}

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
  labelAction,
  rememberInStorage = true,
}: Props) {
  const hasError = Boolean(error);
  const [dial, setDial] = useState(LOGIN_COUNTRY_DIALS[0]!.dial);
  const [local, setLocal] = useState("");
  const [ready, setReady] = useState(false);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  /** Evita que o sync de `value` sobrescreva o estado logo após um emit interno. */
  const ignoreNextValueSyncRef = useRef(false);
  const rememberInStorageRef = useRef(rememberInStorage);
  rememberInStorageRef.current = rememberInStorage;
  const dialRef = useRef(dial);
  dialRef.current = dial;
  const valueRef = useRef(value);
  valueRef.current = value;

  const persistPhoneParts = (nextDial: string, nextLocal: string) => {
    if (!rememberInStorageRef.current) return;
    persistLoginPhonePartsToStorage(nextDial, nextLocal);
  };

  const emitToParent = (nextDial: string, nextLocal: string) => {
    const nextFull = buildFullDigits(
      nextDial,
      nextLocal,
      rememberInStorageRef.current,
    );
    if (loginPhoneDigitsOnly(nextFull) === loginPhoneDigitsOnly(valueRef.current)) {
      return;
    }
    ignoreNextValueSyncRef.current = true;
    valueRef.current = nextFull;
    onChangeRef.current(nextFull);
    persistPhoneParts(nextDial, nextLocal);
  };

  // Hidratação inicial (uma vez).
  useEffect(() => {
    const { dial: d, local: l } = rememberInStorage
      ? readDialAndLocalFromStorageAndValue(value)
      : (() => {
          const sv = loginPhoneDigitsOnly(value);
          const defaultDial = LOGIN_COUNTRY_DIALS[0]!.dial;
          if (sv) return parseFullDigitsToDialLocal(sv, defaultDial, defaultDial);
          return { dial: defaultDial, local: "" };
        })();
    setDial(d);
    setLocal(l);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync externo (ex.: reset do formulário). Não corre após emit interno.
  useEffect(() => {
    if (!ready) return;
    if (ignoreNextValueSyncRef.current) {
      ignoreNextValueSyncRef.current = false;
      return;
    }
    const currentDial = dialRef.current;
    if (!isPresetCountryDial(currentDial) && loginPhoneDigitsOnly(currentDial)) {
      // DDI manual: não re-parsear pelo value (perderíamos o DDI custom).
      return;
    }

    const v = loginPhoneDigitsOnly(value);
    if (!v) {
      setLocal((prev) => (prev === "" ? prev : ""));
      return;
    }

    const p = parseFullDigitsToDialLocal(
      v,
      LOGIN_COUNTRY_DIALS[0]!.dial,
      currentDial,
    );
    setDial((prev) => (prev === p.dial ? prev : p.dial));
    setLocal((prev) => (loginPhoneDigitsOnly(prev) === p.local ? prev : p.local));
  }, [value, ready]);

  const selectId = `${idPrefix}-country`;
  const localId = `${idPrefix}-whatsapp-local`;
  const customDialId = `${idPrefix}-custom-dial`;

  const isCustom = !isPresetCountryDial(dial);
  const selectedMeta = isCustom
    ? { label: "Outro (DDI manual)", flag: "✏️" }
    : (LOGIN_COUNTRY_DIALS.find((c) => c.dial === dial) ??
      LOGIN_COUNTRY_DIALS[0]!);

  const selectValue = isCustom ? LOGIN_COUNTRY_CUSTOM_SELECT : dial;

  function handleCountrySelect(next: string) {
    if (next === LOGIN_COUNTRY_CUSTOM_SELECT) {
      setDial("");
      emitToParent("", local);
      return;
    }
    setDial(next);
    emitToParent(next, local);
  }

  const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`;

  return (
    <div ref={fieldRef} className="space-y-1.5">
      {!hasError ? (
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={selectId} className="text-sm font-medium text-foreground/90">
            {label}
          </label>
          {labelAction}
        </div>
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
          className={`box-border h-full min-h-[2.5rem] w-full min-w-0 max-w-full cursor-pointer appearance-none rounded-lg border bg-card py-1.5 pl-1 pr-5 text-center text-lg leading-none sm:min-h-0 sm:py-2 sm:pl-1.5 sm:pr-7 sm:text-2xl ${
            hasError
              ? "border-red-700 focus:border-red-700 focus:outline-none focus:ring-1 focus:ring-red-700"
              : "border-border focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/25"
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
              ? "border-red-700 focus-within:border-red-700 focus-within:ring-1 focus-within:ring-red-700"
              : "border-border focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/25"
          }`}
        >
          {isCustom ? (
            <>
              <span
                className="flex shrink-0 items-center border-r border-border bg-page px-2 text-sm font-medium text-muted"
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
                  emitToParent(next, local);
                }}
                placeholder="DDI"
                maxLength={5}
                autoComplete="tel-country-code"
                aria-label="Código de país (DDI), só dígitos"
                required
                className="w-[4.75rem] shrink-0 border-r border-border bg-page px-2 py-2 text-center text-sm font-medium text-foreground outline-none placeholder:text-muted/80"
              />
            </>
          ) : (
            <span
              className="flex shrink-0 items-center border-r border-border bg-page px-2.5 text-sm font-medium text-muted"
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
              emitToParent(dial, next);
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
            className={`min-w-0 flex-1 border-0 bg-card px-3 py-2 text-sm outline-none placeholder:text-muted/80 ${
              hasError ? "text-red-900" : "text-foreground"
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
