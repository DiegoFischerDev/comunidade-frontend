"use client";

import { useEffect, useId, useState } from "react";

import { api, type RagFaqItem } from "@/lib/api";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`h-5 w-5 shrink-0 text-brand-accent transition-transform duration-300 ease-out motion-reduce:transition-none ${
        open ? "rotate-180" : "rotate-0"
      }`}
    >
      <path d="M5 7.5 10 12.5 15 7.5" />
    </svg>
  );
}

type FaqAccordionItemProps = {
  item: FaqItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  panelId: string;
  buttonId: string;
};

function FaqAccordionItem({
  item,
  index,
  isOpen,
  onToggle,
  panelId,
  buttonId,
}: FaqAccordionItemProps) {
  return (
    <div
      className={`dashboard-faq-item overflow-hidden rounded-[14px] border bg-card shadow-sm transition-[border-color,box-shadow] duration-300 ease-out ${
        isOpen
          ? "border-brand-primary/20 shadow-[0_8px_24px_-12px_rgb(12_58_51/0.18)]"
          : "border-border hover:border-brand-primary/12"
      }`}
    >
      <h3>
        <button
          id={buttonId}
          type="button"
          className="flex w-full cursor-pointer items-start gap-3 px-4 py-4 text-left sm:gap-4 sm:px-5 sm:py-[1.125rem]"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
        >
          <span
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums transition-colors duration-300 ease-out sm:h-8 sm:w-8 sm:text-sm ${
              isOpen
                ? "bg-brand-primary text-brand-on-primary"
                : "bg-brand-primary/8 text-brand-primary"
            }`}
            aria-hidden
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="min-w-0 flex-1 pt-0.5 text-[0.95rem] font-semibold leading-snug tracking-tight text-foreground sm:text-base">
            {item.question}
          </span>
          <ChevronIcon open={isOpen} />
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        className={`dashboard-faq-panel grid ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div
            className={`px-4 pb-4 text-sm leading-relaxed text-muted transition-opacity duration-300 ease-out motion-reduce:transition-none sm:px-5 sm:pb-5 sm:pl-[4.25rem] sm:text-[0.9375rem] ${
              isOpen ? "opacity-100" : "opacity-0"
            }`}
          >
            <p className="whitespace-pre-wrap">{item.answer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

type Props = {
  className?: string;
};

function toFaqItems(rows: RagFaqItem[]): FaqItem[] {
  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    answer: row.answer,
  }));
}

export function DashboardFaqSection({ className = "" }: Props) {
  const baseId = useId();
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openIndexes, setOpenIndexes] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rows = await api.rag.faq();
        if (!cancelled) setItems(toFaqItems(rows));
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleItem = (index: number) => {
    setOpenIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (!loading && items.length === 0) {
    return null;
  }

  return (
    <section
      className={`relative mx-auto w-full max-w-3xl px-4 py-10 md:px-0 md:py-14 ${className}`.trim()}
      aria-label="Perguntas frequentes"
    >
      <div className="mb-6 text-center md:mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-brand-accent">
          Dúvidas comuns
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Perguntas frequentes
        </h2>
        <p className="mx-auto mt-3 max-w-[42ch] text-sm leading-relaxed text-muted sm:text-base">
          Respostas rápidas sobre imigração, documentos e como a Move Casa pode
          acompanhar sua mudança para Portugal.
        </p>
      </div>

      {loading ? (
        <p className="text-center text-sm text-muted">A carregar…</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => {
            const panelId = `${baseId}-panel-${index}`;
            const buttonId = `${baseId}-button-${index}`;

            return (
              <FaqAccordionItem
                key={item.id}
                item={item}
                index={index}
                isOpen={openIndexes.has(index)}
                onToggle={() => toggleItem(index)}
                panelId={panelId}
                buttonId={buttonId}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
