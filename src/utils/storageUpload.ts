import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/utils/debugLog";

export type StorageUploadResult = {
  ok: boolean;
  status: number;
  responseText: string;
};

const SINGLE_RETRY_DELAY_MS = 2000;
const XHR_TIMEOUT_MS = 300_000; // 5 minutes

// ── PREVIEW-ONLY TOGGLE: fetch fallback for Android Chrome stalls ──
const USE_FETCH_UPLOAD = true;
const XHR_STALL_NO_START_MS = 5_000;   // 5s – if upload.onloadstart hasn't fired
const XHR_STALL_NO_PROGRESS_MS = 15_000; // 15s – if onloadstart fired but no onprogress

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
      debugLog(`[Storage] Non-retryable error: ${result.status}`);
      console.warn(`[Storage] Non-retryable error: ${result.status}`);
        return result;
      }

      if (attempt === 1) {
        debugLog(`[Storage] Both attempts failed: ${result.responseText}`);
        console.error(`[Storage] Both attempts failed: ${result.responseText}`);
        return result;
      }

      debugLog(`[Storage] Attempt 1 failed (${result.status}). Retrying...`);
      console.warn(`[Storage] Attempt 1 failed (${result.status}). Retrying...`);
      await new Promise((r) => setTimeout(r, SINGLE_RETRY_DELAY_MS));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      if (attempt === 1) {
        debugLog(`[Storage] Both attempts threw: ${msg}`);
        console.error(`[Storage] Both attempts failed:`, msg);
        return { ok: false, status: 0, responseText: msg };
      }

      debugLog(`[Storage] Attempt 1 threw. Retrying... ${msg}`);
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
  debugLog(`${tag} URL: ${url}`);
  debugLog(`${tag} file: ${(file.size / 1024 / 1024).toFixed(2)}MB, type: ${contentType}`);
  debugLog(`${tag} headers: apikey=${!!anonKey}, Authorization=${!!token}, Content-Type=${contentType}`);
  debugLog(`${tag} Transport: XHR (USE_FETCH_UPLOAD=${USE_FETCH_UPLOAD})`);
  console.log(tag, "URL:", url);
  console.log(tag, `file: ${(file.size / 1024 / 1024).toFixed(2)}MB, type: ${contentType}`);
  console.log(tag, "headers set: apikey=true, Authorization=true, Content-Type=", contentType);

  // Build headers object for potential fetch fallback
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    apikey: anonKey,
    "Content-Type": contentType,
    "Cache-Control": cacheControl,
  };
  if (upsert) headers["x-upsert"] = "true";

  return new Promise<StorageUploadResult>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.timeout = XHR_TIMEOUT_MS;

    // Headers
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));

    // ── Stall detection state ──
    let uploadStartFired = false;
    let progressFired = false;
    let xhrAbortedForFallback = false;
    let stallTimer: ReturnType<typeof setTimeout> | null = null;
    let progressStallTimer: ReturnType<typeof setTimeout> | null = null;

    const clearStallTimers = () => {
      if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; }
      if (progressStallTimer) { clearTimeout(progressStallTimer); progressStallTimer = null; }
    };

    const triggerFetchFallback = (reason: string) => {
      if (xhrAbortedForFallback) return;
      xhrAbortedForFallback = true;
      clearStallTimers();
      debugLog(`${tag} ⚠️ XHR stalled: ${reason}. Aborting XHR, trying FETCH fallback...`);
      console.warn(tag, `XHR stalled: ${reason}. Trying FETCH fallback...`);
      try { xhr.abort(); } catch {}
      // Do fetch fallback
      fetchUpload({ url, headers, file, tag, onProgress })
        .then(resolve)
        .catch(() => resolve({ ok: false, status: 0, responseText: `XHR stalled (${reason}) and fetch fallback also failed` }));
    };

    // ── Diagnostic lifecycle events ──

    xhr.onloadstart = () => {
      debugLog(`${tag} EVENT onloadstart — request initiated`);
      console.log(tag, "EVENT onloadstart — request initiated");
    };

    xhr.onreadystatechange = () => {
      const rs = xhr.readyState;
      if (rs >= 2) {
        debugLog(`${tag} EVENT onreadystatechange — readyState=${rs}, status=${xhr.status}`);
        console.log(tag, `EVENT onreadystatechange — readyState=${rs}, status=${xhr.status}`);
      }
    };

    // Progress tracking (upload direction)
    if (xhr.upload) {
      xhr.upload.onloadstart = () => {
        uploadStartFired = true;
        debugLog(`${tag} EVENT upload.onloadstart — bytes starting to send`);
        console.log(tag, "EVENT upload.onloadstart — bytes starting to send");
        // Clear the 5s no-start timer, start 15s no-progress timer
        if (stallTimer) { clearTimeout(stallTimer); stallTimer = null; }
        if (USE_FETCH_UPLOAD && !progressFired) {
          progressStallTimer = setTimeout(() => {
            if (!progressFired && !xhrAbortedForFallback) {
              triggerFetchFallback("upload.onloadstart fired but no onprogress in 15s");
            }
          }, XHR_STALL_NO_PROGRESS_MS);
        }
      };

      xhr.upload.onprogress = (e) => {
        progressFired = true;
        clearStallTimers(); // All good — progress is flowing
        if (e.lengthComputable && e.total > 0) {
          const pct = Math.round((e.loaded / e.total) * 100);
          debugLog(`${tag} EVENT upload.onprogress — ${e.loaded}/${e.total} (${pct}%)`);
          console.log(tag, `EVENT upload.onprogress — ${e.loaded}/${e.total} (${pct}%)`);
          onProgress?.(Math.min(99, pct));
        } else {
          debugLog(`${tag} EVENT upload.onprogress — loaded=${e.loaded}, total=${e.total}, computable=${e.lengthComputable}`);
          console.log(tag, `EVENT upload.onprogress — loaded=${e.loaded}, total=${e.total}, computable=${e.lengthComputable}`);
        }
      };

      xhr.upload.onerror = () => {
        debugLog(`${tag} EVENT upload.onerror — send failed`);
        console.error(tag, "EVENT upload.onerror — send failed");
      };

      xhr.upload.onabort = () => {
        debugLog(`${tag} EVENT upload.onabort — send aborted`);
        console.warn(tag, "EVENT upload.onabort — send aborted");
      };

      xhr.upload.ontimeout = () => {
        debugLog(`${tag} EVENT upload.ontimeout — send timed out`);
        console.error(tag, "EVENT upload.ontimeout — send timed out");
      };
    }

    // Response events
    xhr.onprogress = (e) => {
      debugLog(`${tag} EVENT xhr.onprogress (response) — loaded=${e.loaded}`);
      console.log(tag, `EVENT xhr.onprogress (response) — loaded=${e.loaded}`);
    };

    xhr.onload = () => {
      if (xhrAbortedForFallback) return; // fetch fallback is handling it
      clearStallTimers();
      const ok = xhr.status >= 200 && xhr.status < 300;
      const snippet = (xhr.responseText || "").slice(0, 200);
      debugLog(`${tag} EVENT onload — status=${xhr.status}, ok=${ok}, response=${snippet}`);
      console.log(tag, `EVENT onload — status=${xhr.status}, ok=${ok}, response=${snippet}`);
      resolve({ ok, status: xhr.status, responseText: xhr.responseText || "" });
    };

    xhr.onerror = () => {
      if (xhrAbortedForFallback) return;
      clearStallTimers();
      debugLog(`${tag} EVENT onerror — status=${xhr.status}, statusText=${xhr.statusText || "(empty)"}`);
      console.error(tag, `EVENT onerror — status=${xhr.status}, statusText=${xhr.statusText || "(empty)"}`);
      // If USE_FETCH_UPLOAD, try fallback on network error too
      if (USE_FETCH_UPLOAD) {
        triggerFetchFallback("xhr.onerror fired");
      } else {
        resolve({ ok: false, status: 0, responseText: "Network error during upload" });
      }
    };

    xhr.ontimeout = () => {
      if (xhrAbortedForFallback) return;
      clearStallTimers();
      debugLog(`${tag} EVENT ontimeout — exceeded ${XHR_TIMEOUT_MS}ms`);
      console.error(tag, `EVENT ontimeout — exceeded ${XHR_TIMEOUT_MS}ms`);
      resolve({ ok: false, status: 0, responseText: "Upload timed out (5 min)" });
    };

    xhr.onabort = () => {
      if (xhrAbortedForFallback) return; // expected abort
      clearStallTimers();
      debugLog(`${tag} EVENT onabort — upload was aborted`);
      console.warn(tag, "EVENT onabort — upload was aborted");
      resolve({ ok: false, status: 0, responseText: "Upload aborted" });
    };

    // Send the raw file (no FormData overhead)
    debugLog(`${tag} calling xhr.send()...`);
    console.log(tag, "calling xhr.send()...");
    xhr.send(file);

    // ── Start 5s stall timer AFTER xhr.send() ──
    if (USE_FETCH_UPLOAD) {
      stallTimer = setTimeout(() => {
        if (!uploadStartFired && !xhrAbortedForFallback) {
          triggerFetchFallback("upload.onloadstart did NOT fire within 5s");
        }
      }, XHR_STALL_NO_START_MS);
    }
  });
}

