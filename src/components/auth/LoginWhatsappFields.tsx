"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  LOGIN_COUNTRY_CUSTOM_SELECT,
  LOGIN_COUNTRY_DIALS,
  isPresetCountryDial,
  loginPhoneDigitsOnly,
  parseFullDigitsToDialLocal,
  persistLoginPhonePartsToStorage,
  readDialAndLocalFromStorageAndValue,
} from "@/lib/login-phone-storage";
import { subscribeLoginFormSync } from "@/lib/login-form-broadcast";
import { useRehydrateOnPageVisible } from "@/lib/useRehydrateOnPageVisible";

type Props = {
  idPrefix: string;
  value: string;
  onChange: (fullDigits: string) => void;
  disabled?: boolean;
  /** Por defeito: "WhatsApp". */
  label?: string;
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
}: Props) {
  const [dial, setDial] = useState(LOGIN_COUNTRY_DIALS[0]!.dial);
  const [local, setLocal] = useState("");
  const [ready, setReady] = useState(false);
  const dialRef = useRef(dial);
  dialRef.current = dial;
  const valueRef = useRef(value);
  valueRef.current = value;

  // Hidratar uma vez (localStorage + value inicial do pai)
  useEffect(() => {
    const { dial: d, local: l } = readDialAndLocalFromStorageAndValue(value);
    setDial(d);
    setLocal(l);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reapplyFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    const { dial: d, local: l } = readDialAndLocalFromStorageAndValue(
      valueRef.current,
    );
    setDial(d);
    setLocal(l);
    setReady(true);
  }, []);

  useRehydrateOnPageVisible(reapplyFromStorage);

  useEffect(() => {
    return subscribeLoginFormSync((msg) => {
      if (msg.t !== "phone") return;
      persistLoginPhonePartsToStorage(msg.dial, msg.local, "sync");
      setDial(msg.dial);
      setLocal(msg.local);
      setReady(true);
    });
  }, []);

  // Sincronizar só quando o `value` do pai muda — não incluir dial/local nas deps.
  // Com lápis (DDI manual), não reinterpretar o número: senão dígitos que coincidem com 351/55
  // passavam a mudar o país automaticamente.
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
    persistLoginPhonePartsToStorage(dial, local, "sync");
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
    <div className="space-y-1.5">
      <label htmlFor={selectId} className="block text-sm font-medium text-zinc-700">
        {label}
      </label>
      {/* Grelha: coluna fixa evita que o <select> (largura intrínseca das opções) parta o flex em mobile */}
      <div className="grid w-full min-w-0 grid-cols-[3.75rem_minmax(0,1fr)] items-stretch gap-1.5 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-2">
        <select
          id={selectId}
          disabled={disabled}
          value={selectValue}
          onChange={(e) => handleCountrySelect(e.target.value)}
          aria-label={`País do telefone: ${selectedMeta.label}`}
          title={selectedMeta.label}
          className="box-border h-full min-h-[2.5rem] w-full min-w-0 max-w-full cursor-pointer appearance-none rounded-lg border border-zinc-300 bg-white py-1.5 pl-1 pr-5 text-center text-lg leading-none focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:min-h-0 sm:py-2 sm:pl-1.5 sm:pr-7 sm:text-2xl"
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
        <div className="flex min-w-0 flex-1 overflow-hidden rounded-lg border border-zinc-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
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
            className="min-w-0 flex-1 border-0 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          />
        </div>
      </div>
    </div>
  );
}
