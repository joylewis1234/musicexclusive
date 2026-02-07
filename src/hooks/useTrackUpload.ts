import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFilename, getImageContentType } from "@/utils/imageProcessing";
import { safeStringify } from "@/utils/safeStringify";
import { uploadToStorageWithXhr } from "@/utils/storageUpload";

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
  userId: string;
}

const UPLOAD_TIMEOUT_MS = 180000; // 3 minutes to allow for retries
const MAX_AUDIO_BYTES = 50 * 1024 * 1024;
const MAX_COVER_BYTES = 10 * 1024 * 1024;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

function getAudioContentType(file: File): string {
  const type = file?.type?.toLowerCase() || "";
  
  if (type === "audio/mpeg" || type === "audio/mp3") return "audio/mpeg";
  if (type === "audio/wav" || type === "audio/wave" || type === "audio/x-wav") return "audio/wav";
  
  const ext = file?.name?.split(".")?.pop()?.toLowerCase() || "";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  
  return "audio/mpeg";
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

  const cleanup = useCallback(async (coverPath: string | null): Promise<boolean> => {
    if (!coverPath) return false;
    
    try {
      console.log("[Upload] Cleaning up orphaned cover:", coverPath);
      const { error } = await supabase.storage.from("track_covers").remove([coverPath]);
      if (error) {
        console.error("[Upload] Failed to cleanup cover:", error);
        return false;
      } else {
        console.log("[Upload] Cover cleaned up successfully");
        return true;
      }
    } catch (err) {
      console.error("[Upload] Cleanup error:", err);
      return false;
    }
  }, []);

  const storageTest = useCallback(
    async (userId: string): Promise<{ ok: boolean; publicUrl?: string; error?: string }> => {
      try {
        addDiagnostic({
          step: "session_check",
          status: "pending",
          message: "Storage preflight: uploading tiny JPG to verify storage connectivity...",
          timestamp: new Date(),
        });

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const session = sessionData?.session;
        const accessToken = session?.access_token;
        if (sessionError || !session || !accessToken) {
          const msg = sessionError?.message || "No active session for storage test";
          addDiagnostic({
            step: "session_check",
            status: "error",
            message: msg,
            timestamp: new Date(),
            details: safeStringify(sessionError ?? { reason: "missing session/access token" }),
          });
          return { ok: false, error: msg };
        }

        const { data: artistProfile, error: profileError } = await supabase
          .from("artist_profiles")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        const artistId = artistProfile?.id;
        if (profileError || !artistId) {
          const msg = profileError?.message || "Artist profile not found";
          addDiagnostic({
            step: "session_check",
            status: "error",
            message: msg,
            timestamp: new Date(),
            details: safeStringify(profileError ?? { reason: "missing artist profile" }),
          });
          return { ok: false, error: msg };
        }

        const bytes = new Uint8Array(1024);
        try {
          crypto.getRandomValues(bytes);
        } catch {
          // If crypto isn't available for some reason, leave zeros.
        }
        const blob = new Blob([bytes], { type: "image/jpeg" });
        const file = new File([blob], "preflight.jpg", { type: "image/jpeg" });
        const objectPath = `preflight/${artistId}/${Date.now()}.jpg`;

        const res = await uploadToStorageWithXhr({
          url: SUPABASE_URL,
          apikey: SUPABASE_PUBLISHABLE_KEY,
          accessToken,
          bucket: "track_covers",
          objectPath,
          file,
          contentType: "image/jpeg",
        });

        if (!res.ok) {
          const msg = "Storage preflight failed";
          addDiagnostic({
            step: "session_check",
            status: "error",
            message: msg,
            timestamp: new Date(),
            details: safeStringify({ status: res.status, responseText: res.responseText, objectPath }),
          });
          console.error("[Upload] Storage preflight failed:", res);
          return { ok: false, error: `${msg} (status=${res.status || "?"})` };
        }

        const publicUrl =
          supabase.storage.from("track_covers").getPublicUrl(objectPath).data?.publicUrl || "";

        addDiagnostic({
          step: "session_check",
          status: "success",
          message: "Storage preflight succeeded",
          timestamp: new Date(),
          details: safeStringify({ objectPath, publicUrl, status: res.status }),
        });

        return { ok: true, publicUrl };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Storage preflight failed";
        addDiagnostic({
          step: "session_check",
          status: "error",
          message: msg,
          timestamp: new Date(),
          details: safeStringify(err),
        });
        console.error("[Upload] Storage preflight unexpected error:", err);
        return { ok: false, error: msg };
      }
    },
    [addDiagnostic]
  );

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

  const upload = useCallback(
    async (params: UploadParams, options?: { resumeFrom?: UploadStep }): Promise<boolean> => {
      const { title, genre, coverFile, audioFile, previewFile, userId } = params;
      const resumeFrom = options?.resumeFrom;

      const safeMsg = (fallback: string, err?: unknown) => {
        if (!err) return fallback;
        if (err instanceof Error && err.message) return err.message;
        if (typeof err === "string") return err;
        if (typeof (err as any)?.message === "string") return (err as any).message;
        return fallback;
      };

      const safeStatus = (err?: unknown): string | undefined => {
        const sc = (err as any)?.statusCode ?? (err as any)?.status;
        return sc ? String(sc) : undefined;
      };

      const coverExtFromContentType = (ct: string) => {
        if (ct === "image/png") return "png";
        if (ct === "image/webp") return "webp";
        return "jpg";
      };

      const audioExtFromContentType = (ct: string) => {
        if (ct === "audio/wav") return "wav";
        return "mp3";
      };

      abortRef.current = false;
      setState((prev) => ({
        ...prev,
        step: "session_check",
        progress: 5,
        // keep diagnostics for retry attempts
        errorMessage: null,
        isTimedOut: false,
        lastFailedStep: null,
      }));

      // Set timeout
      timeoutRef.current = setTimeout(() => {
        setState((prev) => ({ ...prev, isTimedOut: true }));
      }, UPLOAD_TIMEOUT_MS);

      try {
        // Local file guards (avoid white screens from unexpected null access)
        if (!coverFile || !(coverFile instanceof File)) {
          throw new Error("Missing cover file");
        }
        if (!audioFile || !(audioFile instanceof File)) {
          throw new Error("Missing audio file");
        }

        if (coverFile.size > MAX_COVER_BYTES) {
          throw new Error("Cover image too large. Please upload a file under 10MB.");
        }
        if (audioFile.size > MAX_AUDIO_BYTES) {
          throw new Error("Audio file too large. Please upload a file under 50MB.");
        }

        // Step 1: Session check
        addDiagnostic({
          step: "session_check",
          status: "pending",
          message: resumeFrom ? `Retrying from ${resumeFrom} (session check)` : "Checking session...",
          timestamp: new Date(),
          details: `online=${typeof navigator !== "undefined" ? navigator.onLine : "?"}`,
        });

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        const session = sessionData?.session;
        const accessToken = session?.access_token;
        if (sessionError || !session) {
          const msg = safeMsg("No active session. Please log in again.", sessionError);
          addDiagnostic({
            step: "session_check",
            status: "error",
            message: msg,
            timestamp: new Date(),
            details: safeStringify(sessionError ?? { reason: "missing session" }),
          });
          console.error("[Upload] Session check failed:", sessionError);
          throw new Error(msg);
        }
        if (!accessToken) {
          const msg = "Missing access token. Please log in again.";
          addDiagnostic({
            step: "session_check",
            status: "error",
            message: msg,
            timestamp: new Date(),
            details: safeStringify({ reason: "missing session.access_token" }),
          });
          throw new Error(msg);
        }

        addDiagnostic({
          step: "session_check",
          status: "success",
          message: "Session valid",
          timestamp: new Date(),
        });
        setStep("session_check", 10);

        // Optional preflight (non-blocking). Useful on Android where Storage fetch can fail mid-transfer.
        // We only run it for a fresh attempt (not for mid-step resume).
        if (!resumeFrom) {
          await storageTest(userId);
        }

        // Step 2: Get artist profile
        let artistId: string;
        try {
          const { data: artistProfile, error: profileError } = await supabase
            .from("artist_profiles")
            .select("id")
            .eq("user_id", userId)
            .maybeSingle();

          if (profileError || !artistProfile?.id) {
            const msg = profileError
              ? safeMsg("Profile query failed", profileError)
              : "Artist profile not found. Please complete your profile setup.";
            throw new Error(msg);
          }

          artistId = artistProfile.id;
        } catch (err) {
          const msg = safeMsg("Failed to get artist profile", err);
          addDiagnostic({
            step: "session_check",
            status: "error",
            message: msg,
            timestamp: new Date(),
            details: safeStringify(err),
          });
          console.error("[Upload] Profile check failed:", err);
          throw new Error(msg);
        }

        // Step 3: Create track record FIRST (DB-first workflow)
        let trackId = state.trackId;
        if (!trackId || !resumeFrom || resumeFrom === "session_check" || resumeFrom === "db_insert") {
          setStep("db_insert", 15);
          addDiagnostic({
            step: "db_insert",
            status: "pending",
            message: trackId ? "Re-using existing track draft" : "Creating track draft (status=uploading)...",
            timestamp: new Date(),
          });

          if (!trackId) {
            try {
              const { data: trackRow, error: trackErr } = await supabase
                .from("tracks")
                // Cast to any to avoid stale generated types lagging behind migrations
                .insert(({
                  artist_id: artistId,
                  title: title?.trim() || "Untitled",
                  genre: genre || null,
                  artwork_url: null,
                  full_audio_url: null,
                  status: "uploading",
                } as any))
                .select("id")
                .maybeSingle();

              if (trackErr || !trackRow?.id) {
                const msg = safeMsg("Failed to create track draft", trackErr ?? trackRow);
                throw { message: msg, error: trackErr, data: trackRow };
              }

              trackId = trackRow.id;
              setState((prev) => ({ ...prev, trackId }));
              addDiagnostic({
                step: "db_insert",
                status: "success",
                message: "Track draft created",
                timestamp: new Date(),
                details: `trackId=${trackId}`,
              });
            } catch (err) {
              const msg = safeMsg("Failed to create track draft", err);
              addDiagnostic({
                step: "db_insert",
                status: "error",
                message: msg,
                timestamp: new Date(),
                details: safeStringify(err),
              });
              console.error("[Upload] Track draft insert failed:", err);
              setState((prev) => ({ ...prev, lastFailedStep: "db_insert" }));
              throw new Error(msg);
            }
          }
        }

        if (!trackId) {
          // Should be impossible, but guard anyway.
          throw new Error("Failed to determine track ID for upload.");
        }

        // Step 4: Upload cover (unique path based on trackId)
        const coverContentType = (coverFile?.type || getImageContentType(coverFile) || "image/jpeg").toLowerCase();
        const coverExt = coverExtFromContentType(coverContentType);
        const coverPath = `artists/${artistId}/${trackId}.${coverExt}`;

        if (!resumeFrom || resumeFrom === "cover_upload") {
          setStep("cover_upload", 30);
          addDiagnostic({
            step: "cover_upload",
            status: "pending",
            message: "Uploading cover art...",
            timestamp: new Date(),
            details: safeStringify({
              path: coverPath,
              contentType: coverContentType,
              fileName: coverFile?.name,
              fileSize: coverFile?.size,
            }),
          });

          try {
            const res = await uploadToStorageWithXhr({
              url: SUPABASE_URL,
              apikey: SUPABASE_PUBLISHABLE_KEY,
              accessToken,
              bucket: "track_covers",
              objectPath: coverPath,
              file: coverFile,
              contentType: coverContentType,
              onProgress: (pct) => {
                // Map 0-100 -> 30-55
                const mapped = 30 + Math.round(pct * 0.25);
                setStep("cover_upload", mapped);
              },
            });

            if (!res.ok) {
              const msg = safeMsg("Cover upload failed", res);
              throw { message: msg, statusCode: String(res.status || ""), error: res, data: null };
            }

            setState((prev) => ({ ...prev, uploadedCoverPath: coverPath }));
            addDiagnostic({
              step: "cover_upload",
              status: "success",
              message: "Cover uploaded",
              timestamp: new Date(),
              details: safeStringify({ path: coverPath, status: res.status }),
            });
          } catch (err) {
            const msg = safeMsg("Cover upload failed", err);
            addDiagnostic({
              step: "cover_upload",
              status: "error",
              message: msg,
              timestamp: new Date(),
              details: safeStringify(err),
            });
            console.error("[Upload] Cover upload failed:", err);
            setState((prev) => ({ ...prev, lastFailedStep: "cover_upload" }));
            throw new Error(msg);
          }
        }

        // Step 5: Upload audio (unique path based on trackId)
        const audioContentType = getAudioContentType(audioFile);
        const audioExt = audioExtFromContentType(audioContentType);
        const audioSafeName = sanitizeFilename(audioFile?.name || `audio.${audioExt}`);
        const audioPath = `artists/${artistId}/${trackId}.${audioExt}`; // ignore user filename; path is trackId

        if (!resumeFrom || resumeFrom === "audio_upload") {
          setStep("audio_upload", 60);
          addDiagnostic({
            step: "audio_upload",
            status: "pending",
            message: "Uploading audio file...",
            timestamp: new Date(),
            details: safeStringify({
              path: audioPath,
              contentType: audioContentType,
              fileName: audioFile?.name,
              sanitizedFileName: audioSafeName,
              fileSize: audioFile?.size,
            }),
          });

          try {
            const res = await uploadToStorageWithXhr({
              url: SUPABASE_URL,
              apikey: SUPABASE_PUBLISHABLE_KEY,
              accessToken,
              bucket: "track_audio",
              objectPath: audioPath,
              file: audioFile,
              contentType: audioContentType,
              onProgress: (pct) => {
                // Map 0-100 -> 60-85
                const mapped = 60 + Math.round(pct * 0.25);
                setStep("audio_upload", mapped);
              },
            });

            if (!res.ok) {
              const msg = safeMsg("Audio upload failed", res);
              throw { message: msg, statusCode: String(res.status || ""), error: res, data: null };
            }

            setState((prev) => ({ ...prev, uploadedAudioPath: audioPath }));
            addDiagnostic({
              step: "audio_upload",
              status: "success",
              message: "Audio uploaded",
              timestamp: new Date(),
              details: safeStringify({ path: audioPath, status: res.status }),
            });
          } catch (err) {
            const msg = safeMsg("Audio upload failed", err);
            addDiagnostic({
              step: "audio_upload",
              status: "error",
              message: msg,
              timestamp: new Date(),
              details: safeStringify(err),
            });
            console.error("[Upload] Audio upload failed:", err);
            // Keep cover uploaded so we can retry audio only.
            setState((prev) => ({ ...prev, lastFailedStep: "audio_upload" }));
            throw new Error(msg);
          }
        }

        // Step 6: Upload preview audio (optional)
        let previewPath: string | null = null;
        if (previewFile && previewFile instanceof File) {
          const previewContentType = getAudioContentType(previewFile);
          const previewExt = audioExtFromContentType(previewContentType);
          previewPath = `artists/${artistId}/${trackId}_preview.${previewExt}`;

          if (!resumeFrom || resumeFrom === "preview_upload") {
            setStep("preview_upload", 86);
            addDiagnostic({
              step: "preview_upload",
              status: "pending",
              message: "Uploading preview clip...",
              timestamp: new Date(),
              details: safeStringify({
                path: previewPath,
                contentType: previewContentType,
                fileName: previewFile.name,
                fileSize: previewFile.size,
              }),
            });

            try {
              const res = await uploadToStorageWithXhr({
                url: SUPABASE_URL,
                apikey: SUPABASE_PUBLISHABLE_KEY,
                accessToken,
                bucket: "track_audio",
                objectPath: previewPath,
                file: previewFile,
                contentType: previewContentType,
                onProgress: (pct) => {
                  const mapped = 86 + Math.round(pct * 0.04);
                  setStep("preview_upload", mapped);
                },
              });

              if (!res.ok) {
                const msg = safeMsg("Preview upload failed", res);
                throw { message: msg, statusCode: String(res.status || ""), error: res, data: null };
              }

              setState((prev) => ({ ...prev, uploadedPreviewPath: previewPath }));
              addDiagnostic({
                step: "preview_upload",
                status: "success",
                message: "Preview uploaded",
                timestamp: new Date(),
                details: safeStringify({ path: previewPath, status: res.status }),
              });
            } catch (err) {
              const msg = safeMsg("Preview upload failed", err);
              addDiagnostic({
                step: "preview_upload",
                status: "error",
                message: msg,
                timestamp: new Date(),
                details: safeStringify(err),
              });
              console.error("[Upload] Preview upload failed:", err);
              setState((prev) => ({ ...prev, lastFailedStep: "preview_upload" }));
              throw new Error(msg);
            }
          }
        }

        // Step 7: Update DB with URLs + status=ready
        setStep("db_update", 90);
        addDiagnostic({
          step: "db_update",
          status: "pending",
          message: "Finalizing track (saving URLs)...",
          timestamp: new Date(),
        });

        const coverPublicUrl = supabase.storage.from("track_covers").getPublicUrl(coverPath).data?.publicUrl || "";
        const audioPublicUrl = supabase.storage.from("track_audio").getPublicUrl(audioPath).data?.publicUrl || "";
        const previewPublicUrl = previewPath
          ? supabase.storage.from("track_audio").getPublicUrl(previewPath).data?.publicUrl || null
          : null;

        try {
          const updatePayload: Record<string, unknown> = {
            artwork_url: coverPublicUrl,
            full_audio_url: audioPublicUrl,
            status: "ready",
          };
          if (previewPublicUrl) {
            updatePayload.preview_audio_url = previewPublicUrl;
          }

          const { error: updateErr } = await supabase
            .from("tracks")
            .update(updatePayload as any)
            .eq("id", trackId);

          if (updateErr) {
            const msg = safeMsg("Failed to finalize track", updateErr);
            throw { message: msg, error: updateErr };
          }

          addDiagnostic({
            step: "db_update",
            status: "success",
            message: "Track finalized",
            timestamp: new Date(),
            details: safeStringify({ trackId, coverPublicUrl, audioPublicUrl, previewPublicUrl }),
          });
        } catch (err) {
          const msg = safeMsg("Failed to finalize track", err);
          addDiagnostic({
            step: "db_update",
            status: "error",
            message: msg,
            timestamp: new Date(),
            details: safeStringify(err),
          });
          console.error("[Upload] Track finalize failed:", err);
          setState((prev) => ({ ...prev, lastFailedStep: "db_update" }));
          throw new Error(msg);
        }

        // Success!
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        setStep("success", 100);
        addDiagnostic({
          step: "success",
          status: "success",
          message: "Track published successfully!",
          timestamp: new Date(),
        });

        return true;
      } catch (err: unknown) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        const errorMsg = safeMsg("An unexpected error occurred", err);
        console.error("[Upload] Upload failed:", err);

        setState((prev) => ({
          ...prev,
          step: "error",
          errorMessage: errorMsg,
        }));

        return false;
      }
    },
    // Intentionally depend on current state to enable resume logic.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addDiagnostic, cleanup, setStep, state.trackId, state.uploadedCoverPath, storageTest]
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