/**
 * Fetch-based upload fallback for environments where XHR stalls (Android Chrome).
 * No progress events available, but reliably sends the payload.
 */
async function fetchUpload(params: {
  url: string;
  headers: Record<string, string>;
  file: File;
  tag: string;
  onProgress?: (pct: number) => void;
}): Promise<StorageUploadResult> {
  const { url, headers, file, tag, onProgress } = params;
  const ftag = tag.replace("XHR", "FETCH");

  debugLog(`${ftag} Transport: FETCH fallback — starting upload to ${url}`);
  console.log(ftag, "Transport: FETCH fallback — starting upload");

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers,
      body: file,
    });

    const responseText = await resp.text();
    const ok = resp.ok;
    const snippet = responseText.slice(0, 200);

    debugLog(`${ftag} ✅ FETCH complete — status=${resp.status}, ok=${ok}, response=${snippet}`);
    console.log(ftag, `FETCH complete — status=${resp.status}, ok=${ok}, response=${snippet}`);

    if (ok) {
      onProgress?.(100);
    }

    return { ok, status: resp.status, responseText };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    debugLog(`${ftag} ❌ FETCH failed: ${msg}`);
    console.error(ftag, "FETCH failed:", msg);
    return { ok: false, status: 0, responseText: `Fetch fallback failed: ${msg}` };
  }
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
