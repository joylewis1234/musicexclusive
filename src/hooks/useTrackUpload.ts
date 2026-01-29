import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFilename, getImageContentType } from "@/utils/imageProcessing";

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
  uploadedCoverPath: string | null;
  isTimedOut: boolean;
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
    uploadedCoverPath: null,
    isTimedOut: false,
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

  const cleanup = useCallback(async (coverPath: string | null) => {
    if (!coverPath) return;
    
    try {
      console.log("[Upload] Cleaning up orphaned cover:", coverPath);
      const { error } = await supabase.storage.from("track_covers").remove([coverPath]);
      if (error) {
        console.error("[Upload] Failed to cleanup cover:", error);
      } else {
        console.log("[Upload] Cover cleaned up successfully");
      }
    } catch (err) {
      console.error("[Upload] Cleanup error:", err);
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
      uploadedCoverPath: null,
      isTimedOut: false,
    });
  }, []);

  const upload = useCallback(async (params: UploadParams): Promise<boolean> => {
    const { title, genre, coverFile, audioFile, userId } = params;
    
    abortRef.current = false;
    setState(prev => ({
      ...prev,
      step: "session_check",
      progress: 5,
      diagnostics: [],
      errorMessage: null,
      isTimedOut: false,
    }));

    // Set timeout
    timeoutRef.current = setTimeout(() => {
      setState(prev => ({ ...prev, isTimedOut: true }));
    }, UPLOAD_TIMEOUT_MS);

    let uploadedCoverPath: string | null = null;

    try {
      // Step 1: Session check
      addDiagnostic({
        step: "session_check",
        status: "pending",
        message: "Checking session...",
        timestamp: new Date(),
      });

      let session;
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          throw new Error(sessionError?.message || "Session error");
        }
        session = sessionData?.session;
        if (!session) {
          throw new Error("No active session. Please log in again.");
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Session check failed";
        addDiagnostic({
          step: "session_check",
          status: "error",
          message: errorMsg,
          timestamp: new Date(),
          details: JSON.stringify(err, null, 2),
        });
        console.error("[Upload] Session check failed:", err);
        throw new Error(errorMsg);
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

        if (profileError) {
          throw new Error(profileError?.message || "Profile query failed");
        }
        if (!artistProfile || !artistProfile.id) {
          throw new Error("Artist profile not found. Please complete your profile setup.");
        }
        artistId = artistProfile.id;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Failed to get artist profile";
        addDiagnostic({
          step: "session_check",
          status: "error",
          message: errorMsg,
          timestamp: new Date(),
          details: JSON.stringify(err, null, 2),
        });
        console.error("[Upload] Profile check failed:", err);
        throw new Error(errorMsg);
      }

      setStep("cover_upload", 15);

      // Step 3: Upload cover
      addDiagnostic({
        step: "cover_upload",
        status: "pending",
        message: "Uploading cover art...",
        timestamp: new Date(),
        details: `File: ${coverFile?.name || "unknown"}, Size: ${coverFile?.size ? (coverFile.size / 1024).toFixed(0) : "?"}KB`,
      });

      const timestamp = Date.now();
      const sanitizedCoverName = sanitizeFilename(coverFile?.name || "cover.jpg");
      const coverPath = `${artistId}/${timestamp}-${sanitizedCoverName}`;
      const coverContentType = getImageContentType(coverFile);

      try {
        const { data: coverData, error: coverError } = await supabase.storage
          .from("track_covers")
          .upload(coverPath, coverFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: coverContentType,
          });

        if (coverError) {
          const errMsg = coverError?.message || "Unknown storage error";
          const errDetails = JSON.stringify(coverError, null, 2);
          throw { message: errMsg, details: errDetails };
        }

        if (!coverData || !coverData.path) {
          throw { message: "Cover upload returned no path", details: JSON.stringify(coverData) };
        }

        uploadedCoverPath = coverData.path;
        setState(prev => ({ ...prev, uploadedCoverPath }));

        addDiagnostic({
          step: "cover_upload",
          status: "success",
          message: "Cover uploaded",
          timestamp: new Date(),
          details: `Path: ${uploadedCoverPath}`,
        });
      } catch (err: unknown) {
        const errorObj = err as { message?: string; details?: string };
        const errorMsg = errorObj?.message || "Cover upload failed";
        addDiagnostic({
          step: "cover_upload",
          status: "error",
          message: errorMsg,
          timestamp: new Date(),
          details: errorObj?.details || JSON.stringify(err, null, 2),
        });
        console.error("[Upload] Cover upload failed:", err);
        throw new Error(errorMsg);
      }

      setStep("audio_upload", 40);

      // Step 4: Upload audio
      addDiagnostic({
        step: "audio_upload",
        status: "pending",
        message: "Uploading audio file...",
        timestamp: new Date(),
        details: `File: ${audioFile?.name || "unknown"}, Size: ${audioFile?.size ? (audioFile.size / (1024 * 1024)).toFixed(2) : "?"}MB`,
      });

      const sanitizedAudioName = sanitizeFilename(audioFile?.name || "audio.mp3");
      const audioPath = `${artistId}/${timestamp}-${sanitizedAudioName}`;
      const audioContentType = getAudioContentType(audioFile);

      let audioUrl: string;
      try {
        const { data: audioData, error: audioError } = await supabase.storage
          .from("track_audio")
          .upload(audioPath, audioFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: audioContentType,
          });

        if (audioError) {
          const errMsg = audioError?.message || "Unknown audio upload error";
          const errDetails = JSON.stringify(audioError, null, 2);
          throw { message: errMsg, details: errDetails, cleanup: true };
        }

        if (!audioData || !audioData.path) {
          throw { message: "Audio upload returned no path", details: JSON.stringify(audioData), cleanup: true };
        }

        const { data: audioUrlData } = supabase.storage
          .from("track_audio")
          .getPublicUrl(audioData.path);

        audioUrl = audioUrlData?.publicUrl || "";

        addDiagnostic({
          step: "audio_upload",
          status: "success",
          message: "Audio uploaded",
          timestamp: new Date(),
          details: `Path: ${audioData.path}`,
        });
      } catch (err: unknown) {
        const errorObj = err as { message?: string; details?: string; cleanup?: boolean };
        const errorMsg = errorObj?.message || "Audio upload failed";
        
        // Cleanup cover if audio fails
        if (errorObj?.cleanup && uploadedCoverPath) {
          await cleanup(uploadedCoverPath);
        }

        addDiagnostic({
          step: "audio_upload",
          status: "error",
          message: errorMsg,
          timestamp: new Date(),
          details: errorObj?.details || JSON.stringify(err, null, 2),
        });
        console.error("[Upload] Audio upload failed:", err);
        throw new Error(errorMsg);
      }

      setStep("db_insert", 80);

      // Step 5: Database insert
      addDiagnostic({
        step: "db_insert",
        status: "pending",
        message: "Saving track to database...",
        timestamp: new Date(),
      });

      const { data: coverUrlData } = supabase.storage
        .from("track_covers")
        .getPublicUrl(uploadedCoverPath);

      const coverUrl = coverUrlData?.publicUrl || "";

      try {
        const { data: trackData, error: trackError } = await supabase
          .from("tracks")
          .insert({
            artist_id: artistId,
            title: title?.trim() || "Untitled",
            genre: genre || null,
            artwork_url: coverUrl,
            full_audio_url: audioUrl,
          })
          .select("id")
          .single();

        if (trackError) {
          const errMsg = trackError?.message || "Database insert failed";
          throw { message: errMsg, details: JSON.stringify(trackError, null, 2) };
        }

        if (!trackData || !trackData.id) {
          throw { message: "Track insert returned no ID", details: JSON.stringify(trackData) };
        }

        addDiagnostic({
          step: "db_insert",
          status: "success",
          message: "Track saved",
          timestamp: new Date(),
          details: `Track ID: ${trackData.id}`,
        });
      } catch (err: unknown) {
        const errorObj = err as { message?: string; details?: string };
        const errorMsg = errorObj?.message || "Database insert failed";
        addDiagnostic({
          step: "db_insert",
          status: "error",
          message: errorMsg,
          timestamp: new Date(),
          details: errorObj?.details || JSON.stringify(err, null, 2),
        });
        console.error("[Upload] DB insert failed:", err);
        throw new Error(errorMsg);
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

      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred";
      console.error("[Upload] Upload failed:", err);
      
      setState(prev => ({
        ...prev,
        step: "error",
        errorMessage: errorMsg,
      }));

      return false;
    }
  }, [addDiagnostic, setStep, cleanup]);

  return {
    state,
    upload,
    reset,
    cleanup,
  };
}
