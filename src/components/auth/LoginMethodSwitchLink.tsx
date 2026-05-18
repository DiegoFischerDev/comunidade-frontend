'use client';

export type LoginMethod = 'whatsapp' | 'email';

type LoginMethodSwitchLinkProps = {
  method: LoginMethod;
  onSwitch: (method: LoginMethod) => void;
  disabled?: boolean;
};

export function LoginMethodSwitchLink({
  method,
  onSwitch,
  disabled = false,
}: LoginMethodSwitchLinkProps) {
  const next = method === 'whatsapp' ? 'email' : 'whatsapp';
  const label = method === 'whatsapp' ? 'Utilizar e-mail' : 'Utilizar WhatsApp';

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSwitch(next)}
      className="shrink-0 cursor-pointer text-xs font-normal text-blue-600 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
    >
      {label}
    </button>
  );
}
