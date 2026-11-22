type CrmLeadNameFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxLength?: number;
};

export function CrmLeadNameField({
  id,
  value,
  onChange,
  disabled = false,
  maxLength = 80,
}: CrmLeadNameFieldProps) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="sr-only">
        Nome do lead
      </label>
      <input
        id={id}
        type="text"
        value={value}
        maxLength={maxLength}
        disabled={disabled}
        autoComplete="off"
        placeholder="Nome do lead"
        title="Clica para editar o nome"
        onChange={(event) => onChange(event.target.value)}
        className="w-full min-w-0 cursor-text rounded-lg border border-border bg-card px-2 py-1 text-lg font-semibold text-foreground outline-none transition-colors hover:border-brand-primary/40 focus-visible:border-brand-primary focus-visible:ring-2 focus-visible:ring-brand-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
      />
    </div>
  );
}
