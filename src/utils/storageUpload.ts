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
 * Includes detailed lifecycle logging for mobile debugging.
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

  const tag = `[Storage:XHR ${bucket}/${objectPath.split("/").pop()}]`;

  // Get fresh auth token
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    console.error(tag, "No auth session");
    return { ok: false, status: 401, responseText: "No auth session" };
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`;

  // Log upload target (no secrets)
  console.log(tag, "URL:", url);
  console.log(tag, `file: ${(file.size / 1024 / 1024).toFixed(2)}MB, type: ${contentType}`);
  console.log(tag, "headers set: apikey=true, Authorization=true, Content-Type=", contentType);

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

    // ── Diagnostic lifecycle events ──

    xhr.onloadstart = () => {
      console.log(tag, "EVENT onloadstart — request initiated");
    };

    xhr.onreadystatechange = () => {
      const rs = xhr.readyState;
      // Only log when status is meaningful (HEADERS_RECEIVED=2, LOADING=3, DONE=4)
      if (rs >= 2) {
        console.log(tag, `EVENT onreadystatechange — readyState=${rs}, status=${xhr.status}`);
      }
    };

    // Progress tracking (upload direction)
    if (xhr.upload) {
      xhr.upload.onloadstart = () => {
        console.log(tag, "EVENT upload.onloadstart — bytes starting to send");
      };

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          const pct = Math.round((e.loaded / e.total) * 100);
          console.log(tag, `EVENT upload.onprogress — ${e.loaded}/${e.total} (${pct}%)`);
          onProgress?.(Math.min(99, pct)); // Reserve 100 for completion
        } else {
          console.log(tag, `EVENT upload.onprogress — loaded=${e.loaded}, total=${e.total}, computable=${e.lengthComputable}`);
        }
      };

      xhr.upload.onerror = () => {
        console.error(tag, "EVENT upload.onerror — send failed");
      };

      xhr.upload.onabort = () => {
        console.warn(tag, "EVENT upload.onabort — send aborted");
      };

      xhr.upload.ontimeout = () => {
        console.error(tag, "EVENT upload.ontimeout — send timed out");
      };
    }

    // Response events
    xhr.onprogress = (e) => {
      console.log(tag, `EVENT xhr.onprogress (response) — loaded=${e.loaded}`);
    };

    xhr.onload = () => {
      const ok = xhr.status >= 200 && xhr.status < 300;
      const snippet = (xhr.responseText || "").slice(0, 200);
      console.log(tag, `EVENT onload — status=${xhr.status}, ok=${ok}, response=${snippet}`);
      resolve({ ok, status: xhr.status, responseText: xhr.responseText || "" });
    };

    xhr.onerror = () => {
      console.error(tag, `EVENT onerror — status=${xhr.status}, statusText=${xhr.statusText || "(empty)"}`);
      resolve({ ok: false, status: 0, responseText: "Network error during upload" });
    };

    xhr.ontimeout = () => {
      console.error(tag, `EVENT ontimeout — exceeded ${XHR_TIMEOUT_MS}ms`);
      resolve({ ok: false, status: 0, responseText: "Upload timed out (5 min)" });
    };

    xhr.onabort = () => {
      console.warn(tag, "EVENT onabort — upload was aborted");
      resolve({ ok: false, status: 0, responseText: "Upload aborted" });
    };

    // Send the raw file (no FormData overhead)
    console.log(tag, "calling xhr.send()...");
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
