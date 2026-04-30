"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { isOurImageHostname } from "@/lib/site-url";

function nextImageUnoptimized(resolvedUrl: string) {
  if (!resolvedUrl.startsWith("http")) return false;
  try {
    const h = new URL(resolvedUrl).hostname;
    if (isOurImageHostname(h)) return false;
    return true;
  } catch {
    return true;
  }
}

type Props = {
  photos: string[];
};

export function HousePhotoGallery({ photos }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveIndex(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex]);

  const activeSrc = activeIndex !== null ? photos[activeIndex] : null;

  return (
    <>
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {photos.length === 1 ? "Fotografia" : "Fotografias"}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActiveIndex(i)}
              className="relative aspect-[4/3] cursor-pointer overflow-hidden rounded-xl bg-zinc-100 shadow-inner"
            >
              <Image
                src={src}
                alt=""
                fill
                className="object-cover"
                sizes="(max-width: 640px) 50vw, 200px"
                unoptimized={nextImageUnoptimized(src)}
              />
            </button>
          ))}
        </div>
      </div>

      {activeSrc ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4"
          onClick={() => setActiveIndex(null)}
          role="presentation"
        >
          <div
            className="relative max-h-[90vh] w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative aspect-[4/3] max-h-[90vh] w-full overflow-hidden rounded-2xl bg-black">
              <Image
                src={activeSrc}
                alt=""
                fill
                className="object-contain"
                sizes="100vw"
                unoptimized={nextImageUnoptimized(activeSrc)}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

