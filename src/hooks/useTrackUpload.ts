import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFilename, getImageContentType } from "@/utils/imageProcessing";
import { safeStringify } from "@/utils/safeStringify";
import { uploadToStorageWithXhr, checkBucketExists, preflightStorageCheck } from "@/utils/storageUpload";

export type UploadStep =
  | "idle"
  | "preflight"
  | "session_check"
  | "cover_upload"
  | "audio_upload"
  | "db_insert"
  | "db_update"
  | "success"
  | "error";

export interface DiagnosticLog {
  step: UploadStep;
  status: "pending" | "success" | "error" | "retry";
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
  retryCount: number;
}

interface UploadParams {
  title: string;
  genre: string;
  coverFile: File;
  audioFile: File;
  userId: string;
}

const UPLOAD_TIMEOUT_MS = 180000; // 3 minutes for slower networks
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

function getUserFriendlyError(error: string): string {
  const lowerError = error.toLowerCase();
  
  if (lowerError.includes("failed to fetch") || lowerError.includes("network error")) {
    return "Network connection lost. Please check your internet and try again.";
  }
  if (lowerError.includes("storageunknownerror")) {
    return "Storage temporarily unavailable. Please wait a moment and retry.";
  }
  if (lowerError.includes("unauthorized") || lowerError.includes("401")) {
    return "Session expired. Please log in again.";
  }
  if (lowerError.includes("forbidden") || lowerError.includes("403")) {
    return "Upload permission denied. Please contact support.";
  }
  if (lowerError.includes("too large") || lowerError.includes("413")) {
    return "File is too large. Please use a smaller file.";
  }
  if (lowerError.includes("timeout")) {
    return "Upload timed out. Please try again with a stable connection.";
  }
  
  return error;
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
    retryCount: 0,
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

  const runPreflightChecks = useCallback(
    async (accessToken: string): Promise<{ ok: boolean; error?: string }> => {
      setStep("preflight", 5);
      
      addDiagnostic({
        step: "preflight",
        status: "pending",
        message: "Running preflight checks...",
        timestamp: new Date(),
      });

      // Check track_covers bucket
      const coverBucketCheck = await checkBucketExists({
        url: SUPABASE_URL,
        apikey: SUPABASE_PUBLISHABLE_KEY,
        accessToken,
        bucket: "track_covers",
      });

      if (!coverBucketCheck.exists) {
        addDiagnostic({
          step: "preflight",
          status: "error",
          message: `Cover bucket check failed: ${coverBucketCheck.error}`,
          timestamp: new Date(),
        });
        return { ok: false, error: coverBucketCheck.error };
      }

      // Check track_audio bucket
      const audioBucketCheck = await checkBucketExists({
        url: SUPABASE_URL,
        apikey: SUPABASE_PUBLISHABLE_KEY,
        accessToken,
        bucket: "track_audio",
      });

      if (!audioBucketCheck.exists) {
        addDiagnostic({
          step: "preflight",
          status: "error",
          message: `Audio bucket check failed: ${audioBucketCheck.error}`,
          timestamp: new Date(),
        });
        return { ok: false, error: audioBucketCheck.error };
      }

      addDiagnostic({
        step: "preflight",
        status: "success",
        message: "All preflight checks passed",
        timestamp: new Date(),
        details: "Buckets track_covers and track_audio are accessible",
      });

      return { ok: true };
    },
    [addDiagnostic, setStep]
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
      isTimedOut: false,
      lastFailedStep: null,
      retryCount: 0,
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

        // Run preflight checks (only for fresh attempts)
        if (!resumeFrom) {
          const preflightResult = await runPreflightChecks(accessToken);
          if (!preflightResult.ok) {
            throw new Error(preflightResult.error || "Preflight checks failed");
          }
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
                .insert({
                  artist_id: artistId,
                  title: title?.trim() || "Untitled",
                  genre: genre || null,
                  artwork_url: null,
                  full_audio_url: null,
                  status: "uploading",
                } as any)
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
          throw new Error("Failed to determine track ID for upload.");
        }

        // Step 4: Upload cover (unique path based on trackId)
        const coverContentType = (coverFile?.type || getImageContentType(coverFile) || "image/jpeg").toLowerCase();
        const coverExt = coverExtFromContentType(coverContentType);
        const coverPath = `artists/${artistId}/${trackId}.${coverExt}`;

        if (!resumeFrom || resumeFrom === "cover_upload") {
          setStep("cover_upload", 20);
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
            const res = await uploadToStorageWithXhr(
              {
                url: SUPABASE_URL,
                apikey: SUPABASE_PUBLISHABLE_KEY,
                accessToken,
                bucket: "track_covers",
                objectPath: coverPath,
                file: coverFile,
                contentType: coverContentType,
                onProgress: (pct) => {
                  // Map 0-100 -> 20-45
                  const mapped = 20 + Math.round(pct * 0.25);
                  setStep("cover_upload", mapped);
                },
              },
              {
                maxRetries: 3,
                onRetry: (attempt, delayMs, error) => {
                  addDiagnostic({
                    step: "cover_upload",
                    status: "retry",
                    message: `Retry ${attempt}/3 after ${delayMs}ms...`,
                    timestamp: new Date(),
                    details: error,
                  });
                },
              }
            );

            if (!res.ok) {
              const msg = getUserFriendlyError(res.responseText || `Cover upload failed (status=${res.status})`);
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
            const rawMsg = safeMsg("Cover upload failed", err);
            const msg = getUserFriendlyError(rawMsg);
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
        const audioPath = `artists/${artistId}/${trackId}.${audioExt}`;

        if (!resumeFrom || resumeFrom === "audio_upload") {
          setStep("audio_upload", 50);
          addDiagnostic({
            step: "audio_upload",
            status: "pending",
            message: "Uploading audio file...",
            timestamp: new Date(),
            details: safeStringify({
              path: audioPath,
              contentType: audioContentType,
              fileName: audioFile?.name,
              fileSize: audioFile?.size,
            }),
          });

          try {
            const res = await uploadToStorageWithXhr(
              {
                url: SUPABASE_URL,
                apikey: SUPABASE_PUBLISHABLE_KEY,
                accessToken,
                bucket: "track_audio",
                objectPath: audioPath,
                file: audioFile,
                contentType: audioContentType,
                onProgress: (pct) => {
                  // Map 0-100 -> 50-85
                  const mapped = 50 + Math.round(pct * 0.35);
                  setStep("audio_upload", mapped);
                },
              },
              {
                maxRetries: 3,
                onRetry: (attempt, delayMs, error) => {
                  addDiagnostic({
                    step: "audio_upload",
                    status: "retry",
                    message: `Retry ${attempt}/3 after ${delayMs}ms...`,
                    timestamp: new Date(),
                    details: error,
                  });
                },
              }
            );

            if (!res.ok) {
              const msg = getUserFriendlyError(res.responseText || `Audio upload failed (status=${res.status})`);
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
            const rawMsg = safeMsg("Audio upload failed", err);
            const msg = getUserFriendlyError(rawMsg);
            
            // Special message when cover succeeded but audio failed
            const enhancedMsg = state.uploadedCoverPath 
              ? `Cover saved — audio failed. ${msg}` 
              : msg;
            
            addDiagnostic({
              step: "audio_upload",
              status: "error",
              message: enhancedMsg,
              timestamp: new Date(),
              details: safeStringify(err),
            });
            console.error("[Upload] Audio upload failed:", err);
            setState((prev) => ({ ...prev, lastFailedStep: "audio_upload" }));
            throw new Error(enhancedMsg);
          }
        }

        // Step 6: Update DB with URLs + status=ready
        setStep("db_update", 90);
        addDiagnostic({
          step: "db_update",
          status: "pending",
          message: "Finalizing track (saving URLs)...",
          timestamp: new Date(),
        });

        const coverPublicUrl = supabase.storage.from("track_covers").getPublicUrl(coverPath).data?.publicUrl || "";
        const audioPublicUrl = supabase.storage.from("track_audio").getPublicUrl(audioPath).data?.publicUrl || "";

        try {
          const { error: updateErr } = await supabase
            .from("tracks")
            .update({
              artwork_url: coverPublicUrl,
              full_audio_url: audioPublicUrl,
              status: "ready",
            } as any)
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
            details: safeStringify({ trackId, coverPublicUrl, audioPublicUrl }),
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

        const rawErrorMsg = safeMsg("An unexpected error occurred", err);
        const errorMsg = getUserFriendlyError(rawErrorMsg);
        console.error("[Upload] Upload failed:", err);

        setState((prev) => ({
          ...prev,
          step: "error",
          errorMessage: errorMsg,
        }));

        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [addDiagnostic, cleanup, setStep, state.trackId, state.uploadedCoverPath, runPreflightChecks]
  );

  const retry = useCallback(
    async (params: UploadParams): Promise<boolean> => {
      const resumeFrom = state.lastFailedStep;
      setState((prev) => ({ ...prev, retryCount: prev.retryCount + 1 }));
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
