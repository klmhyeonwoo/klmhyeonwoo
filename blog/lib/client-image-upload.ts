"use client";

export const imageFileAccept = "image/jpeg,image/png,image/webp,image/avif,image/bmp,image/heic,image/heif,image/gif,.heic,.heif";

const maxSourceBytes = 20 * 1024 * 1024;
const maxUploadBytes = 5 * 1024 * 1024;

export type ImageUploadProgress = {
  stage: "converting" | "uploading";
  progress?: number;
};

/** A single status sentence keeps every editor upload surface consistent. */
export function imageUploadLabel(fileName: string, progress?: ImageUploadProgress) {
  if (!progress) return `${fileName} · 업로드 준비 중…`;
  if (progress.stage === "uploading") return `${fileName} · 업로드 중…`;
  return `${fileName} · WebP 변환 중…${typeof progress.progress === "number" ? ` ${Math.round(progress.progress)}%` : ""}`;
}

/** Shared copy for the in-place image upload card. */
export function imageUploadStatus(progress?: ImageUploadProgress) {
  if (progress?.stage === "uploading") {
    return { title: "사진을 올리고 있어요", detail: "잠시만 기다려 주세요", progress: undefined };
  }
  const percentage = typeof progress?.progress === "number" ? Math.round(progress.progress) : 0;
  return {
    title: "사진을 준비하고 있어요",
    detail: `WebP로 최적화 중${percentage ? ` · ${percentage}%` : ""}`,
    progress: percentage,
  };
}

function uploadErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

async function nativeHeicFallback(file: File) {
  if (typeof createImageBitmap !== "function") throw new Error("이 브라우저는 HEIC 원본을 직접 읽을 수 없습니다.");
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지 변환용 캔버스를 만들지 못했습니다.");
    context.drawImage(bitmap, 0, 0);
    const jpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!jpeg) throw new Error("HEIC 이미지를 JPEG로 바꾸지 못했습니다.");
    return jpeg;
  } finally {
    bitmap.close();
  }
}

/**
 * iPhone's recent HEIC variants exceed the older libheif build bundled with
 * heic2any. Prefer the browser's decoder where it exists, then defer loading
 * the current libheif decoder until a HEIC file is actually selected.
 */
async function decodeHeic(file: File) {
  try {
    return await nativeHeicFallback(file);
  } catch (nativeError) {
    try {
      const { heicTo } = await import("heic-to");
      return await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
    } catch (decoderError) {
      const nativeMessage = uploadErrorMessage(nativeError, "브라우저 기본 디코더를 사용할 수 없습니다.");
      const decoderMessage = uploadErrorMessage(decoderError, "지원하지 않는 HEIC 형식입니다.");
      throw new Error(`HEIC 이미지를 읽지 못했습니다: ${decoderMessage} (${nativeMessage})`);
    }
  }
}

function extension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

function fileName(file: File, nextExtension: string) {
  const base = file.name.replace(/\.[^.]+$/, "") || "image";
  return `${base}.${nextExtension}`;
}

function isHeic(file: File) {
  return ["image/heic", "image/heif"].includes(file.type.toLowerCase()) || ["heic", "heif"].includes(extension(file));
}

function isGif(file: File) {
  return file.type === "image/gif" || extension(file) === "gif";
}

function canConvert(file: File) {
  return isHeic(file) || ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/avif", "image/bmp"].includes(file.type.toLowerCase()) || ["jpg", "jpeg", "png", "webp", "avif", "bmp"].includes(extension(file));
}

export function isUploadableImage(file: File) {
  return isGif(file) || canConvert(file);
}

/**
 * Converts only still raster images in the author's browser. GIFs deliberately
 * stay untouched so their animation survives, and no image bytes reach a
 * Vercel function until after the WebP conversion finishes.
 */
export async function prepareImageForUpload(file: File, onProgress?: (progress: ImageUploadProgress) => void) {
  if (!isUploadableImage(file)) throw new Error("JPEG, PNG, WebP, AVIF, BMP, HEIC/HEIF 또는 GIF 파일만 올릴 수 있습니다.");
  if (file.size > maxSourceBytes) throw new Error("변환 전 이미지 크기는 20MB 이하여야 합니다.");
  if (isGif(file)) {
    if (file.size > maxUploadBytes) throw new Error("GIF 이미지는 5MB 이하여야 합니다.");
    return file;
  }

  let source = file;
  let lastProgress = -1;
  const reportProgress = (progress: number) => {
    // Image encoders can report dozens of ticks. Limiting UI updates to 5% steps
    // keeps the surrounding editor responsive while still communicating progress.
    const nextProgress = Math.min(100, Math.max(0, Math.round(progress / 5) * 5));
    if (nextProgress === lastProgress) return;
    lastProgress = nextProgress;
    onProgress?.({ stage: "converting", progress: nextProgress });
  };
  reportProgress(0);
  if (isHeic(source)) {
    try {
      const jpeg = await decodeHeic(source);
      source = new File([jpeg], fileName(source, "jpg"), { type: "image/jpeg", lastModified: source.lastModified });
      reportProgress(30);
    } catch (error) {
      throw new Error(uploadErrorMessage(error, "HEIC 이미지를 읽지 못했습니다."));
    }
  }

  let imageCompression: typeof import("browser-image-compression").default;
  try {
    ({ default: imageCompression } = await import("browser-image-compression"));
  } catch (error) {
    throw new Error(`WebP 변환기를 불러오지 못했습니다: ${uploadErrorMessage(error, "잠시 후 다시 시도해 주세요.")}`);
  }
  const progressStart = isHeic(file) ? 30 : 0;
  let converted: File;
  try {
    converted = await imageCompression(source, {
      fileType: "image/webp",
      initialQuality: 0.86,
      maxSizeMB: 4.75,
      maxWidthOrHeight: 2_560,
      onProgress: (progress) => reportProgress(progressStart + progress * ((100 - progressStart) / 100)),
      useWebWorker: true,
    });
  } catch (error) {
    throw new Error(`WebP 변환에 실패했습니다: ${uploadErrorMessage(error, "잠시 후 다시 시도해 주세요.")}`);
  }
  if (converted.type !== "image/webp") throw new Error("이 브라우저에서는 WebP 변환을 지원하지 않습니다.");
  const webp = new File([converted], fileName(source, "webp"), { type: "image/webp", lastModified: source.lastModified });
  if (webp.size > maxUploadBytes) throw new Error("변환한 이미지가 5MB를 초과합니다. 더 작은 이미지를 선택해 주세요.");
  return webp;
}

export async function uploadImage(file: File, onProgress?: (progress: ImageUploadProgress) => void) {
  const prepared = await prepareImageForUpload(file, onProgress);
  onProgress?.({ stage: "uploading" });
  const form = new FormData();
  form.append("file", prepared);
  const response = await fetch("/api/upload", { method: "POST", body: form });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? "이미지 업로드에 실패했습니다.");
  }
  const payload = await response.json().catch(() => null) as { url?: string } | null;
  if (!payload?.url) throw new Error("이미지 업로드에 실패했습니다.");
  return { url: payload.url, file: prepared };
}
