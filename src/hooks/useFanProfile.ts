import { useCallback, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EDGE_FUNCTIONS_URL } from "@/config/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { 
  processImageForUpload, 
  validateImageFile, 
  revokePreviewUrl,
  formatFileSize,
  type ProcessedImage 
} from "@/utils/imageProcessing";

export type FanProfile = {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type FanProfileError = {
  message: string;
  step?: "validation" | "processing" | "upload" | "database";
};

export const useFanProfile = () => {
  const { user } = useAuth();
  const userId = user?.id;

  const [profile, setProfile] = useState<FanProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastError, setLastError] = useState<FanProfileError | null>(null);
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null);

  // Fetch profile on mount
  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();

        if (error) {
          console.error("[useFanProfile] Fetch error:", error);
        } else {
          setProfile(data);
        }
      } catch (e) {
        console.error("[useFanProfile] Unexpected error:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  /**
   * Process image locally (resize, compress) before upload
   */
  const processImage = useCallback(
    async (file: File): Promise<{ ok: true; processed: ProcessedImage } | { ok: false; error: FanProfileError }> => {
      setLastError(null);

      const validationError = validateImageFile(file);
      if (validationError) {
        const err: FanProfileError = { message: validationError, step: "validation" };
        setLastError(err);
        return { ok: false, error: err };
      }

      setIsProcessing(true);

      try {
        if (processedImage?.previewUrl) {
          revokePreviewUrl(processedImage.previewUrl);
        }

        const processed = await processImageForUpload(file);
        setProcessedImage(processed);

        return { ok: true, processed };
      } catch (e: unknown) {
        const err: FanProfileError = { 
          message: e instanceof Error ? e.message : "Failed to process image", 
          step: "processing" 
        };
        setLastError(err);
        return { ok: false, error: err };
      } finally {
        setIsProcessing(false);
      }
    },
    [processedImage]
  );

  /**
   * Upload the processed image to server
   */
  const uploadAvatar = useCallback(
    async (fileOrProcessed?: File | ProcessedImage): Promise<{ ok: true; url: string } | { ok: false; error: FanProfileError }> => {
      if (!userId) {
        const err: FanProfileError = { message: "You must be logged in.", step: "validation" };
        setLastError(err);
        return { ok: false, error: err };
      }

      let fileToUpload: File;
      
      if (!fileOrProcessed) {
        if (!processedImage?.file) {
          const err: FanProfileError = { message: "No image selected.", step: "validation" };
          setLastError(err);
          return { ok: false, error: err };
        }
        fileToUpload = processedImage.file;
      } else if (fileOrProcessed instanceof File) {
        const processResult = await processImage(fileOrProcessed);
        if (!processResult.ok) {
          return processResult as { ok: false; error: FanProfileError };
        }
        fileToUpload = processResult.processed.file;
      } else {
        fileToUpload = fileOrProcessed.file;
      }

      setIsUploading(true);
      setLastError(null);

      try {
        const { data: sessionData, error: sessError } = await supabase.auth.getSession();
        if (sessError || !sessionData.session) {
          const err: FanProfileError = { message: "Session expired. Please log in again.", step: "upload" };
          setLastError(err);
          return { ok: false, error: err };
        }

        const formData = new FormData();
        formData.append("file", fileToUpload);

        const res = await fetch(
          `${EDGE_FUNCTIONS_URL}/functions/v1/upload-fan-avatar`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
            body: formData,
          }
        );

        const json = await res.json();

        if (!res.ok) {
          const err: FanProfileError = { 
            message: json.error || "Upload failed", 
            step: "upload"
          };
          setLastError(err);
          return { ok: false, error: err };
        }

        const url = json.url as string;

        // Update local state
        setProfile(prev => prev ? { ...prev, avatar_url: url } : prev);

        // Clean up preview URL
        if (processedImage?.previewUrl) {
          revokePreviewUrl(processedImage.previewUrl);
          setProcessedImage(null);
        }

        return { ok: true, url };
      } catch (e: unknown) {
        const err: FanProfileError = { 
          message: e instanceof Error ? e.message : "Network error", 
          step: "upload"
        };
        setLastError(err);
        return { ok: false, error: err };
      } finally {
        setIsUploading(false);
      }
    },
    [userId, processedImage, processImage]
  );

  /**
   * Update display name
   */
  const updateDisplayName = useCallback(
    async (newName: string): Promise<{ ok: true } | { ok: false; error: FanProfileError }> => {
      if (!userId) {
        const err: FanProfileError = { message: "You must be logged in.", step: "validation" };
        setLastError(err);
        return { ok: false, error: err };
      }

      const trimmedName = newName.trim();
      if (!trimmedName) {
        const err: FanProfileError = { message: "Name cannot be empty.", step: "validation" };
        setLastError(err);
        return { ok: false, error: err };
      }

      setIsSaving(true);
      setLastError(null);

      try {
        const now = new Date().toISOString();
        const { error } = await supabase
          .from("profiles")
          .update({ display_name: trimmedName, updated_at: now })
          .eq("user_id", userId);

        if (error) {
          const err: FanProfileError = { message: error.message, step: "database" };
          setLastError(err);
          return { ok: false, error: err };
        }

        setProfile(prev => prev ? { ...prev, display_name: trimmedName } : prev);
        return { ok: true };
      } catch (e: unknown) {
        const err: FanProfileError = { 
          message: e instanceof Error ? e.message : "Failed to save", 
          step: "database"
        };
        setLastError(err);
        return { ok: false, error: err };
      } finally {
        setIsSaving(false);
      }
    },
    [userId]
  );

  /**
   * Clear processed image and preview
   */
  const clearProcessedImage = useCallback(() => {
    if (processedImage?.previewUrl) {
      revokePreviewUrl(processedImage.previewUrl);
    }
    setProcessedImage(null);
  }, [processedImage]);

  /**
   * Refetch profile
   */
  const refetch = useCallback(async () => {
    if (!userId) return;
    
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    
    if (data) setProfile(data);
  }, [userId]);

  return { 
    profile,
    isLoading,
    isUploading, 
    isProcessing,
    isSaving,
    lastError, 
    processedImage,
    processImage,
    uploadAvatar,
    updateDisplayName,
    clearProcessedImage,
    refetch,
    formatFileSize,
  };
};
