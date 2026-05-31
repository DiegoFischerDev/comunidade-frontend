export type HousePublishPreview = {
  id: string;
  houseId: number;
  title: string;
  businessType: "RENT" | "SALE";
  typology: string;
  city: string;
  availableFrom: string;
  priceEur: string;
  relocationFeeEur: string;
  imageUrls: string[];
  coverImageUrl?: string | null;
  videoUrl?: string | null;
  videoPosterUrl?: string | null;
  publicationStatus: "PUBLISHED" | "HIDDEN" | "TRASH";
  publishedUntil?: string | null;
  whatsappSentAt: string | null;
  whatsappSends?: { sentAt: string }[];
};

export type PublishQuickDraft = {
  relocationFeeEur: string;
  priceEur: string;
  title: string;
  availableFrom: string;
};

export type PublishMissingFieldKey =
  | "relocationFeeEur"
  | "priceEur"
  | "title"
  | "availableFrom"
  | "media";

export type PublishMissingField = {
  key: PublishMissingFieldKey;
  label: string;
  quickEdit: boolean;
};

export const PUBLISH_MISSING_FIELD_LABELS: Record<
  PublishMissingFieldKey,
  string
> = {
  relocationFeeEur: "Taxa de relocation",
  priceEur: "Preço",
  title: "Título",
  availableFrom: "Disponível a partir de",
  media: "Fotos ou vídeo",
};

function cleanEur(raw: string): string {
  return raw.trim().replace(/\s*€\s*$/i, "").trim();
}

export function isRelocationFeeMissing(raw: string): boolean {
  const digits = cleanEur(raw).replace(/[^\d]/g, "");
  return !digits || /^0+$/.test(digits);
}

export function isTextFieldMissing(raw: string): boolean {
  return !raw.trim();
}

export function hasHouseMedia(house: HousePublishPreview): boolean {
  const images = house.imageUrls?.length ?? 0;
  const video = (house.videoUrl ?? "").trim();
  return images > 0 || video.length > 0;
}

export function draftFromHouse(house: HousePublishPreview): PublishQuickDraft {
  const d = new Date(house.availableFrom);
  const availableFrom = Number.isNaN(d.getTime())
    ? ""
    : d.toISOString().slice(0, 10);
  return {
    relocationFeeEur: house.relocationFeeEur ?? "",
    priceEur: house.priceEur ?? "",
    title: house.title ?? "",
    availableFrom,
  };
}

export function mergeHouseWithDraft(
  house: HousePublishPreview,
  draft: PublishQuickDraft,
): HousePublishPreview {
  return {
    ...house,
    relocationFeeEur: draft.relocationFeeEur.trim(),
    priceEur: draft.priceEur.trim(),
    title: draft.title.trim(),
    availableFrom: draft.availableFrom
      ? `${draft.availableFrom}T12:00:00.000Z`
      : house.availableFrom,
  };
}

export function getMissingPublishFields(
  house: HousePublishPreview,
): PublishMissingField[] {
  const missing: PublishMissingField[] = [];
  if (isRelocationFeeMissing(house.relocationFeeEur)) {
    missing.push({
      key: "relocationFeeEur",
      label: PUBLISH_MISSING_FIELD_LABELS.relocationFeeEur,
      quickEdit: true,
    });
  }
  if (isTextFieldMissing(house.priceEur)) {
    missing.push({
      key: "priceEur",
      label: PUBLISH_MISSING_FIELD_LABELS.priceEur,
      quickEdit: true,
    });
  }
  if (isTextFieldMissing(house.title)) {
    missing.push({
      key: "title",
      label: PUBLISH_MISSING_FIELD_LABELS.title,
      quickEdit: true,
    });
  }
  if (isTextFieldMissing(house.availableFrom)) {
    missing.push({
      key: "availableFrom",
      label: PUBLISH_MISSING_FIELD_LABELS.availableFrom,
      quickEdit: true,
    });
  }
  if (!hasHouseMedia(house)) {
    missing.push({
      key: "media",
      label: PUBLISH_MISSING_FIELD_LABELS.media,
      quickEdit: false,
    });
  }
  return missing;
}

export function buildQuickPatch(
  house: HousePublishPreview,
  draft: PublishQuickDraft,
): {
  title?: string;
  priceEur?: string;
  relocationFeeEur?: string;
  availableFrom?: string;
} {
  const patch: {
    title?: string;
    priceEur?: string;
    relocationFeeEur?: string;
    availableFrom?: string;
  } = {};
  const title = draft.title.trim();
  const priceEur = draft.priceEur.trim();
  const relocationFeeEur = cleanEur(draft.relocationFeeEur);
  const availableFrom = draft.availableFrom.trim();

  if (title && title !== house.title.trim()) patch.title = title;
  if (priceEur && priceEur !== house.priceEur.trim()) patch.priceEur = priceEur;
  if (
    relocationFeeEur &&
    relocationFeeEur !== cleanEur(house.relocationFeeEur ?? "")
  ) {
    patch.relocationFeeEur = relocationFeeEur;
  }
  if (availableFrom) {
    const prev = draftFromHouse(house).availableFrom;
    if (availableFrom !== prev) patch.availableFrom = availableFrom;
  }
  return patch;
}
