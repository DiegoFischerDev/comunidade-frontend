'use client';

/** Célula da tabela admin: utilizadores monitorizados (nome Evolution ou número). */
export function MonitoredUsersCell({
  numbers,
  monitorAllMembers,
  contactNames,
}: {
  numbers: string[];
  monitorAllMembers: boolean;
  contactNames: Record<string, string | null>;
}) {
  if (monitorAllMembers) {
    return (
      <span className="rounded-full bg-primary-1 px-2 py-1 text-xs font-medium text-foreground/90">
        Todos os membros
      </span>
    );
  }

  if (numbers.length === 0) {
    return <span className="text-xs text-muted/80">Nenhum</span>;
  }

  return (
    <ul className="max-w-xs space-y-1.5">
      {numbers.map((n) => {
        const name = contactNames[n];
        return (
          <li key={n} className="text-xs leading-snug">
            {name ? (
              <>
                <span className="font-medium text-foreground">{name}</span>
                <span className="mt-0.5 block font-mono tabular-nums text-muted">
                  +{n}
                </span>
              </>
            ) : (
              <span className="font-mono tabular-nums text-foreground/90">+{n}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
