import { supabase } from "@/integrations/supabase/client";

export type StorageUploadResult = {
  ok: boolean;
  status: number;
  responseText: string;
};

const SINGLE_RETRY_DELAY_MS = 2000;

/**
 * Lean upload: uses Supabase SDK with a single retry on 5xx/network errors.
 * No preflight, no XHR fallback, no multi-minute timeout chains.
 */
export async function uploadToStorage(params: {
  bucket: string;
  objectPath: string;
  file: File;
  contentType: string;
  upsert?: boolean;
  cacheControl?: string;
  onProgress?: (pct: number) => void;
}): Promise<StorageUploadResult> {
  const {
    bucket,
    objectPath,
    file,
    contentType,
    upsert = true,
    cacheControl = "3600",
    onProgress,
  } = params;

  const safeObjectPath = objectPath.replace(/^\/+/, "");

  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      // Force content type on the file
      const blob = file.slice(0, file.size, contentType);
      const typedFile = new File([blob], file.name || "file", { type: contentType });

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(safeObjectPath, typedFile, {
          cacheControl,
          upsert,
          contentType,
        });

      if (error) {
        const status = (error as any)?.statusCode || (error as any)?.status || 500;
        const msg = error.message || "Upload error";

        // Don't retry 4xx errors (bad request, auth issues, etc.)
        if (status >= 400 && status < 500) {
          console.warn(`[Storage] Non-retryable error: ${status} - ${msg}`);
          return { ok: false, status, responseText: msg };
        }

        if (attempt === 1) {
          console.error(`[Storage] Both attempts failed:`, msg);
          return { ok: false, status, responseText: msg };
        }

        console.warn(`[Storage] Attempt 1 failed (${status}). Retrying in ${SINGLE_RETRY_DELAY_MS}ms...`);
        await new Promise((r) => setTimeout(r, SINGLE_RETRY_DELAY_MS));
        continue;
      }

      // Signal 100% on success
      onProgress?.(100);
      return { ok: true, status: 200, responseText: JSON.stringify(data) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      if (attempt === 1) {
        console.error(`[Storage] Both attempts failed:`, msg);
        return { ok: false, status: 0, responseText: msg };
      }

      console.warn(`[Storage] Attempt 1 threw. Retrying...`, msg);
      await new Promise((r) => setTimeout(r, SINGLE_RETRY_DELAY_MS));
    }
  }

  return { ok: false, status: 0, responseText: "No attempt made" };
}

// Legacy aliases so existing code that imports smartUpload still works
export type StorageXhrUploadResult = StorageUploadResult;

export const uploadToStorageWithSdk = (params: {
  bucket: string;
  objectPath: string;
  file: File;
  contentType: string;
  upsert?: boolean;
  cacheControl?: string;
}) => uploadToStorage(params);

export const smartUpload = (params: {
  url?: string;
  apikey?: string;
  accessToken?: string;
  bucket: string;
  objectPath: string;
  file: File;
  contentType: string;
  upsert?: boolean;
  cacheControl?: string;
  onProgress?: (pct: number) => void;
}) => uploadToStorage(params);
