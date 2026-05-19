'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef } from 'react';
import { resolveUploadsUrl } from '@/lib/resolve-uploads-url';

const MAX_IMAGES = 6;

function PhotoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055 2.31 2.31 0 00-2.946 0 2.31 2.31 0 01-1.64 1.055 47.865 47.865 0 00-1.134.175C7.499 7.58 6.75 8.507 6.75 9.574V18a2.25 2.25 0 002.25 2.25h15"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function ThumbnailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
      />
    </svg>
  );
}

type MediaDropzoneProps = {
  id: string;
  label: string;
  hint: string;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  icon: 'photo' | 'video' | 'thumbnail';
  fileName?: string | null;
  onFiles: (files: FileList | null) => void;
};

function MediaDropzone({
  id,
  label,
  hint,
  accept,
  multiple,
  disabled,
  icon,
  fileName,
  onFiles,
}: MediaDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const Icon = icon === 'video' ? VideoIcon : icon === 'thumbnail' ? ThumbnailIcon : PhotoIcon;

  return (
    <div>
      {label ? <span className="mb-1.5 block text-xs font-medium text-zinc-700">{label}</span> : null}
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition ${
          disabled
            ? 'cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400'
            : 'border-zinc-300 bg-zinc-50/80 text-zinc-600 hover:border-amber-400 hover:bg-amber-50/50 hover:text-zinc-800'
        }`}
      >
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full ${
            disabled ? 'bg-zinc-100 text-zinc-400' : 'bg-white text-amber-700 shadow-sm ring-1 ring-amber-100'
          }`}
        >
          <Icon className="h-6 w-6" />
        </span>
        <span className="text-sm font-medium text-zinc-800">
          {fileName ? 'Trocar ficheiro' : 'Clique para escolher'}
        </span>
        {fileName ? (
          <span className="max-w-full truncate px-2 text-xs text-amber-800">{fileName}</span>
        ) : (
          <span className="text-xs text-zinc-500">{hint}</span>
        )}
      </button>
    </div>
  );
}

export type HouseMediaEditState = {
  retainedImageUrls: string[];
  onRetainedImageUrlsChange: (urls: string[]) => void;
  existingVideoUrl: string | null;
  removeVideo: boolean;
  onRemoveVideoChange: (remove: boolean) => void;
  existingThumbnailUrl: string | null;
};

export type HouseCreateMediaFieldsProps = {
  images: File[];
  onImagesChange: (files: File[]) => void;
  coverImageIndex: number;
  onCoverImageIndexChange: (index: number) => void;
  video: File | null;
  onVideoChange: (file: File | null) => void;
  thumbnail: File | null;
  onThumbnailChange: (file: File | null) => void;
  showThumbnail?: boolean;
  idPrefix?: string;
  editMedia?: HouseMediaEditState | null;
};

