/**
 * Upload helper utilities for the "Upload Exclusive Track" page.
 * processCoverArt – client-side resize/compress before upload.
 * validateAudio   – lightweight validation (type + size).
 *
 * These helpers are intentionally SEPARATE from the existing
 * imageProcessing.ts / storageUpload.ts so we don't alter shared code.
 */

import imageCompression from "browser-image-compression";

/* ------------------------------------------------------------------ */
/*  Feature flag – set to false to bypass new processing and fall     */
/*  back to the previous raw-file behaviour.                          */
/* ------------------------------------------------------------------ */
export const SAFE_UPLOADS = true;

/* ------------------------------------------------------------------ */
/*  Cover Art Processing                                               */
/* ------------------------------------------------------------------ */

export interface CoverArtMeta {
  name: string;
  processedSize: number;
  type: string;
  width: number;
  height: number;
}

export interface ProcessedCoverArt {
  file: File;
  previewDataUrl: string;      // base64 data-url safe for localStorage
  meta: CoverArtMeta;
}

const COVER_MAX_DIMENSION = 1600;
const COVER_TARGET_SIZE_MB = 1.5;
const COVER_INITIAL_QUALITY = 0.8;
const COVER_MIN_QUALITY = 0.4;
const COVER_VALID_TYPES = ["image/jpeg", "image/png", "image/webp"];
const COVER_VALID_EXTS = ["jpg", "jpeg", "png", "webp"];
const COVER_MAX_INPUT_SIZE = 30 * 1024 * 1024; // generous input limit

function extOf(name: string) {
  return (name.split(".").pop() || "").toLowerCase();
}

function isValidCoverType(file: File): boolean {
  const ext = extOf(file.name);
  return COVER_VALID_TYPES.includes(file.type.toLowerCase()) || COVER_VALID_EXTS.includes(ext);
}

/** Read image dimensions from a File without keeping it in memory long. */
function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image dimensions."));
    };
    img.src = url;
  });
}

/** Convert a File/Blob to a base64 data-url string (safe for localStorage). */
function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file for preview."));
    reader.readAsDataURL(file);
  });
}

/**
 * Process a user-selected cover image:
 *  1. Validate type + size.
 *  2. Resize to max 1600×1600 (preserve aspect).
 *  3. Compress to WEBP (or JPEG fallback).
 *  4. Iterate quality down if still > 1.5 MB.
 *  5. Return processed File + base64 preview + metadata.
 */
export async function processCoverArt(file: File): Promise<ProcessedCoverArt> {
  // --- Validate ---
  if (!isValidCoverType(file)) {
    throw new Error("Invalid image format. Please upload a JPG, PNG, or WEBP file.");
  }
  if (file.size > COVER_MAX_INPUT_SIZE) {
    throw new Error("Image too large (max 30 MB input). Please choose a smaller file.");
  }

  // --- Choose output type ---
  // Prefer WEBP; older Safari may not encode to WEBP via canvas so fall back to JPEG.
  const supportsWebp = typeof OffscreenCanvas !== "undefined" || (() => {
    try {
      const c = document.createElement("canvas");
      return c.toDataURL("image/webp").startsWith("data:image/webp");
    } catch {
      return false;
    }
  })();
  const outputType = supportsWebp ? "image/webp" : "image/jpeg";

  // --- Compress iteratively ---
  let quality = COVER_INITIAL_QUALITY;
  let compressed: File | null = null;

  while (quality >= COVER_MIN_QUALITY) {
    try {
      const blob = await imageCompression(file, {
        maxSizeMB: COVER_TARGET_SIZE_MB,
        maxWidthOrHeight: COVER_MAX_DIMENSION,
        useWebWorker: true,
        fileType: outputType as any,
        initialQuality: quality,
        alwaysKeepResolution: false,
      });

      const ext = outputType === "image/webp" ? "webp" : "jpg";
      compressed = new File([blob], `cover-${Date.now()}.${ext}`, { type: outputType });

      if (compressed.size <= COVER_TARGET_SIZE_MB * 1024 * 1024) {
        break; // under target
      }
    } catch (err) {
      console.warn("[processCoverArt] compression attempt failed at quality", quality, err);
    }
    quality -= 0.1;
  }

  if (!compressed) {
    throw new Error("Failed to compress cover art. Please try a different image.");
  }

  if (compressed.size > COVER_TARGET_SIZE_MB * 1024 * 1024) {
    // We tried our best – warn but still allow (server will accept up to 10 MB)
    console.warn("[processCoverArt] Could not compress below target; final size:", compressed.size);
  }

  // --- Read dimensions ---
  let dims = { width: 0, height: 0 };
  try {
    dims = await readImageDimensions(compressed);
  } catch {
    // non-critical
  }

  // --- Generate preview data-url ---
  // Create a tiny preview (max ~200px) for localStorage to keep storage small.
  let previewDataUrl: string;
  try {
    const previewBlob = await imageCompression(compressed, {
      maxSizeMB: 0.05,
      maxWidthOrHeight: 200,
      useWebWorker: true,
      fileType: "image/jpeg" as any,
      initialQuality: 0.6,
    });
    previewDataUrl = await fileToDataUrl(previewBlob);
  } catch {
    previewDataUrl = await fileToDataUrl(compressed);
  }

  return {
    file: compressed,
    previewDataUrl,
    meta: {
      name: file.name,
      processedSize: compressed.size,
      type: compressed.type,
      width: dims.width,
      height: dims.height,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Audio Validation                                                    */
/* ------------------------------------------------------------------ */

export interface AudioMeta {
  name: string;
  size: number;
  type: string;
  isWav: boolean;
}

const AUDIO_MAX_BYTES = 50 * 1024 * 1024;
const AUDIO_VALID_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/wave", "audio/x-wav"];
const AUDIO_VALID_EXTS = ["mp3", "wav"];

/**
 * Validate an audio file (MP3 or WAV).
 * Returns AudioMeta on success; throws a user-friendly Error on failure.
 */
export function validateAudio(file: File): AudioMeta {
  const ext = extOf(file.name);
  const mime = (file.type || "").toLowerCase();
  const isValid = AUDIO_VALID_EXTS.includes(ext) || AUDIO_VALID_TYPES.includes(mime);

  if (!isValid) {
    throw new Error("Invalid audio format. Please upload an MP3 or WAV file.");
  }
  if (file.size > AUDIO_MAX_BYTES) {
    throw new Error("Audio file too large. Please upload a file under 50 MB.");
  }

  const isWav = ext === "wav" || mime.includes("wav");

  return {
    name: file.name,
    size: file.size,
    type: mime || (isWav ? "audio/wav" : "audio/mpeg"),
    isWav,
  };
}

/* ------------------------------------------------------------------ */
/*  Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
