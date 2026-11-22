'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Ícone da barra de acções do card CRM — maior no mobile para toque. */
export const crmActionIconBtnClass =
  'relative inline-flex h-9 w-9 sm:h-6 sm:w-6 shrink-0 cursor-pointer items-center justify-center rounded-md border bg-page transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30 disabled:cursor-not-allowed disabled:opacity-50';

export const crmActionIconClass = 'h-4 w-4 sm:h-3.5 sm:w-3.5';

export const crmActionTextBtnClass =
  'inline-flex h-9 sm:h-6 cursor-pointer items-center rounded-md border border-border bg-page px-2.5 sm:px-1.5 text-xs sm:text-[11px] font-medium leading-none text-foreground transition-colors hover:border-brand-primary/30 hover:bg-brand-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30';

export const crmActionBarClass =
  '-mx-3 -mb-3 mt-2.5 flex items-center gap-1.5 sm:gap-1 border-t border-border bg-card px-1.5 py-1.5 sm:py-1';

/** Badge de não respondidas — estilo WhatsApp (círculo verde com número branco). */
export function CrmUnansweredBadge({ count }: { count: number }) {
  if (!Number.isFinite(count) || count <= 0) return null;
  const label = count > 99 ? '99+' : String(Math.floor(count));
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute -right-1 -top-1 z-10 inline-flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-[#25D366] px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-card"
    >
      {label}
    </span>
  );
}

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

function CloseIcon({ className }: { className?: string }) {
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
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function canUseHoverTooltip() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
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
  const hasNotes = Boolean(commentText || summaryText);
  const titleId = useId();
  const anchorRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof globalThis.setTimeout> | undefined>(undefined);
  const requestedForOpenRef = useRef(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState<{
    top: number;
    left: number;
    maxWidth: number;
    transform?: string;
  } | null>(null);

  const showHover = useCallback(() => {
    if (!canUseHoverTooltip() || modalOpen || !hasNotes) return;
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    setHoverOpen(true);
  }, [hasNotes, modalOpen]);

  const scheduleHideHover = useCallback(() => {
    hideTimeoutRef.current = globalThis.setTimeout(() => setHoverOpen(false), 120);
  }, []);

  useLayoutEffect(() => {
    if (!hoverOpen || !anchorRef.current) return;

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
  }, [hoverOpen]);

  useEffect(
    () => () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!modalOpen) return;
    setHoverOpen(false);
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setModalOpen(false);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) {
      requestedForOpenRef.current = false;
      return;
    }
    if (!onGenerateSummary || disabled || requestedForOpenRef.current) return;
    requestedForOpenRef.current = true;
    onGenerateSummary();
  }, [modalOpen, onGenerateSummary, disabled]);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        draggable={false}
        disabled={disabled}
        className={`${crmActionIconBtnClass} border-sky-300 bg-sky-50 text-sky-700 hover:border-sky-400 hover:bg-sky-100`}
        aria-label="Informação do lead"
        title={hasNotes ? undefined : 'Informação'}
        aria-haspopup="dialog"
        aria-expanded={modalOpen}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation();
          if (disabled) return;
          setHoverOpen(false);
          setModalOpen(true);
        }}
        onMouseEnter={showHover}
        onMouseLeave={scheduleHideHover}
        onFocus={showHover}
        onBlur={scheduleHideHover}
      >
        <InfoIcon className={crmActionIconClass} />
      </button>

      {hasNotes && hoverOpen && !modalOpen && popupStyle && typeof document !== 'undefined'
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
              onMouseEnter={showHover}
              onMouseLeave={scheduleHideHover}
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

      {modalOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4"
              onClick={() => setModalOpen(false)}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="w-full max-w-sm rounded-[18px] border border-border bg-card p-4 shadow-sm sm:p-5"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 id={titleId} className="text-base font-semibold text-foreground">
                      Informação do lead
                    </h2>
                    <p className="mt-0.5 text-xs text-muted">
                      Notas e resumo da solicitação
                    </p>
                  </div>
                  <button
                    ref={closeRef}
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[14px] border border-border bg-card text-foreground transition-colors hover:bg-page focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
                    aria-label="Fechar"
                  >
                    <CloseIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  <div className="rounded-xl border border-border bg-page px-3.5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                      Comentário
                    </p>
                    {commentText ? (
                      <p className="mt-1.5 max-h-36 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">
                        {commentText}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-sm text-muted">Sem comentário.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-border bg-page px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                        Resumo da solicitação
                      </p>
                      {isSummarizing ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-sky-700">
                          <SummarySpinner className="h-3 w-3" />
                          A atualizar…
                        </span>
                      ) : null}
                    </div>
                    {summaryText ? (
                      <p
                        className={`mt-1.5 max-h-36 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground ${
                          isSummarizing ? 'opacity-60' : ''
                        }`}
                      >
                        {summaryText}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-sm text-muted">
                        {isSummarizing ? 'A gerar resumo…' : 'Ainda sem resumo.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