export function HouseCreateMediaFields({
  images,
  onImagesChange,
  coverImageIndex,
  onCoverImageIndexChange,
  video,
  onVideoChange,
  thumbnail,
  onThumbnailChange,
  showThumbnail = false,
  idPrefix = 'house-media',
  editMedia = null,
}: HouseCreateMediaFieldsProps) {
  const retainedCount = editMedia?.retainedImageUrls.length ?? 0;
  const totalImageCount = retainedCount + images.length;

  const imagePreviews = useMemo(
    () => images.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [images],
  );

  useEffect(() => {
    return () => {
      imagePreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [imagePreviews]);

  const videoPreviewUrl = useMemo(() => (video ? URL.createObjectURL(video) : null), [video]);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  const thumbnailPreviewUrl = useMemo(
    () => (thumbnail ? URL.createObjectURL(thumbnail) : null),
    [thumbnail],
  );

  useEffect(() => {
    return () => {
      if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    };
  }, [thumbnailPreviewUrl]);

  const showThumbnailField = showThumbnail && totalImageCount === 0;
  const existingThumbnailSrc =
    editMedia?.existingThumbnailUrl && !thumbnail
      ? resolveUploadsUrl(editMedia.existingThumbnailUrl)
      : null;

  const showExistingVideo =
    Boolean(editMedia?.existingVideoUrl && !editMedia.removeVideo && !video);

  useEffect(() => {
    if (totalImageCount > 0 && thumbnail) onThumbnailChange(null);
  }, [totalImageCount, thumbnail, onThumbnailChange]);

  useEffect(() => {
    if (totalImageCount === 0) return;
    if (coverImageIndex >= totalImageCount) {
      onCoverImageIndexChange(totalImageCount - 1);
    }
  }, [totalImageCount, coverImageIndex, onCoverImageIndexChange]);

  function addImages(fileList: FileList | null) {
    if (!fileList?.length) return;
    const incoming = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (!incoming.length) return;
    const room = MAX_IMAGES - retainedCount;
    onImagesChange([...images, ...incoming].slice(0, room));
  }

  function removeNewImageAt(index: number) {
    onImagesChange(images.filter((_, i) => i !== index));
  }

  function removeRetainedAt(url: string) {
    if (!editMedia) return;
    editMedia.onRetainedImageUrlsChange(
      editMedia.retainedImageUrls.filter((u) => u !== url),
    );
  }

  const photosFull = totalImageCount >= MAX_IMAGES;
  const hasAnyPhotoPreview = retainedCount > 0 || imagePreviews.length > 0;

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-zinc-700">Fotos do imóvel</span>
          <span className="text-xs text-zinc-500">
            {totalImageCount}/{MAX_IMAGES}
          </span>
        </div>
        <MediaDropzone
          id={`${idPrefix}-photos`}
          label=""
          hint="JPG, PNG ou WebP · até 6 imagens"
          accept="image/*"
          multiple
          disabled={photosFull}
          icon="photo"
          onFiles={addImages}
        />
        {hasAnyPhotoPreview ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {editMedia?.retainedImageUrls.map((url, i) => (
              <div
                key={`retained-${url}`}
                className={`relative aspect-video overflow-hidden rounded-xl border bg-zinc-100 ${
                  coverImageIndex === i ? 'border-amber-500 ring-2 ring-amber-400/50' : 'border-zinc-200'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resolveUploadsUrl(url)} alt="" className="h-full w-full object-cover" />
                <label className="absolute bottom-1.5 left-1.5 flex cursor-pointer items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  <input
                    type="radio"
                    name={`${idPrefix}-cover`}
                    className="accent-amber-400"
                    checked={coverImageIndex === i}
                    onChange={() => onCoverImageIndexChange(i)}
                  />
                  Principal
                </label>
                <button
                  type="button"
                  onClick={() => removeRetainedAt(url)}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm font-bold text-white hover:bg-black/80"
                  aria-label="Remover imagem"
                >
                  ×
                </button>
              </div>
            ))}
            {imagePreviews.map((p, j) => {
              const globalIndex = retainedCount + j;
              return (
                <div
                  key={`${p.file.name}-${p.file.size}-${j}`}
                  className={`relative aspect-video overflow-hidden rounded-xl border bg-zinc-100 ${
                    coverImageIndex === globalIndex
                      ? 'border-amber-500 ring-2 ring-amber-400/50'
                      : 'border-zinc-200'
                  }`}
                >
                  <Image src={p.url} alt="" fill className="object-cover" unoptimized />
                  <label className="absolute bottom-1.5 left-1.5 flex cursor-pointer items-center gap-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                    <input
                      type="radio"
                      name={`${idPrefix}-cover`}
                      className="accent-amber-400"
                      checked={coverImageIndex === globalIndex}
                      onChange={() => onCoverImageIndexChange(globalIndex)}
                    />
                    Principal
                  </label>
                  <button
                    type="button"
                    onClick={() => removeNewImageAt(j)}
                    className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm font-bold text-white hover:bg-black/80"
                    aria-label="Remover imagem"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
        {hasAnyPhotoPreview ? (
          <p className="mt-2 text-xs text-zinc-500">
            Marca a foto principal usada na pré-visualização ao partilhar o anúncio.
          </p>
        ) : null}
      </div>

      <div className={`grid gap-4 ${showThumbnailField ? 'sm:grid-cols-2' : ''}`}>
        <div>
          <MediaDropzone
            id={`${idPrefix}-video`}
            label="Vídeo do imóvel (opcional)"
            hint="MP4, MOV, WebM ou 3GP"
            accept="video/mp4,video/quicktime,video/webm,video/3gpp,.mp4,.mov,.webm,.3gp"
            icon="video"
            fileName={video?.name ?? null}
            onFiles={(list) => {
              const f = list?.[0] ?? null;
              onVideoChange(f);
              if (f && editMedia) editMedia.onRemoveVideoChange(false);
            }}
          />
          {showExistingVideo ? (
            <div className="mt-3 overflow-hidden rounded-xl bg-black">
              <video
                src={resolveUploadsUrl(editMedia!.existingVideoUrl!)}
                className="max-h-48 w-full object-contain"
                controls
                playsInline
              />
              <button
                type="button"
                onClick={() => editMedia?.onRemoveVideoChange(true)}
                className="mt-1 text-xs font-medium text-red-600 hover:underline"
              >
                Remover vídeo atual
              </button>
            </div>
          ) : null}
          {videoPreviewUrl ? (
            <div className="mt-3 overflow-hidden rounded-xl bg-black">
              <video src={videoPreviewUrl} className="max-h-48 w-full object-contain" controls playsInline />
              <button
                type="button"
                onClick={() => onVideoChange(null)}
                className="mt-1 text-xs font-medium text-red-600 hover:underline"
              >
                Remover vídeo
              </button>
            </div>
          ) : null}
        </div>

        {showThumbnailField ? (
          <div>
            <MediaDropzone
              id={`${idPrefix}-thumbnail`}
              label="Thumbnail / capa (opcional)"
              hint="Imagem para listas quando não há fotos"
              accept="image/*"
              icon="thumbnail"
              fileName={thumbnail?.name ?? null}
              onFiles={(list) => onThumbnailChange(list?.[0] ?? null)}
            />
            {thumbnailPreviewUrl ? (
              <div className="relative mt-3 aspect-video overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                <Image src={thumbnailPreviewUrl} alt="" fill className="object-cover" unoptimized />
                <button
                  type="button"
                  onClick={() => onThumbnailChange(null)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-black/80"
                >
                  Remover
                </button>
              </div>
            ) : existingThumbnailSrc ? (
              <div className="relative mt-3 aspect-video overflow-hidden rounded-xl border border-zinc-200 bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={existingThumbnailSrc} alt="" className="h-full w-full object-cover" />
                <span className="absolute bottom-1.5 left-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  Thumbnail atual
                </span>
              </div>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">
                Usada na lista e nos cards públicos quando o anúncio ainda não tem fotos.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
