import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFilename, getImageContentType } from "@/utils/imageProcessing";
import { safeStringify } from "@/utils/safeStringify";
import { r2MultipartUpload } from "@/utils/r2MultipartUpload";
import { getAudioDuration } from "@/utils/audioDuration";
import { compressAudio } from "@/utils/audioCompression";
import { debugLog } from "@/utils/debugLog";

// Version marker – update on every change to confirm code is running
export const UPLOAD_HOOK_VERSION = "v11.0.0-storage-diag-2026-02-12";

// ─── DIAGNOSTIC FLAGS ───
const SKIP_COMPRESSION = true;
const SKIP_COVER_UPLOAD = false;   // covers now go to R2
const SKIP_AUDIO_UPLOAD = false;
const STORAGE_WATCHDOG_MS = 45_000; // 45s – if no XHR progress fires, surface error

export type UploadStep =
  | "idle"
  | "session_check"
  | "cover_upload"
  | "audio_upload"
  | "preview_upload"
  | "db_insert"
  | "db_update"
  | "success"
  | "error";

export interface DiagnosticLog {
  step: UploadStep;
  status: "pending" | "success" | "error";
  message: string;
  timestamp: Date;
  details?: string;
}

export interface UploadState {
  step: UploadStep;
  progress: number;
  diagnostics: DiagnosticLog[];
  errorMessage: string | null;
  trackId: string | null;
  uploadedCoverPath: string | null;
  uploadedAudioPath: string | null;
  uploadedPreviewPath: string | null;
  isTimedOut: boolean;
  lastFailedStep: UploadStep | null;
}

interface UploadParams {
  title: string;
  genre: string;
  coverFile: File;
  audioFile: File;
  previewFile?: File | null;
  previewStartSeconds?: number;
  userId: string;
}

const UPLOAD_TIMEOUT_MS = 600000; // 10 minutes
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const MAX_COVER_BYTES = 10 * 1024 * 1024;

function getAudioContentType(file: File): string {
  const type = file?.type?.toLowerCase() || "";
  if (type === "audio/mpeg" || type === "audio/mp3") return "audio/mpeg";
  if (type === "audio/wav" || type === "audio/wave" || type === "audio/x-wav") return "audio/wav";
  const ext = file?.name?.split(".")?.pop()?.toLowerCase() || "";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  return "audio/mpeg";
}

function coverExtFromContentType(ct: string) {
  if (ct === "image/png") return "png";
  if (ct === "image/webp") return "webp";
  return "jpg";
}

function audioExtFromContentType(ct: string) {
  if (ct === "audio/wav") return "wav";
  return "mp3";
}

