"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import {
  filterRelocationCitiesByQuery,
  foldCitySearch,
  relocationCityDisplayName,
} from "@/lib/relocation-portugal-cities";

type Props = {
  id?: string;
  label: string;
  labelClassName?: string;
  value: string;
  onChange: (next: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  placeholder?: string;
  /** Estilo do campo (filtros imóveis vs formulários parceiro/admin). */
  variant?: "amber" | "blue";
  required?: boolean;
};

export function RelocationCityCombobox({
  id: idProp,
  label,
  labelClassName,
  value,
  onChange,
  allowEmpty = true,
  emptyLabel = "Todas",
  placeholder = "Pesquisar ou escolher…",
  variant = "amber",
  required = false,
}: Props) {
  const genId = useId();
  const baseId = idProp ?? genId;
  const listId = `${baseId}-listbox`;
  const inputId = `${baseId}-input`;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ring =
    variant === "blue"
      ? "focus:border-blue-500 focus:ring-blue-500"
      : "focus:border-amber-500 focus:ring-amber-500";

  const selectedLabel = value ? relocationCityDisplayName(value) : "";

  const filtered = useMemo(() => filterRelocationCitiesByQuery(search), [search]);

  const close = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const el = containerRef.current;
      if (!el || el.contains(e.target as Node)) return;
      close();
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [close]);

  function pickCity(next: string) {
    onChange(next);
    close();
  }

  function handleInputFocus() {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    setOpen(true);
    setSearch(selectedLabel);
  }

  function handleInputChange(raw: string) {
    setSearch(raw);
    if (!open) setOpen(true);
  }

  function handleInputBlur() {
    blurTimer.current = setTimeout(() => {
      close();
    }, 150);
  }

  const showEmptyRow = allowEmpty && (!search.trim() || foldCitySearch(emptyLabel).includes(foldCitySearch(search)));

  return (
    <div ref={containerRef} className="relative min-w-0">
      <label
        htmlFor={inputId}
        className={
          labelClassName ??
          "mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500"
        }
      >
        {label}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={open ? search : selectedLabel}
        placeholder={placeholder}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            close();
          }
        }}
        className={`w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 ${ring}`}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 text-sm shadow-lg"
        >
          {showEmptyRow ? (
            <li role="option">
              <button
                type="button"
                className="flex w-full px-3 py-2 text-left text-zinc-600 hover:bg-zinc-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickCity("")}
              >
                {emptyLabel}
              </button>
            </li>
          ) : null}
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-zinc-500">Sem resultados.</li>
          ) : (
            filtered.map((c) => (
              <li key={c} role="option">
                <button
                  type="button"
                  className="flex w-full px-3 py-2 text-left text-zinc-900 hover:bg-amber-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickCity(c)}
                >
                  {c}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
