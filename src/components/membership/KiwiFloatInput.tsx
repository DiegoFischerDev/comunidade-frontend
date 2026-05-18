'use client';

import { forwardRef, type InputHTMLAttributes, useId } from 'react';

type KiwiFloatInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'placeholder' | 'className'
> & {
  label: string;
  error?: string;
  wrapperClassName?: string;
};

function FieldErrorIcon() {
  return (
    <span
      className="pointer-events-none absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-red-700 text-white"
      aria-hidden
    >
      <span className="text-xs font-bold leading-none">!</span>
    </span>
  );
}

/** Campo estilo Kiwify (label flutuante + destaque de erro). */
export const KiwiFloatInput = forwardRef<HTMLInputElement, KiwiFloatInputProps>(
  function KiwiFloatInput(
    { label, error, wrapperClassName = '', id: idProp, disabled, ...inputProps },
    ref,
  ) {
    const autoId = useId();
    const id = idProp ?? autoId;
    const hasError = Boolean(error);

    return (
      <div className={`relative pb-3 ${wrapperClassName}`}>
        <input
          ref={ref}
          id={id}
          disabled={disabled}
          placeholder=" "
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? `${id}-error` : undefined}
          className={`peer w-full rounded-md border bg-white px-3 pb-2.5 pt-5 text-sm outline-none transition-[border-color,box-shadow] placeholder:text-transparent disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-70 ${
            hasError
              ? 'border-red-700 pr-10 text-red-900 focus:border-red-700 focus:shadow-[0_0_0_1px_#b91c1c]'
              : 'border-zinc-300 text-zinc-900 focus:border-[#247ef3] focus:shadow-[0_0_0_1px_#247ef3]'
          }`}
          {...inputProps}
        />
        <label
          htmlFor={id}
          id={hasError ? `${id}-error` : undefined}
          className={`pointer-events-none absolute left-3 z-10 origin-[0] transition-all duration-150 ${
            hasError
              ? 'top-2 -translate-y-0 text-xs text-red-700'
              : 'top-4 -translate-y-1/2 text-sm text-zinc-500 peer-focus:top-2 peer-focus:-translate-y-0 peer-focus:text-xs peer-focus:text-[#247ef3] peer-[:not(:placeholder-shown)]:top-2 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-xs peer-disabled:text-zinc-400'
          }`}
        >
          {hasError ? error : label}
        </label>
        {hasError ? <FieldErrorIcon /> : null}
      </div>
    );
  },
);
