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

const RETRY_DELAYS_MS = [1500, 3000, 5000]; // 3 retries with exponential back-off

/**
 * XHR-based upload with automatic retry on network errors.
 * Improved mobile reliability vs fetch.
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
        const form = new FormData();
        form.append("cacheControl", cacheControl);

        // Force explicit content type
        const blob = file.slice(0, file.size, contentType);
        const typedFile = new File([blob], "file", { type: contentType });
        form.append("", typedFile);

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

        // Set a generous timeout for slow mobile connections (90s)
        xhr.timeout = 90_000;

        xhr.send(form);
      } catch (err) {
        resolve({ ok: false, status: 0, responseText: safeStringify(err) });
      }
    });
  };

  // Retry logic with exponential back-off
  let lastResult: StorageXhrUploadResult = { ok: false, status: 0, responseText: "No attempt made" };
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    lastResult = await attemptUpload();

    if (lastResult.ok) {
      return lastResult;
    }

    // Don't retry on 4xx client errors (e.g., 403 Forbidden, 400 Bad Request)
    if (lastResult.status >= 400 && lastResult.status < 500) {
      console.warn(`[Storage] Non-retryable error: ${lastResult.status} - ${lastResult.responseText}`);
      return lastResult;
    }

    // Retry on network errors or 5xx server errors
    const isLastAttempt = attempt >= RETRY_DELAYS_MS.length;
    if (isLastAttempt) {
      console.error(`[Storage] All ${RETRY_DELAYS_MS.length + 1} attempts failed`, lastResult);
      return lastResult;
    }

    const delay = RETRY_DELAYS_MS[attempt];
    console.warn(`[Storage] Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`, lastResult);
    await new Promise((r) => setTimeout(r, delay));
  }

  return lastResult;
}
