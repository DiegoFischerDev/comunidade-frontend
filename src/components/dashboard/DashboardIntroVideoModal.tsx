'use client';

const YOUTUBE_EMBED_SRC =
  'https://www.youtube.com/embed/hZi7N6BOLJ4?si=F42ldaqDvNCRmjyk';

type DashboardIntroVideoModalProps = {
  open: boolean;
  onClose: () => void;
};

export function DashboardIntroVideoModal({
  open,
  onClose,
}: DashboardIntroVideoModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dashboard-intro-video-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="my-8 w-full max-w-3xl rounded-2xl bg-white p-4 shadow-xl sm:p-5"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="dashboard-intro-video-title"
            className="text-base font-semibold text-zinc-900"
          >
            Comunidade Rafa Portugal
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-200 text-xs text-zinc-500 hover:bg-zinc-50"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="relative mt-4 aspect-video w-full overflow-hidden rounded-lg bg-black">
          <iframe
            src={YOUTUBE_EMBED_SRC}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
