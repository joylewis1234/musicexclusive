import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFilename, getImageContentType } from "@/utils/imageProcessing";
import { safeStringify } from "@/utils/safeStringify";
import { uploadToStorage } from "@/utils/storageUpload";
import { getAudioDuration } from "@/utils/audioDuration";
import { compressAudio } from "@/utils/audioCompression";

// Version marker – update on every change to confirm code is running
export const UPLOAD_HOOK_VERSION = "v9.0.0-diag-2026-02-11";

// ─── DIAGNOSTIC FLAG: set to true to skip compression entirely ───
const SKIP_COMPRESSION = true;

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
    console.log(`[Upload] ${log.step}: ${log.status} - ${log.message}`, log.details || "");
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

  const cleanup = useCallback(async (coverPath: string | null): Promise<boolean> => {
    if (!coverPath) return false;
    try {
      const { error } = await supabase.storage.from("track_covers").remove([coverPath]);
      return !error;
    } catch {
      return false;
    }
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

        // ── Step 2: Artist profile ──
        let artistId: string;
        try {
          console.time("[Upload:DIAG] artistProfile query");
          console.log("[Upload:DIAG] querying artist_profiles...");
          const { data: artistProfile, error: profileError } = await supabase
            .from("artist_profiles")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();
          console.timeEnd("[Upload:DIAG] artistProfile query");
          if (profileError || !artistProfile?.id) {
            throw new Error(profileError ? safeMsg("Profile query failed", profileError) : "Artist profile not found.");
          }
          artistId = artistProfile.id;
          console.log("[Upload:DIAG] ✅ artistId:", artistId.slice(0, 8));
        } catch (err) {
          console.timeEnd("[Upload:DIAG] artistProfile query");
          console.error("[Upload:DIAG] artistProfile FAILED:", err);
          const msg = safeMsg("Failed to get artist profile", err);
          addDiagnostic({ step: "session_check", status: "error", message: msg, timestamp: new Date(), details: safeStringify(err) });
          throw new Error(msg);
        }

        // ── Step 3: Create track draft ──
        let trackId = state.trackId;
        if (!trackId || !resumeFrom || resumeFrom === "session_check" || resumeFrom === "db_insert") {
          setStep("db_insert", 15);
          addDiagnostic({ step: "db_insert", status: "pending", message: trackId ? "Re-using existing track draft" : "Creating track draft...", timestamp: new Date() });

          if (!trackId) {
            const insertPayload = {
              artist_id: artistId,
              title: title?.trim() || "Untitled",
              genre: genre || null,
              artwork_url: null,
              full_audio_url: null,
              status: "uploading",
            };
            console.log("[Upload:DIAG] INSERT START", JSON.stringify(insertPayload));
            addDiagnostic({ step: "db_insert", status: "pending", message: "Inserting track draft...", timestamp: new Date(), details: JSON.stringify(insertPayload) });

            try {
              console.time("[Upload:DIAG] track draft insert");

              const insertPromise = supabase
                .from("tracks")
                .insert((insertPayload as any))
                .select("id")
                .maybeSingle();

              const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("Track draft insert timed out after 15s")), 15000)
              );

              const { data: trackRow, error: trackErr } = await Promise.race([insertPromise, timeoutPromise]);

              console.timeEnd("[Upload:DIAG] track draft insert");
              console.log("[Upload:DIAG] INSERT RESPONSE", { data: trackRow, error: trackErr });

              if (trackErr) {
                console.error("[Upload:DIAG] INSERT ERROR", trackErr);
                const errDetail = safeStringify(trackErr);
                const msg = trackErr.message || trackErr.details || trackErr.hint || "Unknown insert error";
                addDiagnostic({ step: "db_insert", status: "error", message: msg, timestamp: new Date(), details: errDetail });
                setState((prev) => ({ ...prev, lastFailedStep: "db_insert", errorMessage: `DB insert failed: ${msg}` }));
                throw new Error(msg);
              }

              if (!trackRow?.id) {
                const msg = "Insert returned no row ID";
                console.error("[Upload:DIAG] INSERT ERROR – no id returned", trackRow);
                addDiagnostic({ step: "db_insert", status: "error", message: msg, timestamp: new Date(), details: safeStringify(trackRow) });
                setState((prev) => ({ ...prev, lastFailedStep: "db_insert", errorMessage: `DB insert failed: ${msg}` }));
                throw new Error(msg);
              }

              trackId = trackRow.id;
              setState((prev) => ({ ...prev, trackId }));
              console.log("[Upload:DIAG] ✅ track draft created, trackId:", trackId.slice(0, 8));
              addDiagnostic({ step: "db_insert", status: "success", message: "Track draft created", timestamp: new Date(), details: `trackId=${trackId}` });
            } catch (err) {
              console.timeEnd("[Upload:DIAG] track draft insert");
              console.error("[Upload:DIAG] INSERT CATCH:", err);
              const msg = safeMsg("Failed to create track draft", err);
              if (!state.errorMessage) {
                addDiagnostic({ step: "db_insert", status: "error", message: msg, timestamp: new Date(), details: safeStringify(err) });
                setState((prev) => ({ ...prev, lastFailedStep: "db_insert", errorMessage: `DB insert failed: ${msg}` }));
              }
              throw new Error(msg);
            }
          }
        }

        if (!trackId) throw new Error("Failed to determine track ID for upload.");

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
        setStep("cover_upload", 20);
        console.log(`[Upload:DIAG] starting parallel uploads — cover: ${(coverFile.size/1024/1024).toFixed(1)}MB, audio: ${(processedAudioFile.size/1024/1024).toFixed(1)}MB`);
        console.time("[Upload:DIAG] parallel uploads");
        addDiagnostic({ step: "cover_upload", status: "pending", message: "Uploading cover art + audio in parallel...", timestamp: new Date() });

        const coverContentType = (coverFile?.type || getImageContentType(coverFile) || "image/jpeg").toLowerCase();
        const coverExt = coverExtFromContentType(coverContentType);
        const coverPath = `artists/${artistId}/${trackId}.${coverExt}`;

        const audioContentType = getAudioContentType(processedAudioFile);
        const audioExt = audioExtFromContentType(audioContentType);
        const audioPath = `artists/${artistId}/${trackId}.${audioExt}`;

        // Track progress for both uploads simultaneously
        let coverPct = 0;
        let audioPct = 0;
        const updateParallelProgress = () => {
          // Cover is ~20% of total weight, audio is ~60%
          const combined = 20 + (coverPct * 0.2) + (audioPct * 0.6);
          setStep(audioPct < 100 ? "audio_upload" : "cover_upload", Math.min(90, Math.round(combined)));
        };

        const coverPromise = uploadToStorage({
          bucket: "track_covers",
          objectPath: coverPath,
          file: coverFile,
          contentType: coverContentType,
          onProgress: (pct) => { coverPct = pct; updateParallelProgress(); },
        });

        const audioPromise = uploadToStorage({
          bucket: "track_audio",
          objectPath: audioPath,
          file: processedAudioFile,
          contentType: audioContentType,
          onProgress: (pct) => { audioPct = pct; updateParallelProgress(); },
        });

        // Optional preview upload runs in parallel too
        let previewPath: string | null = null;
        let previewPromise: Promise<{ ok: boolean; status: number; responseText: string }> | null = null;
        if (processedPreviewFile && processedPreviewFile instanceof File) {
          const previewContentType = getAudioContentType(processedPreviewFile);
          const previewExt = audioExtFromContentType(previewContentType);
          previewPath = `artists/${artistId}/${trackId}_preview.${previewExt}`;
          previewPromise = uploadToStorage({
            bucket: "track_audio",
            objectPath: previewPath,
            file: processedPreviewFile,
            contentType: previewContentType,
          });
        }

        // Await all uploads in parallel
        const [coverRes, audioRes, previewRes] = await Promise.all([
          coverPromise,
          audioPromise,
          previewPromise ?? Promise.resolve(null),
        ]);

        console.timeEnd("[Upload:DIAG] parallel uploads");
        console.log("[Upload:DIAG] upload results — cover:", coverRes.ok, coverRes.status, "| audio:", audioRes.ok, audioRes.status);

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

        const coverPublicUrl = supabase.storage.from("track_covers").getPublicUrl(coverPath).data?.publicUrl || "";
        const audioPublicUrl = supabase.storage.from("track_audio").getPublicUrl(audioPath).data?.publicUrl || "";
        const previewPublicUrl = previewPath
          ? supabase.storage.from("track_audio").getPublicUrl(previewPath).data?.publicUrl || null
          : null;

        // Detect audio duration
        let audioDuration = 180;
        try {
          audioDuration = await getAudioDuration(audioFile);
        } catch (durErr) {
          console.warn("[Upload] Duration detection failed, using fallback:", durErr);
        }

        try {
          const updatePayload: Record<string, unknown> = {
            artwork_url: coverPublicUrl,
            full_audio_url: audioPublicUrl,
            status: "ready",
            duration: audioDuration,
            preview_start_seconds: previewStartSeconds ?? 0,
          };
          if (previewPublicUrl) updatePayload.preview_audio_url = previewPublicUrl;

          const { error: updateErr } = await supabase
            .from("tracks")
            .update(updatePayload as any)
            .eq("id", trackId);

          if (updateErr) throw new Error(safeMsg("Failed to finalize track", updateErr));

          addDiagnostic({ step: "db_update", status: "success", message: "Track finalized", timestamp: new Date() });
        } catch (err) {
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
