const PLACEHOLDER_COUNT = 3;

function QuoteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="h-8 w-8 text-brand-primary/10"
    >
      <path d="M4.5 12.5c0-3.2 2.1-5.8 5.3-6.8.4-.1.8.2.8.6v2.4c0 .4-.3.7-.7.8-1.4.3-2.4 1.5-2.4 3 0 .6.5 1.1 1.1 1.1h2.4c.6 0 1.1.5 1.1 1.1v2.4c0 .6-.5 1.1-1.1 1.1H7.8c-1.8 0-3.3-1.5-3.3-3.3V12.5Zm10 0c0-3.2 2.1-5.8 5.3-6.8.4-.1.8.2.8.6v2.4c0 .4-.3.7-.7.8-1.4.3-2.4 1.5-2.4 3 0 .6.5 1.1 1.1 1.1h2.4c.6 0 1.1.5 1.1 1.1v2.4c0 .6-.5 1.1-1.1 1.1h-2.4c-1.8 0-3.3-1.5-3.3-3.3V12.5Z" />
    </svg>
  );
}

function TestimonialPlaceholderCard({ index }: { index: number }) {
  return (
    <figure
      className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-[18px] border border-dashed border-border bg-card p-6 text-center shadow-sm sm:min-h-[240px] sm:p-8"
      aria-label={`Depoimento ${index + 1} — em breve`}
    >
      <QuoteIcon />
      <p className="mt-4 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
        Em breve
      </p>
      <p className="mt-2 max-w-[24ch] text-sm leading-relaxed text-muted">
        Estamos reunindo as primeiras histórias de quem imigrou com a Move Casa.
      </p>
    </figure>
  );
}

type Props = {
  className?: string;
};

export function DashboardTestimonialsSection({ className = "" }: Props) {
  return (
    <section
      className={`relative mx-auto w-full max-w-5xl px-4 py-10 md:px-2 md:py-14 ${className}`.trim()}
      aria-label="Depoimentos"
    >
      <div className="mb-6 text-center md:mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
          Quem já imigrou
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Depoimentos
        </h2>
        <p className="mx-auto mt-3 max-w-[48ch] text-sm leading-relaxed text-muted sm:text-base">
          Em breve, histórias de brasileiros que imigraram e se instalaram em
          Viseu ou São Pedro do Sul com a Move Casa.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {Array.from({ length: PLACEHOLDER_COUNT }, (_, index) => (
          <TestimonialPlaceholderCard key={index} index={index} />
        ))}
      </div>
    </section>
  );
}
