import { supabase } from "@/integrations/supabase/client";

export type StorageUploadResult = {
  ok: boolean;
  status: number;
  responseText: string;
};

const SINGLE_RETRY_DELAY_MS = 2000;
const XHR_TIMEOUT_MS = 300_000; // 5 minutes

/**
 * XHR-based upload to Supabase Storage with real-time progress tracking.
 * Falls back to SDK if XHR fails with a non-server error.
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
      const result = await xhrUpload({
        bucket,
        objectPath: safeObjectPath,
        file,
        contentType,
        upsert,
        cacheControl,
        onProgress,
      });

      if (result.ok) {
        onProgress?.(100);
        return result;
      }

      // Don't retry 4xx
      if (result.status >= 400 && result.status < 500) {
        console.warn(`[Storage] Non-retryable error: ${result.status}`);
        return result;
      }

      if (attempt === 1) {
        console.error(`[Storage] Both attempts failed: ${result.responseText}`);
        return result;
      }

      console.warn(`[Storage] Attempt 1 failed (${result.status}). Retrying...`);
      await new Promise((r) => setTimeout(r, SINGLE_RETRY_DELAY_MS));
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

/**
 * Direct XHR upload to Supabase Storage REST API.
 * Provides real upload.onprogress events for accurate tracking.
 */
async function xhrUpload(params: {
  bucket: string;
  objectPath: string;
  file: File;
  contentType: string;
  upsert: boolean;
  cacheControl: string;
  onProgress?: (pct: number) => void;
}): Promise<StorageUploadResult> {
  const { bucket, objectPath, file, contentType, upsert, cacheControl, onProgress } = params;

  // Get fresh auth token
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    return { ok: false, status: 401, responseText: "No auth session" };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;

  return new Promise<StorageUploadResult>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.timeout = XHR_TIMEOUT_MS;

    // Headers
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("Cache-Control", cacheControl);
    if (upsert) {
      xhr.setRequestHeader("x-upsert", "true");
    }

    // Progress tracking
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          const pct = Math.round((e.loaded / e.total) * 100);
          onProgress(Math.min(99, pct)); // Reserve 100 for completion
        }
      };
    }

    xhr.onload = () => {
      const ok = xhr.status >= 200 && xhr.status < 300;
      resolve({ ok, status: xhr.status, responseText: xhr.responseText || "" });
    };

    xhr.onerror = () => {
      resolve({ ok: false, status: 0, responseText: "Network error during upload" });
    };

    xhr.ontimeout = () => {
      resolve({ ok: false, status: 0, responseText: "Upload timed out (5 min)" });
    };

    xhr.onabort = () => {
      resolve({ ok: false, status: 0, responseText: "Upload aborted" });
    };

    // Send the raw file (no FormData overhead)
    xhr.send(file);
  });
}

// Legacy aliases
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
