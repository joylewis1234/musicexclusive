import { safeStringify } from "@/utils/safeStringify";

export type StorageXhrUploadResult = {
  ok: boolean;
  status: number;
  responseText: string;
};

function encodeStoragePath(path: string) {
  // Keep slashes, encode path segments.
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

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * XHR-based upload to improve mobile reliability vs fetch.
 * Sends multipart/form-data to the Storage object endpoint.
 */
async function uploadToStorageWithXhrOnce(params: UploadWithXhrParams): Promise<StorageXhrUploadResult> {
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

  // IMPORTANT: do not set Content-Type header (browser needs boundary)
  const form = new FormData();
  form.append("cacheControl", cacheControl);

  // Force an explicit per-part content type
  const blob = file.slice(0, file.size, contentType);
  const typedFile = new File([blob], "file", { type: contentType });
  form.append("", typedFile);

  return await new Promise<StorageXhrUploadResult>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.responseType = "text";

    xhr.setRequestHeader("apikey", apikey);
    xhr.setRequestHeader("authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("x-upsert", upsert ? "true" : "false");

    xhr.upload.onprogress = (evt) => {
      try {
        if (!evt.lengthComputable) return;
        const pct = Math.max(0, Math.min(100, (evt.loaded / evt.total) * 100));
        onProgress?.(pct);
      } catch {
        // ignore
      }
    };

    xhr.onerror = () => {
      resolve({ ok: false, status: xhr.status || 0, responseText: xhr.responseText || "XHR network error" });
    };

    xhr.onabort = () => {
      resolve({ ok: false, status: xhr.status || 0, responseText: xhr.responseText || "XHR aborted" });
    };

    xhr.onload = () => {
      const status = xhr.status || 0;
      const ok = status >= 200 && status < 300;
      resolve({ ok, status, responseText: xhr.responseText || "" });
    };

    try {
      xhr.send(form);
    } catch (err) {
      resolve({ ok: false, status: 0, responseText: safeStringify(err) });
    }
  });
}

/**
 * XHR-based upload with automatic retry and exponential backoff.
 * Retries up to maxRetries times on network errors ("Failed to fetch", status 0, etc.).
 */
export async function uploadToStorageWithXhr(
  params: UploadWithXhrParams,
  options?: { maxRetries?: number; onRetry?: (attempt: number, delayMs: number, error: string) => void }
): Promise<StorageXhrUploadResult> {
  const maxRetries = options?.maxRetries ?? 3;
  const baseDelayMs = 1000;

  let lastResult: StorageXhrUploadResult = { ok: false, status: 0, responseText: "No attempt made" };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    lastResult = await uploadToStorageWithXhrOnce(params);

    // Success: return immediately
    if (lastResult.ok) {
      return lastResult;
    }

    // Check if this is a retryable network error
    const isNetworkError =
      lastResult.status === 0 ||
      lastResult.responseText.toLowerCase().includes("failed to fetch") ||
      lastResult.responseText.toLowerCase().includes("network error") ||
      lastResult.responseText.toLowerCase().includes("xhr network error") ||
      lastResult.responseText.toLowerCase().includes("storageunknownerror");

    // If not a network error or we've exhausted retries, return the failure
    if (!isNetworkError || attempt >= maxRetries) {
      return lastResult;
    }

    // Calculate exponential backoff delay: 1s, 2s, 4s
    const delayMs = baseDelayMs * Math.pow(2, attempt);
    
    console.log(`[StorageUpload] Retry ${attempt + 1}/${maxRetries} after ${delayMs}ms. Error: ${lastResult.responseText}`);
    
    options?.onRetry?.(attempt + 1, delayMs, lastResult.responseText);

    await sleep(delayMs);
  }

  return lastResult;
}

/**
 * Preflight check: verify bucket exists and accepts uploads.
 */
export async function preflightStorageCheck(params: {
  url: string;
  apikey: string;
  accessToken: string;
  bucket: string;
  testPath: string;
  contentType: string;
}): Promise<{ ok: boolean; publicUrl?: string; error?: string }> {
  const { url, apikey, accessToken, bucket, testPath, contentType } = params;

  try {
    // Create a tiny test file (1KB of random bytes disguised as the correct content type)
    const bytes = new Uint8Array(1024);
    try {
      crypto.getRandomValues(bytes);
    } catch {
      // If crypto isn't available, use zeros
    }
    const blob = new Blob([bytes], { type: contentType });
    const file = new File([blob], "preflight-test", { type: contentType });

    const result = await uploadToStorageWithXhr({
      url,
      apikey,
      accessToken,
      bucket,
      objectPath: testPath,
      file,
      contentType,
    });

    if (!result.ok) {
      return {
        ok: false,
        error: `Bucket "${bucket}" upload failed (status=${result.status}): ${result.responseText}`,
      };
    }

    // Generate public URL
    const publicUrl = `${url.replace(/\/+$/, "")}/storage/v1/object/public/${bucket}/${encodeStoragePath(testPath)}`;

    return { ok: true, publicUrl };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Preflight check failed",
    };
  }
}

/**
 * Check if a bucket is accessible (by attempting a HEAD request to the bucket info endpoint).
 */
export async function checkBucketExists(params: {
  url: string;
  apikey: string;
  accessToken: string;
  bucket: string;
}): Promise<{ exists: boolean; error?: string }> {
  const { url, apikey, accessToken, bucket } = params;

  try {
    const endpoint = `${url.replace(/\/+$/, "")}/storage/v1/bucket/${bucket}`;
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        apikey,
        authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      return { exists: true };
    }

    if (response.status === 404) {
      return { exists: false, error: `Bucket "${bucket}" not found` };
    }

    return { exists: false, error: `Bucket check failed (status=${response.status})` };
  } catch (err) {
    return {
      exists: false,
      error: err instanceof Error ? err.message : "Failed to check bucket",
    };
  }
}