export function useTrackUpload() {
  const [state, setState] = useState<UploadState>({
    step: "idle",
    progress: 0,
    diagnostics: [],
    errorMessage: null,
    trackId: null,
    uploadedCoverPath: null,
    uploadedAudioPath: null,
    uploadedPreviewPath: null,
    isTimedOut: false,
    lastFailedStep: null,
  });

  const abortRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addDiagnostic = useCallback((log: DiagnosticLog) => {
    const msg = `[Upload] ${log.step}: ${log.status} - ${log.message}`;
    debugLog(msg);
    console.log(msg, log.details || "");
    setState(prev => ({
      ...prev,
      diagnostics: [...prev.diagnostics, log],
    }));
  }, []);

  const setStep = useCallback((step: UploadStep, progress: number) => {
    setState(prev => ({ ...prev, step, progress }));
  }, []);

  const reset = useCallback(() => {
    abortRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState({
      step: "idle",
      progress: 0,
      diagnostics: [],
      errorMessage: null,
      trackId: null,
      uploadedCoverPath: null,
      uploadedAudioPath: null,
      uploadedPreviewPath: null,
      isTimedOut: false,
      lastFailedStep: null,
    });
  }, []);

  const cleanup = useCallback(async (_coverPath: string | null): Promise<boolean> => {
    // No-op: covers are now on R2, no Supabase Storage cleanup needed
    return false;
  }, []);

  // Kept for backward compat but now a no-op that always succeeds
  const storageTest = useCallback(
    async (_userId: string): Promise<{ ok: boolean; publicUrl?: string; error?: string }> => {
      return { ok: true, publicUrl: "" };
    },
    []
  );

  const upload = useCallback(
    async (params: UploadParams, options?: { resumeFrom?: UploadStep }): Promise<boolean> => {
      const { title, genre, coverFile, audioFile, previewFile, previewStartSeconds, userId } = params;
      const resumeFrom = options?.resumeFrom;

      const safeMsg = (fallback: string, err?: unknown) => {
        if (!err) return fallback;
        if (err instanceof Error && err.message) return err.message;
        if (typeof err === "string") return err;
        if (typeof (err as any)?.message === "string") return (err as any).message;
        return fallback;
      };

      abortRef.current = false;
      setState((prev) => ({
        ...prev,
        step: "session_check",
        progress: 5,
        errorMessage: null,
        isTimedOut: false,
        lastFailedStep: null,
      }));

      timeoutRef.current = setTimeout(() => {
        setState((prev) => ({ ...prev, isTimedOut: true }));
      }, UPLOAD_TIMEOUT_MS);

      try {
        // ── Guards ──
        if (!coverFile || !(coverFile instanceof File)) throw new Error("Missing cover file");
        if (!audioFile || !(audioFile instanceof File)) throw new Error("Missing audio file");
        if (coverFile.size > MAX_COVER_BYTES) throw new Error("Cover image too large. Please upload a file under 10MB.");
        if (audioFile.size > MAX_AUDIO_BYTES) throw new Error("Audio file too large. Please upload a file under 50MB.");

        // ── Step 1: Session ──
        debugLog(`[Upload ${UPLOAD_HOOK_VERSION}] Starting upload for "${title}"`);
        console.log(`[Upload ${UPLOAD_HOOK_VERSION}] Starting upload for "${title}"`);
        addDiagnostic({
          step: "session_check",
          status: "pending",
          message: resumeFrom ? `Retrying from ${resumeFrom}` : `Checking session... [${UPLOAD_HOOK_VERSION}]`,
          timestamp: new Date(),
          details: `version=${UPLOAD_HOOK_VERSION}`,
        });

        const getFreshToken = async (): Promise<string> => {
          // Helper: race a promise against a timeout
          const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
            Promise.race([
              promise,
              new Promise<T>((_, reject) =>
                setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
              ),
            ]);

          // 1) Try getSession (should be instant from cache, but can deadlock)
          console.time("[Upload:DIAG] auth.getSession");
          console.log("[Upload:DIAG] auth.getSession() START");
          let session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null = null;

          try {
            const { data, error } = await withTimeout(
              supabase.auth.getSession(),
              5000,
              "auth.getSession"
            );
            console.timeEnd("[Upload:DIAG] auth.getSession");
            if (error) console.warn("[Upload:DIAG] auth.getSession() error:", error);
            session = data?.session ?? null;
            console.log("[Upload:DIAG] auth.getSession() DONE; hasSession=", !!session);
          } catch (err) {
            console.timeEnd("[Upload:DIAG] auth.getSession");
            console.warn("[Upload:DIAG] auth.getSession() FAILED/TIMEOUT:", err);

            // Fallback: read session token directly from localStorage
            console.log("[Upload:DIAG] attempting localStorage fallback...");
            try {
              const storageKey = `sb-yjytuglxpvdkyvjsdyfk-auth-token`;
              const raw = localStorage.getItem(storageKey);
              if (raw) {
                const parsed = JSON.parse(raw);
                const token = parsed?.access_token || parsed?.currentSession?.access_token;
                if (token) {
                  console.log("[Upload:DIAG] localStorage fallback SUCCESS; tokenLen=", token.length);
                  return token;
                }
              }
            } catch (lsErr) {
              console.warn("[Upload:DIAG] localStorage fallback failed:", lsErr);
            }
            throw new Error("Session check timed out. Please try again.");
          }

          if (session?.access_token) {
            const expiresAt = session.expires_at ?? 0;
            const fiveMinFromNow = Math.floor(Date.now() / 1000) + 300;
            if (expiresAt > fiveMinFromNow) {
              console.log("[Upload:DIAG] token fresh; tokenLen=", session.access_token.length);
              return session.access_token;
            }

            // Token expiring soon — refresh with timeout
            console.time("[Upload:DIAG] auth.refreshSession");
            console.log("[Upload:DIAG] auth.refreshSession() START");
            try {
              const { data: refreshed } = await withTimeout(
                supabase.auth.refreshSession(),
                8000,
                "auth.refreshSession"
              );
              console.timeEnd("[Upload:DIAG] auth.refreshSession");
              if (refreshed?.session?.access_token) {
                console.log("[Upload:DIAG] refreshSession DONE; tokenLen=", refreshed.session.access_token.length);
                return refreshed.session.access_token;
              }
            } catch (err) {
              console.timeEnd("[Upload:DIAG] auth.refreshSession");
              console.warn("[Upload:DIAG] refreshSession FAILED, using existing token:", err);
            }

            return session.access_token;
          }

          throw new Error("Session expired. Please log in again.");
        };

        let currentAccessToken: string;
        try {
          console.time("[Upload:DIAG] getFreshToken");
          console.log("[Upload:DIAG] calling getFreshToken...");
          currentAccessToken = await getFreshToken();
          console.timeEnd("[Upload:DIAG] getFreshToken");
          console.log("[Upload:DIAG] token obtained, length:", currentAccessToken.length);
        } catch (err) {
          console.timeEnd("[Upload:DIAG] getFreshToken");
          console.error("[Upload:DIAG] getFreshToken FAILED:", err);
          const msg = safeMsg("No active session. Please log in again.", err);
          addDiagnostic({ step: "session_check", status: "error", message: msg, timestamp: new Date(), details: safeStringify(err) });
          throw new Error(msg);
        }

        addDiagnostic({ step: "session_check", status: "success", message: "Session valid", timestamp: new Date() });
        setStep("session_check", 10);
        console.log("[Upload:DIAG] ✅ session_check complete, progress=10");

        // ── Step 2: Artist profile (REST only – no SDK) ──
        let artistId: string;
        addDiagnostic({ step: "session_check", status: "pending", message: "Fetching artist profile via REST...", timestamp: new Date() });
        try {
          console.time("[Upload:DIAG] artistProfile REST");
          const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
          const restUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/artist_profiles?select=id&user_id=eq.${userId}&limit=1`;
          const controller = new AbortController();
          const restTimer = setTimeout(() => controller.abort(), 10000);

          console.log("[Upload:DIAG] REST artist profile fetch START:", restUrl);

          let resp: Response;
          try {
            resp = await fetch(restUrl, {
              headers: {
                apikey: anonKey,
                Authorization: `Bearer ${currentAccessToken}`,
                Accept: "application/json",
              },
              signal: controller.signal,
            });
          } catch (fetchErr: any) {
            clearTimeout(restTimer);
            if (fetchErr?.name === "AbortError") {
              const msg = "Artist profile lookup timed out after 10s";
              console.error("[Upload:DIAG]", msg);
              addDiagnostic({ step: "session_check", status: "error", message: msg, timestamp: new Date() });
              setState((prev) => ({ ...prev, errorMessage: msg }));
              throw new Error(msg);
            }
            throw fetchErr;
          }
          clearTimeout(restTimer);

          console.log("[Upload:DIAG] REST status:", resp.status, resp.statusText);
          const rawText = await resp.text();
          console.log("[Upload:DIAG] REST raw response:", rawText);

          if (resp.status !== 200) {
            const errMsg = `REST profile failed: ${resp.status} ${resp.statusText} – ${rawText.slice(0, 200)}`;
            console.error("[Upload:DIAG]", errMsg);
            addDiagnostic({ step: "session_check", status: "error", message: errMsg, timestamp: new Date(), details: rawText.slice(0, 500) });
            setState((prev) => ({ ...prev, errorMessage: errMsg }));
            throw new Error(errMsg);
          }

          const rows = JSON.parse(rawText);
          console.log("[Upload:DIAG] REST profile parsed:", rows);
          console.timeEnd("[Upload:DIAG] artistProfile REST");

          if (!Array.isArray(rows) || rows.length === 0 || !rows[0].id) {
            const msg = "Artist profile not found. Please contact support.";
            console.error("[Upload:DIAG]", msg, "userId:", userId);
            addDiagnostic({ step: "session_check", status: "error", message: msg, timestamp: new Date() });
            setState((prev) => ({ ...prev, errorMessage: msg }));
            throw new Error(msg);
          }

          artistId = rows[0].id;
          console.log("[Upload:DIAG] ✅ artistId:", artistId.slice(0, 8));
          addDiagnostic({ step: "session_check", status: "success", message: `Profile found: ${artistId.slice(0, 8)}…`, timestamp: new Date() });
        } catch (err) {
          console.timeEnd("[Upload:DIAG] artistProfile REST");
          console.error("[Upload:DIAG] artistProfile FAILED:", err);
          const msg = safeMsg("Failed to get artist profile", err);
          if (!state.errorMessage) {
            addDiagnostic({ step: "session_check", status: "error", message: msg, timestamp: new Date(), details: safeStringify(err) });
            setState((prev) => ({ ...prev, errorMessage: msg }));
          }
          throw new Error(msg);
        }

        // ── Step 3: Create track draft via Edge Function ──
        let trackId = state.trackId;
        if (!trackId || !resumeFrom || resumeFrom === "session_check" || resumeFrom === "db_insert") {
          setStep("db_insert", 15);
          addDiagnostic({ step: "db_insert", status: "pending", message: trackId ? "Re-using existing track draft" : "Creating track draft via edge function...", timestamp: new Date() });

          if (!trackId) {
            const edgeFnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-track-draft`;
            const edgeBody = JSON.stringify({
              title: title?.trim() || "Untitled",
              genre: genre || null,
            });

            console.log("[Upload:DIAG] create-track-draft START", edgeBody);
            addDiagnostic({ step: "db_insert", status: "pending", message: "Calling create-track-draft...", timestamp: new Date(), details: edgeBody });

            const callEdgeFn = async (attempt: number): Promise<{ trackId: string; artistId: string }> => {
              const controller = new AbortController();
              const timer = setTimeout(() => controller.abort(), 30000);

              try {
                console.log(`[Upload:DIAG] create-track-draft attempt ${attempt}`);
                const resp = await fetch(edgeFnUrl, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${currentAccessToken}`,
                    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  },
                  body: edgeBody,
                  signal: controller.signal,
                });
                clearTimeout(timer);

                console.log("[Upload:DIAG] create-track-draft status:", resp.status, resp.statusText);
                const rawText = await resp.text();
                console.log("[Upload:DIAG] create-track-draft raw:", rawText);

                if (!resp.ok) {
                  let detail = rawText.slice(0, 300);
                  try { detail = JSON.parse(rawText)?.error || detail; } catch {}
                  throw new Error(`Edge fn failed (${resp.status}): ${detail}`);
                }

                const result = JSON.parse(rawText);
                if (!result?.trackId) throw new Error("Edge fn returned no trackId");
                return result;
              } catch (err: any) {
                clearTimeout(timer);
                if (err?.name === "AbortError") {
                  throw new Error(`create-track-draft timed out after 30s (attempt ${attempt})`);
                }
                throw err;
              }
            };

            try {
              console.time("[Upload:DIAG] create-track-draft total");
              let result: { trackId: string; artistId: string };
              try {
                result = await callEdgeFn(1);
              } catch (firstErr) {
                console.warn("[Upload:DIAG] create-track-draft attempt 1 failed:", firstErr);
                addDiagnostic({ step: "db_insert", status: "pending", message: `Attempt 1 failed, retrying...`, timestamp: new Date(), details: safeStringify(firstErr) });
                // Wait 2s then retry once
                await new Promise(r => setTimeout(r, 2000));
                result = await callEdgeFn(2);
              }
              console.timeEnd("[Upload:DIAG] create-track-draft total");

              trackId = result.trackId;
              // Also update artistId from edge function response for consistency
              if (result.artistId) {
                artistId = result.artistId;
              }
              setState((prev) => ({ ...prev, trackId }));
              console.log("[Upload:DIAG] ✅ track draft created via edge fn, trackId:", trackId.slice(0, 8));
              addDiagnostic({ step: "db_insert", status: "success", message: "Track draft created", timestamp: new Date(), details: `trackId=${trackId}` });
            } catch (err) {
              console.timeEnd("[Upload:DIAG] create-track-draft total");
              console.error("[Upload:DIAG] create-track-draft FAILED:", err);
              const msg = safeMsg("Failed to create track draft", err);
              addDiagnostic({ step: "db_insert", status: "error", message: msg, timestamp: new Date(), details: safeStringify(err) });
              setState((prev) => ({ ...prev, lastFailedStep: "db_insert", errorMessage: `Track draft failed: ${msg}` }));
              throw new Error(msg);
            }
          }
        }

        if (!trackId) throw new Error("Failed to determine track ID for upload.");

        // ── Post-draft diagnostic entry ──
        setStep("cover_upload", 20);
        addDiagnostic({
          step: "audio_upload",
          status: "pending",
          message: `Starting storage upload… (audio size: ${(audioFile.size / 1024 / 1024).toFixed(2)} MB, type: ${audioFile.type || "unknown"}, filename: ${audioFile.name})`,
          timestamp: new Date(),
          details: `SKIP_COVER_UPLOAD=${SKIP_COVER_UPLOAD}, SKIP_AUDIO_UPLOAD=${SKIP_AUDIO_UPLOAD}`,
        });
        // ── Step 4: Compress audio client-side ──
        setStep("cover_upload", 18);
        let processedAudioFile = audioFile;
        let processedPreviewFile = previewFile;

        if (SKIP_COMPRESSION) {
          console.log("[Upload:DIAG] ⏭️ COMPRESSION SKIPPED (SKIP_COMPRESSION=true)");
          addDiagnostic({ step: "cover_upload", status: "success", message: "Compression DISABLED for diagnostics", timestamp: new Date() });
        } else {
          addDiagnostic({ step: "cover_upload", status: "pending", message: "Compressing audio...", timestamp: new Date() });
          try {
            console.time("[Upload:DIAG] audio compression");
            console.log("[Upload:DIAG] starting compression...");
            const compResult = await compressAudio(audioFile, (compPct) => {
              setStep("cover_upload", 18 + Math.round(compPct * 0.02));
            });
            console.timeEnd("[Upload:DIAG] audio compression");
            if (compResult.wasCompressed) {
              processedAudioFile = compResult.file;
              const saved = ((1 - compResult.compressedSize / compResult.originalSize) * 100).toFixed(0);
              console.log(`[Upload:DIAG] ✅ compressed: ${saved}% smaller`);
              addDiagnostic({
                step: "cover_upload",
                status: "success",
                message: `Audio compressed: ${(compResult.originalSize / 1024 / 1024).toFixed(1)}MB → ${(compResult.compressedSize / 1024 / 1024).toFixed(1)}MB (${saved}% smaller)`,
                timestamp: new Date(),
              });
            } else {
              addDiagnostic({ step: "cover_upload", status: "success", message: "Audio already optimized, no compression needed", timestamp: new Date() });
            }

            // Also compress preview if it's a WAV
            if (processedPreviewFile && processedPreviewFile instanceof File) {
              const prevExt = (processedPreviewFile.name.split(".").pop() || "").toLowerCase();
              const prevMime = (processedPreviewFile.type || "").toLowerCase();
              if (prevExt === "wav" || prevMime.includes("wav")) {
                const prevResult = await compressAudio(processedPreviewFile);
                if (prevResult.wasCompressed) {
                  processedPreviewFile = prevResult.file;
                }
              }
            }
          } catch (compErr) {
            console.timeEnd("[Upload:DIAG] audio compression");
            console.warn("[Upload:DIAG] compression failed, using original:", compErr);
            addDiagnostic({ step: "cover_upload", status: "success", message: "Compression skipped (non-critical)", timestamp: new Date() });
          }
        }

        // ── Step 5: PARALLEL upload of cover + audio (+ optional preview) ──
        setStep("cover_upload", 22);
        console.log(`[Upload:DIAG] starting uploads — cover: ${(coverFile.size/1024/1024).toFixed(1)}MB (skip=${SKIP_COVER_UPLOAD}), audio: ${(processedAudioFile.size/1024/1024).toFixed(1)}MB (skip=${SKIP_AUDIO_UPLOAD})`);
        console.time("[Upload:DIAG] storage uploads");
        addDiagnostic({ step: "cover_upload", status: "pending", message: `Uploading files... (cover skip=${SKIP_COVER_UPLOAD}, audio skip=${SKIP_AUDIO_UPLOAD})`, timestamp: new Date() });

        const coverContentType = (coverFile?.type || getImageContentType(coverFile) || "image/jpeg").toLowerCase();
        const coverExt = coverExtFromContentType(coverContentType);
        const coverPath = `artists/${artistId}/${trackId}.${coverExt}`;

        const audioContentType = getAudioContentType(processedAudioFile);
        const audioExt = audioExtFromContentType(audioContentType);
        const audioPath = `artists/${artistId}/${trackId}.${audioExt}`;

        // Track progress for both uploads simultaneously
        let coverPct = SKIP_COVER_UPLOAD ? 100 : 0;
        let audioPct = SKIP_AUDIO_UPLOAD ? 100 : 0;
        let anyProgressFired: boolean = SKIP_COVER_UPLOAD && SKIP_AUDIO_UPLOAD;

        const updateParallelProgress = () => {
          anyProgressFired = true;
          // Cover is ~20% of total weight, audio is ~60%
          const combined = 22 + (coverPct * 0.18) + (audioPct * 0.6);
          setStep(audioPct < 100 ? "audio_upload" : "cover_upload", Math.min(90, Math.round(combined)));
        };

        // ── Upload safety timeout (5 min) ──
        // TUS has its own retry logic, so we use a generous timeout instead of the old 45s watchdog.
        let watchdogFired = false;
        const TUS_SAFETY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
        const watchdogTimer = setTimeout(() => {
          if (!anyProgressFired) {
            watchdogFired = true;
            console.error("[Upload:DIAG] ❌ SAFETY TIMEOUT: No upload progress in 5 minutes");
            addDiagnostic({
              step: "audio_upload",
              status: "error",
              message: "Upload timed out — no progress in 5 minutes. Please check your connection and try again.",
              timestamp: new Date(),
              details: `coverPct=${coverPct}, audioPct=${audioPct}, anyProgress=${anyProgressFired}`,
            });
            setState((prev) => ({
              ...prev,
              errorMessage: "Upload timed out after 5 minutes. Please check your connection and try again.",
              isTimedOut: true,
            }));
          }
        }, TUS_SAFETY_TIMEOUT_MS);

        // Cover upload via R2 multipart (or skip)
        let r2CoverKey: string | null = null;
        const coverPromise = SKIP_COVER_UPLOAD
          ? Promise.resolve({ ok: true, status: 200, responseText: "SKIPPED" } as { ok: boolean; status: number; responseText: string })
          : (async () => {
              const result = await r2MultipartUpload({
                trackId: trackId!,
                file: coverFile,
                contentType: coverContentType,
                accessToken: currentAccessToken,
                fileType: "cover",
                onProgress: (pct) => { coverPct = pct; updateParallelProgress(); },
              });
              if (result.ok) {
                r2CoverKey = result.key || null;
                return { ok: true, status: 200, responseText: "R2 cover OK" };
              }
              return { ok: false, status: 0, responseText: result.error || "R2 cover upload failed" };
            })();

        // Audio upload via R2 multipart (or skip)
        let r2AudioKey: string | null = null;
        const audioPromise = SKIP_AUDIO_UPLOAD
          ? Promise.resolve({ ok: true, status: 200, responseText: "SKIPPED" } as { ok: boolean; status: number; responseText: string })
          : (async () => {
              const result = await r2MultipartUpload({
                trackId: trackId!,
                file: processedAudioFile,
                contentType: audioContentType,
                accessToken: currentAccessToken,
                onProgress: (pct) => { audioPct = pct; anyProgressFired = true; updateParallelProgress(); },
              });
              if (result.ok) {
                r2AudioKey = result.key || null;
                return { ok: true, status: 200, responseText: "R2 OK" };
              }
              return { ok: false, status: 0, responseText: result.error || "R2 upload failed" };
            })();

        // Optional preview upload via R2 as well
        let previewPath: string | null = null;
        let r2PreviewKey: string | null = null;
        let previewPromise: Promise<{ ok: boolean; status: number; responseText: string }> | null = null;
        if (processedPreviewFile && processedPreviewFile instanceof File) {
          const previewContentType = getAudioContentType(processedPreviewFile);
          const previewExt = audioExtFromContentType(previewContentType);
          previewPath = `artists/${artistId}/${trackId}_preview.${previewExt}`;
          previewPromise = (async () => {
            const result = await r2MultipartUpload({
              trackId: `${trackId}_preview`,
              file: processedPreviewFile!,
              contentType: previewContentType,
              accessToken: currentAccessToken,
              fileType: "audio",
              onProgress: () => {},
            });
            if (result.ok) {
              r2PreviewKey = result.key || null;
              return { ok: true, status: 200, responseText: "R2 preview OK" };
            }
            return { ok: false, status: 0, responseText: result.error || "R2 preview upload failed" };
          })();
        }

        // Await all uploads in parallel
        const [coverRes, audioRes, previewRes] = await Promise.all([
          coverPromise,
          audioPromise,
          previewPromise ?? Promise.resolve(null),
        ]);

        clearTimeout(watchdogTimer);
        console.timeEnd("[Upload:DIAG] storage uploads");
        console.log("[Upload:DIAG] upload results — cover:", coverRes.ok, coverRes.status, "| audio:", audioRes.ok, audioRes.status);

        if (watchdogFired) {
          // Even if uploads eventually resolved, the watchdog fired — treat as failure for diagnostics
          addDiagnostic({ step: "audio_upload", status: "error", message: "Watchdog had fired. Upload may be unreliable.", timestamp: new Date() });
        }

        // Check cover result
        if (!coverRes.ok) {
          const msg = `Cover upload failed (${coverRes.status || "network error"})`;
          addDiagnostic({ step: "cover_upload", status: "error", message: msg, timestamp: new Date(), details: coverRes.responseText });
          setState((prev) => ({ ...prev, lastFailedStep: "cover_upload" }));
          throw new Error(msg);
        }
        setState((prev) => ({ ...prev, uploadedCoverPath: coverPath }));
        addDiagnostic({ step: "cover_upload", status: "success", message: "Cover uploaded", timestamp: new Date() });

        // Check audio result
        if (!audioRes.ok) {
          const msg = `Audio upload failed (${audioRes.status || "network error"})`;
          addDiagnostic({ step: "audio_upload", status: "error", message: msg, timestamp: new Date(), details: audioRes.responseText });
          setState((prev) => ({ ...prev, lastFailedStep: "audio_upload" }));
          throw new Error(msg);
        }
        setState((prev) => ({ ...prev, uploadedAudioPath: audioPath }));
        addDiagnostic({ step: "audio_upload", status: "success", message: "Audio uploaded", timestamp: new Date() });

        // Check preview result (optional)
        if (previewRes && !previewRes.ok) {
          const msg = `Preview upload failed (${previewRes.status || "network error"})`;
          addDiagnostic({ step: "preview_upload", status: "error", message: msg, timestamp: new Date(), details: previewRes.responseText });
          setState((prev) => ({ ...prev, lastFailedStep: "preview_upload" }));
          throw new Error(msg);
        }
        if (previewRes) {
          setState((prev) => ({ ...prev, uploadedPreviewPath: previewPath }));
          addDiagnostic({ step: "preview_upload", status: "success", message: "Preview uploaded", timestamp: new Date() });
        }

        // ── Step 5: Finalize DB ──
        setStep("db_update", 92);
        addDiagnostic({ step: "db_update", status: "pending", message: "Finalizing track...", timestamp: new Date() });

        // Detect audio duration
        let audioDuration = 180;
        try {
          audioDuration = await getAudioDuration(audioFile);
        } catch (durErr) {
          console.warn("[Upload] Duration detection failed, using fallback:", durErr);
        }

        try {
          const updatePayload: Record<string, unknown> = {
            artwork_key: r2CoverKey,
            full_audio_key: r2AudioKey,
            preview_audio_key: r2PreviewKey,
            status: "ready",
            duration: audioDuration,
            preview_start_seconds: previewStartSeconds ?? 0,
          };

          // Use direct REST to avoid Supabase SDK hanging on Android Chrome
          const restUpdateUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/tracks?id=eq.${trackId}`;
          const updateController = new AbortController();
          const updateTimer = setTimeout(() => updateController.abort(), 15000);

          console.log("[Upload:DIAG] db_update via REST START");
          const updateResp = await fetch(restUpdateUrl, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Prefer: "return=minimal",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${currentAccessToken}`,
            },
            body: JSON.stringify(updatePayload),
            signal: updateController.signal,
          });
          clearTimeout(updateTimer);

          console.log("[Upload:DIAG] db_update REST status:", updateResp.status);
          if (!updateResp.ok) {
            const errText = await updateResp.text().catch(() => "");
            throw new Error(`Finalize failed (${updateResp.status}): ${errText.slice(0, 200)}`);
          }

          addDiagnostic({ step: "db_update", status: "success", message: "Track finalized", timestamp: new Date() });
        } catch (err: any) {
          if (err?.name === "AbortError") {
            const msg = "Finalize timed out after 15s. Please try again.";
            addDiagnostic({ step: "db_update", status: "error", message: msg, timestamp: new Date() });
            setState((prev) => ({ ...prev, lastFailedStep: "db_update" }));
            throw new Error(msg);
          }
          const msg = safeMsg("Failed to finalize track", err);
          addDiagnostic({ step: "db_update", status: "error", message: msg, timestamp: new Date(), details: safeStringify(err) });
          setState((prev) => ({ ...prev, lastFailedStep: "db_update" }));
          throw new Error(msg);
        }

        // ── Success ──
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
        setStep("success", 100);
        addDiagnostic({ step: "success", status: "success", message: "Track published successfully!", timestamp: new Date() });
        return true;
      } catch (err: unknown) {
        if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
        const errorMsg = safeMsg("An unexpected error occurred", err);
        console.error("[Upload] Upload failed:", err);

        // Clean up orphaned track draft so it doesn't appear as a ghost on the dashboard
        if (state.trackId) {
          try {
            await supabase.from("tracks").delete().eq("id", state.trackId).eq("status", "uploading");
            console.log("[Upload] Cleaned up orphaned track draft:", state.trackId);
          } catch (cleanupErr) {
            console.warn("[Upload] Failed to clean up draft:", cleanupErr);
          }
        }

        setState((prev) => ({ ...prev, step: "error", errorMessage: errorMsg }));
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addDiagnostic, cleanup, setStep, state.trackId, state.uploadedCoverPath]
  );

  const retry = useCallback(
    async (params: UploadParams): Promise<boolean> => {
      const resumeFrom = state.lastFailedStep;
      if (!resumeFrom) return upload(params);
      return upload(params, { resumeFrom });
    },
    [state.lastFailedStep, upload]
  );

  return {
    state,
    upload,
    retry,
    reset,
    cleanup,
    storageTest,
  };
}
