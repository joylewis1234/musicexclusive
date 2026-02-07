import { safeStringify } from "@/utils/safeStringify";
import { supabase } from "@/integrations/supabase/client";

export type StorageXhrUploadResult = {
  ok: boolean;
  status: number;
  responseText: string;
};

function encodeStoragePath(path: string) {
  return path
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

type UploadWithXhrParams = {
  url: string;
  apikey: string;
  accessToken: string;
  bucket: string;
  objectPath: string;
  file: File;
  contentType: string;
  upsert?: boolean;
  cacheControl?: string;
  onProgress?: (pct: number) => void;
};

const RETRY_DELAYS_MS = [1500, 3000, 5000];

/**
 * PRIMARY upload method: uses the Supabase SDK directly.
 * Most reliable, no CORS / FormData issues.
 * Does NOT support progress events (shows indeterminate progress).
 */
export async function uploadToStorageWithSdk(params: {
  bucket: string;
  objectPath: string;
  file: File;
  contentType: string;
  upsert?: boolean;
  cacheControl?: string;
}): Promise<StorageXhrUploadResult> {
  const {
    bucket,
    objectPath,
    file,
    contentType,
    upsert = true,
    cacheControl = "3600",
  } = params;

  const safeObjectPath = objectPath.replace(/^\/+/, "");

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
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
        const msg = error.message || "SDK upload error";

        // Don't retry 4xx errors
        if (status >= 400 && status < 500) {
          console.warn(`[Storage SDK] Non-retryable error: ${status} - ${msg}`);
          return { ok: false, status, responseText: msg };
        }

        // Retry on 5xx or unknown errors
        if (attempt >= RETRY_DELAYS_MS.length) {
          console.error(`[Storage SDK] All attempts failed:`, msg);
          return { ok: false, status, responseText: msg };
        }

        console.warn(`[Storage SDK] Attempt ${attempt + 1} failed (${status}). Retrying...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
        continue;
      }

      return { ok: true, status: 200, responseText: JSON.stringify(data) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : safeStringify(err);

      if (attempt >= RETRY_DELAYS_MS.length) {
        console.error(`[Storage SDK] All attempts failed:`, msg);
        return { ok: false, status: 0, responseText: msg };
      }

      console.warn(`[Storage SDK] Attempt ${attempt + 1} threw. Retrying...`, msg);
      await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
  }

  return { ok: false, status: 0, responseText: "No attempt made" };
}

/**
 * FALLBACK upload method: XHR-based with progress tracking.
 * Used only if SDK upload fails or when progress tracking is critical.
 */
export async function uploadToStorageWithXhr(params: UploadWithXhrParams): Promise<StorageXhrUploadResult> {
  const {
    url,
    apikey,
    accessToken,
    bucket,
    objectPath,
    file,
    contentType,
    upsert = true,
    cacheControl = "3600",
    onProgress,
  } = params;

  const safeObjectPath = objectPath.replace(/^\/+/, "");
  const endpoint = `${url.replace(/\/+$/, "")}/storage/v1/object/${bucket}/${encodeStoragePath(safeObjectPath)}`;

  const attemptUpload = (): Promise<StorageXhrUploadResult> => {
    return new Promise<StorageXhrUploadResult>((resolve) => {
      try {
        // Force explicit content type
        const blob = file.slice(0, file.size, contentType);
        const typedFile = new File([blob], file.name || "file", { type: contentType });

        const xhr = new XMLHttpRequest();
        xhr.open("POST", endpoint);
        xhr.responseType = "text";

        xhr.setRequestHeader("apikey", apikey);
        xhr.setRequestHeader("authorization", `Bearer ${accessToken}`);
        xhr.setRequestHeader("x-upsert", upsert ? "true" : "false");

        // Send as raw binary with content-type header (more reliable than FormData)
        xhr.setRequestHeader("Content-Type", contentType);
        xhr.setRequestHeader("x-upsert", upsert ? "true" : "false");
        xhr.setRequestHeader("cache-control", `max-age=${cacheControl}`);

        xhr.upload.onprogress = (evt) => {
          try {
            if (!evt.lengthComputable) return;
            const pct = Math.max(0, Math.min(100, (evt.loaded / evt.total) * 100));
            onProgress?.(pct);
          } catch {
            // ignore progress errors
          }
        };

        xhr.onerror = () => {
          resolve({ ok: false, status: xhr.status || 0, responseText: xhr.responseText || "XHR network error" });
        };

        xhr.onabort = () => {
          resolve({ ok: false, status: xhr.status || 0, responseText: xhr.responseText || "XHR aborted" });
        };

        xhr.ontimeout = () => {
          resolve({ ok: false, status: 0, responseText: "XHR timeout" });
        };

        xhr.onload = () => {
          const status = xhr.status || 0;
          const ok = status >= 200 && status < 300;
          resolve({ ok, status, responseText: xhr.responseText || "" });
        };

        // 5 min timeout for slow mobile connections
        xhr.timeout = 300_000;

        // Send as raw binary (not FormData) for better compatibility
        xhr.send(typedFile);
      } catch (err) {
        resolve({ ok: false, status: 0, responseText: safeStringify(err) });
      }
    });
  };

  let lastResult: StorageXhrUploadResult = { ok: false, status: 0, responseText: "No attempt made" };
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    lastResult = await attemptUpload();

    if (lastResult.ok) {
      return lastResult;
    }

    if (lastResult.status >= 400 && lastResult.status < 500) {
      console.warn(`[Storage XHR] Non-retryable error: ${lastResult.status} - ${lastResult.responseText}`);
      return lastResult;
    }

    const isLastAttempt = attempt >= RETRY_DELAYS_MS.length;
    if (isLastAttempt) {
      console.error(`[Storage XHR] All ${RETRY_DELAYS_MS.length + 1} attempts failed`, lastResult);
      return lastResult;
    }

    const delay = RETRY_DELAYS_MS[attempt];
    console.warn(`[Storage XHR] Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`, lastResult);
    await new Promise((r) => setTimeout(r, delay));
  }

  return lastResult;
}

/**
 * SMART upload: tries SDK first (most reliable), falls back to XHR.
 * Returns result from whichever method succeeds first.
 */
export async function smartUpload(params: UploadWithXhrParams): Promise<StorageXhrUploadResult> {
  const { bucket, objectPath, file, contentType, upsert, cacheControl, onProgress } = params;

  console.log(`[Storage] Smart upload starting: ${bucket}/${objectPath} (${file.size} bytes)`);

  // Try SDK first (most reliable, no CORS issues)
  const sdkResult = await uploadToStorageWithSdk({
    bucket,
    objectPath,
    file,
    contentType,
    upsert,
    cacheControl,
  });

  if (sdkResult.ok) {
    console.log(`[Storage] SDK upload succeeded for ${objectPath}`);
    onProgress?.(100); // Signal completion
    return sdkResult;
  }

  console.warn(`[Storage] SDK upload failed (${sdkResult.status}: ${sdkResult.responseText}). Trying XHR fallback...`);

  // Fallback to XHR (supports progress tracking)
  const xhrResult = await uploadToStorageWithXhr(params);

  if (xhrResult.ok) {
    console.log(`[Storage] XHR fallback succeeded for ${objectPath}`);
  } else {
    console.error(`[Storage] Both SDK and XHR failed for ${objectPath}`, {
      sdk: { status: sdkResult.status, msg: sdkResult.responseText },
      xhr: { status: xhrResult.status, msg: xhrResult.responseText },
    });
  }

  return xhrResult;
}
