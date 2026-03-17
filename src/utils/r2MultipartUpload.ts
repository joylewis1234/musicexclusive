/**
 * R2 Multipart Upload Client
 * 
 * Uploads audio files to Cloudflare R2 via presigned URLs.
 * - 5 MB chunks
 * - Up to 5 retries per part with exponential backoff
 * - Real-time progress callback
 * - localStorage resume support
 */

import { debugLog } from "@/utils/debugLog";
import { SUPABASE_ANON_KEY, EDGE_FUNCTIONS_URL } from "@/config/supabase";

const PART_SIZE = 5_242_880; // 5 MB — must match edge function
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1_000;

interface UploadState {
  uploadId: string;
  key: string;
  trackId: string;
  totalParts: number;
  completedParts: { partNumber: number; etag: string }[];
  totalBytes: number;
}

const LS_KEY_PREFIX = "r2_upload_";

function getResumeKey(trackId: string) {
  return `${LS_KEY_PREFIX}${trackId}`;
}

function saveState(state: UploadState) {
  try {
    localStorage.setItem(getResumeKey(state.trackId), JSON.stringify(state));
  } catch { /* ignore */ }
}

function loadState(trackId: string): UploadState | null {
  try {
    const raw = localStorage.getItem(getResumeKey(trackId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearState(trackId: string) {
  try {
    localStorage.removeItem(getResumeKey(trackId));
  } catch { /* ignore */ }
}

async function callEdgeFn(
  fnName: string,
  body: Record<string, unknown>,
  token: string,
  timeoutMs = 30_000
): Promise<any> {
  const url = `${EDGE_FUNCTIONS_URL}/functions/v1/${fnName}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const text = await resp.text();
    if (!resp.ok) {
      let detail = text.slice(0, 300);
      try { detail = JSON.parse(text)?.error || detail; } catch { /* ignore */ }
      throw new Error(`${fnName} failed (${resp.status}): ${detail}`);
    }
    return JSON.parse(text);
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === "AbortError") {
      throw new Error(`${fnName} timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  }
}

async function uploadPartWithRetry(params: {
  uploadId: string;
  key: string;
  partNumber: number;
  body: Blob;
  token: string;
  tag: string;
  attempt?: number;
}): Promise<string> {
  const { uploadId, key, partNumber, body, token, tag, attempt = 1 } = params;

  try {
    // 1. Get presigned URL from sign-upload-part edge function
    const signResult = await callEdgeFn("sign-upload-part", {
      uploadId,
      key,
      partNumber,
    }, token);

    const presignedUrl = signResult?.presignedUrl;
    if (!presignedUrl) {
      throw new Error("Missing presignedUrl from sign-upload-part");
    }

    // 2. PUT chunk directly to R2 via presigned URL
    const putResp = await fetch(presignedUrl, {
      method: "PUT",
      body,
    });

    if (!putResp.ok) {
      const text = await putResp.text().catch(() => "");
      throw new Error(`R2 PUT failed: ${putResp.status} ${text.slice(0, 200)}`);
    }

    // 3. Extract ETag from response headers
    const etag = putResp.headers.get("ETag") || putResp.headers.get("etag");
    if (!etag) {
      throw new Error("Missing ETag from R2 PUT response");
    }

    debugLog(`${tag} ✅ Part ${partNumber} uploaded, etag=${etag}`);
    console.log(tag, `Part ${partNumber} uploaded, etag=${etag}`);
    return etag;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    debugLog(`${tag} ⚠️ Part ${partNumber} attempt ${attempt}/${MAX_RETRIES} failed: ${msg}`);
    console.warn(tag, `Part ${partNumber} attempt ${attempt}/${MAX_RETRIES} failed:`, msg);

    if (attempt >= MAX_RETRIES) {
      throw new Error(`Part ${partNumber} failed after ${MAX_RETRIES} attempts: ${msg}`);
    }

    await new Promise((r) => setTimeout(r, 250 * attempt));
    return uploadPartWithRetry({ ...params, attempt: attempt + 1 });
  }
}

export interface R2UploadResult {
  ok: boolean;
  key?: string;
  error?: string;
}

/**
 * Upload an audio file to R2 using multipart upload with presigned URLs.
 */
export async function r2MultipartUpload(params: {
  trackId: string;
  file: File;
  contentType: string;
  accessToken: string;
  fileType?: "audio" | "cover" | "preview";
  onProgress?: (pct: number) => void;
}): Promise<R2UploadResult> {
  const { trackId, file, contentType, accessToken, fileType = "audio", onProgress } = params;
  const tag = `[R2:${file.name?.slice(0, 20)}]`;

  debugLog(`${tag} Starting R2 multipart upload — ${(file.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(tag, `Starting — ${(file.size / 1024 / 1024).toFixed(2)} MB, type=${contentType}`);

  const totalParts = Math.ceil(file.size / PART_SIZE);

  // Check for resumable state
  let savedState = loadState(trackId);
  let uploadId: string;
  let key: string;
  let completedParts: { partNumber: number; etag: string }[] = [];

  if (savedState && savedState.uploadId && savedState.key && savedState.totalParts === totalParts) {
    // Resume
    uploadId = savedState.uploadId;
    key = savedState.key;
    completedParts = savedState.completedParts || [];
    debugLog(`${tag} Resuming upload: ${completedParts.length}/${totalParts} parts done`);
    console.log(tag, `Resuming: ${completedParts.length}/${totalParts} parts done`);
  } else {
    // Fresh initiation
    clearState(trackId);
    debugLog(`${tag} Initiating new multipart upload...`);
    console.log(tag, "Initiating new multipart upload...");

    const initResult = await callEdgeFn("initiate-multipart-upload", {
      trackId,
      contentType,
      fileName: file.name,
      fileType,
    }, accessToken);

    uploadId = initResult.uploadId;
    key = initResult.key;

    debugLog(`${tag} Initiated: uploadId=${uploadId}, key=${key}`);
    console.log(tag, `Initiated: uploadId=${uploadId}, key=${key}`);
  }

  // Save state for resume
  const state: UploadState = {
    uploadId,
    key,
    trackId,
    totalParts,
    completedParts,
    totalBytes: file.size,
  };
  saveState(state);

  // Upload parts sequentially (to avoid overwhelming mobile connections)
  const completedSet = new Set(completedParts.map((p) => p.partNumber));
  let bytesUploaded = completedParts.length * PART_SIZE;

  // Report initial progress from resumed parts
  if (completedParts.length > 0) {
    const pct = Math.round((bytesUploaded / file.size) * 100);
    onProgress?.(Math.min(99, pct));
  }

  for (let partNum = 1; partNum <= totalParts; partNum++) {
    if (completedSet.has(partNum)) continue;

    // Slice the chunk
    const start = (partNum - 1) * PART_SIZE;
    const end = Math.min(start + PART_SIZE, file.size);
    const chunk = file.slice(start, end);

    // Upload through proxy with retries
    const etag = await uploadPartWithRetry({
      uploadId,
      key,
      partNumber: partNum,
      body: chunk,
      token: accessToken,
      tag,
    });

    // Track completion
    completedParts.push({ partNumber: partNum, etag });
    bytesUploaded = Math.min(end, file.size);
    state.completedParts = completedParts;
    saveState(state);

    // Report progress
    const pct = Math.round((bytesUploaded / file.size) * 100);
    onProgress?.(Math.min(99, pct));

    debugLog(`${tag} Progress: ${pct}% (${completedParts.length}/${totalParts} parts)`);
  }

  // Complete the upload
  debugLog(`${tag} All parts uploaded. Completing...`);
  console.log(tag, "All parts uploaded. Completing...");

  const completeResult = await callEdgeFn("complete-multipart-upload", {
    uploadId,
    key,
    parts: completedParts,
  }, accessToken);

  // Clean up localStorage
  clearState(trackId);
  onProgress?.(100);

  debugLog(`${tag} ✅ R2 upload complete: key=${completeResult.key}`);
  console.log(tag, "R2 upload complete:", completeResult.key);

  return {
    ok: true,
    key: completeResult.key,
  };
}
