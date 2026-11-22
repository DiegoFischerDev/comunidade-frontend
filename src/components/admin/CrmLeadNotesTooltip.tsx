'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const POPUP_MAX_WIDTH_PX = 320;
const POPUP_MAX_HEIGHT_PX = 280;
const POPUP_GAP_PX = 6;

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 10v6M12 8h.01" />
    </svg>
  );
}

export function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </svg>
  );
}

export function SummarySpinner({ className }: { className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className ?? 'h-3.5 w-3.5'}`}
      aria-hidden
    />
  );
}

export function CrmLeadNotesTooltip({
  comments,
  summary,
  onGenerateSummary,
  isSummarizing = false,
  disabled = false,
}: {
  comments?: string | null;
  summary?: string | null;
  onGenerateSummary?: () => void;
  isSummarizing?: boolean;
  disabled?: boolean;
}) {
  const commentText = comments?.trim() || '';
  const summaryText = summary?.trim() || '';
  const anchorRef = useRef<HTMLButtonElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState<{
    top: number;
    left: number;
    maxWidth: number;
    transform?: string;
  } | null>(null);

  const show = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setOpen(true);
  }, []);

  const scheduleHide = useCallback(() => {
    hideTimeoutRef.current = globalThis.setTimeout(() => setOpen(false), 120);
  }, []);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;

    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const margin = 8;
      const maxWidth = Math.min(POPUP_MAX_WIDTH_PX, window.innerWidth - margin * 2);
      let left = rect.left;
      if (left + maxWidth > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - margin - maxWidth);
      }
      if (left < margin) left = margin;

      const estimatedHeight = POPUP_MAX_HEIGHT_PX + 48;
      const spaceBelow = window.innerHeight - rect.bottom - POPUP_GAP_PX;
      const spaceAbove = rect.top - POPUP_GAP_PX;
      const showAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

      if (showAbove) {
        setPopupStyle({
          top: rect.top - POPUP_GAP_PX,
          left,
          maxWidth,
          transform: 'translateY(-100%)',
        });
        return;
      }

      setPopupStyle({
        top: rect.bottom + POPUP_GAP_PX,
        left,
        maxWidth,
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  useEffect(
    () => () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    },
    [],
  );

  if (!commentText && !summaryText) return null;

  const isDisabled = disabled || isSummarizing;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        draggable={false}
        disabled={isDisabled}
        className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border border-sky-300 bg-sky-50 text-sky-700 transition-colors hover:border-sky-400 hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Informação do lead. Clique para gerar resumo."
        title="Informação — clique para gerar resumo"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          if (!onGenerateSummary || isDisabled) return;
          onGenerateSummary();
        }}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onFocus={show}
        onBlur={scheduleHide}
      >
        {isSummarizing ? <SummarySpinner /> : <InfoIcon className="h-3.5 w-3.5" />}
      </button>
      {open && popupStyle && typeof document !== 'undefined'
        ? createPortal(
            <div
              role="tooltip"
              style={{
                position: 'fixed',
                top: popupStyle.top,
                left: popupStyle.left,
                maxWidth: popupStyle.maxWidth,
                transform: popupStyle.transform,
                zIndex: 130,
              }}
              className="w-max rounded-xl border border-border bg-card p-4 text-sm leading-relaxed text-foreground shadow-lg"
              onMouseEnter={show}
              onMouseLeave={scheduleHide}
            >
              {commentText ? (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Comentário
                  </p>
                  <p className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                    {commentText}
                  </p>
                </div>
              ) : null}
              {summaryText ? (
                <div className={commentText ? 'mt-3 border-t border-border pt-3' : undefined}>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                    Resumo da solicitação
                  </p>
                  <p className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words">
                    {summaryText}
                  </p>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
