import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFilename, getImageContentType } from "@/utils/imageProcessing";
import { safeStringify } from "@/utils/safeStringify";

export type UploadStep = "idle" | "session_check" | "cover_upload" | "audio_upload" | "db_insert" | "success" | "error";

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
  isTimedOut: boolean;
  lastFailedStep: UploadStep | null;
}

interface UploadParams {
  title: string;
  genre: string;
  coverFile: File;
  audioFile: File;
  userId: string;
}

const UPLOAD_TIMEOUT_MS = 120000; // 2 minutes

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
      isTimedOut: false,
      lastFailedStep: null,
    });
  }, []);

  const upload = useCallback(
    async (params: UploadParams, options?: { resumeFrom?: UploadStep }): Promise<boolean> => {
      const { title, genre, coverFile, audioFile, userId } = params;
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

        addDiagnostic({
          step: "session_check",
          status: "success",
          message: "Session valid",
          timestamp: new Date(),
        });
        setStep("session_check", 10);

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
        const coverContentType = getImageContentType(coverFile);
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
            const { data: coverData, error: coverError } = await supabase.storage
              .from("track_covers")
              .upload(coverPath, coverFile, {
                cacheControl: "3600",
                upsert: true,
                contentType: coverContentType,
              });

            if (coverError || !coverData?.path) {
              const msg = safeMsg("Cover upload failed", coverError ?? coverData);
              const sc = safeStatus(coverError);
              throw { message: msg, statusCode: sc, error: coverError, data: coverData };
            }

            setState((prev) => ({ ...prev, uploadedCoverPath: coverData.path }));
            addDiagnostic({
              step: "cover_upload",
              status: "success",
              message: "Cover uploaded",
              timestamp: new Date(),
              details: `path=${coverData.path}`,
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
            const { data: audioData, error: audioError } = await supabase.storage
              .from("track_audio")
              .upload(audioPath, audioFile, {
                cacheControl: "3600",
                upsert: true,
                contentType: audioContentType,
              });

            if (audioError || !audioData?.path) {
              const msg = safeMsg("Audio upload failed", audioError ?? audioData);
              const sc = safeStatus(audioError);
              throw { message: msg, statusCode: sc, error: audioError, data: audioData };
            }

            setState((prev) => ({ ...prev, uploadedAudioPath: audioData.path }));
            addDiagnostic({
              step: "audio_upload",
              status: "success",
              message: "Audio uploaded",
              timestamp: new Date(),
              details: `path=${audioData.path}`,
            });
          } catch (err) {
            // Cleanup cover if audio fails (or force re-upload on retry)
            const coverPathToCleanup = state.uploadedCoverPath ?? coverPath;
            const deleted = await cleanup(coverPathToCleanup).catch(() => false);
            if (deleted) {
              setState((prev) => ({ ...prev, uploadedCoverPath: null }));
            }

            const msg = safeMsg("Audio upload failed", err);
            addDiagnostic({
              step: "audio_upload",
              status: "error",
              message: msg,
              timestamp: new Date(),
              details: safeStringify(err),
            });
            console.error("[Upload] Audio upload failed:", err);
            setState((prev) => ({ ...prev, lastFailedStep: deleted ? "cover_upload" : "audio_upload" }));
            throw new Error(msg);
          }
        }

        // Step 6: Update DB with URLs + status=ready
        setStep("db_insert", 85);
        addDiagnostic({
          step: "db_insert",
          status: "pending",
          message: "Finalizing track (saving URLs)...",
          timestamp: new Date(),
        });

        const coverPublicUrl = supabase.storage.from("track_covers").getPublicUrl(coverPath).data?.publicUrl || "";
        const audioPublicUrl = supabase.storage.from("track_audio").getPublicUrl(audioPath).data?.publicUrl || "";

        try {
          const { error: updateErr } = await supabase
            .from("tracks")
            .update(({
              artwork_url: coverPublicUrl,
              full_audio_url: audioPublicUrl,
              status: "ready",
            } as any))
            .eq("id", trackId);

          if (updateErr) {
            const msg = safeMsg("Failed to finalize track", updateErr);
            throw { message: msg, error: updateErr };
          }

          addDiagnostic({
            step: "db_insert",
            status: "success",
            message: "Track finalized",
            timestamp: new Date(),
            details: safeStringify({ trackId, coverPublicUrl, audioPublicUrl }),
          });
        } catch (err) {
          const msg = safeMsg("Failed to finalize track", err);
          addDiagnostic({
            step: "db_insert",
            status: "error",
            message: msg,
            timestamp: new Date(),
            details: safeStringify(err),
          });
          console.error("[Upload] Track finalize failed:", err);
          setState((prev) => ({ ...prev, lastFailedStep: "db_insert" }));
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
  };
}
