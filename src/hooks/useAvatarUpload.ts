import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL } from "@/config/supabase";
import { 
  processImageForUpload, 
  validateImageFile, 
  revokePreviewUrl,
  formatFileSize,
  type ProcessedImage 
} from "@/utils/imageProcessing";

export type AvatarUploadError = {
  name?: string;
  message: string;
  status?: number;
  step?: "validation" | "processing" | "upload" | "database";
};

export type AvatarUploadMeta = {
  bucket: "avatars";
  objectPath: string;
  displayPath: string;
  file?: {
    name: string;
    type: string;
    size: number;
  };
  original?: {
    name: string;
    size: number;
  };
  compression?: {
    originalSize: number;
    compressedSize: number;
    ratio: string;
  };
};

export const useAvatarUpload = (params: { userId?: string | null }) => {
  const { userId } = params;

  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastError, setLastError] = useState<AvatarUploadError | null>(null);
  const [lastMeta, setLastMeta] = useState<AvatarUploadMeta | null>(null);
  const [processedImage, setProcessedImage] = useState<ProcessedImage | null>(null);

  /**
   * Process image locally (resize, compress) before upload
   * Returns processed image with preview URL
   */
  const processImage = useCallback(
    async (file: File): Promise<{ ok: true; processed: ProcessedImage } | { ok: false; error: AvatarUploadError }> => {
      setLastError(null);

      // Validate file first
      const validationError = validateImageFile(file);
      if (validationError) {
        const err: AvatarUploadError = { message: validationError, step: "validation" };
        setLastError(err);
        return { ok: false, error: err };
      }

      setIsProcessing(true);

      try {
        // Clean up previous preview
        if (processedImage?.previewUrl) {
          revokePreviewUrl(processedImage.previewUrl);
        }

        const processed = await processImageForUpload(file);
        setProcessedImage(processed);

        // Update meta with compression info
        setLastMeta({
          bucket: "avatars",
          objectPath: `${userId || "unknown"}/profile.jpg`,
          displayPath: `avatars/${userId || "unknown"}/profile.jpg`,
          file: { 
            name: processed.file.name, 
            type: processed.file.type, 
            size: processed.file.size 
          },
          original: {
            name: file.name,
            size: file.size,
          },
          compression: {
            originalSize: processed.originalSize,
            compressedSize: processed.compressedSize,
            ratio: `${((1 - processed.compressedSize / processed.originalSize) * 100).toFixed(0)}%`,
          },
        });

        return { ok: true, processed };
      } catch (e: unknown) {
        const err: AvatarUploadError = { 
          message: e instanceof Error ? e.message : "Failed to process image", 
          step: "processing" 
        };
        setLastError(err);
        return { ok: false, error: err };
      } finally {
        setIsProcessing(false);
      }
    },
    [userId, processedImage]
  );

  /**
   * Upload the processed image to server
   */
  const uploadAvatar = useCallback(
    async (fileOrProcessed?: File | ProcessedImage): Promise<{ ok: true; url: string } | { ok: false; error: AvatarUploadError }> => {
      if (!userId) {
        const err: AvatarUploadError = { message: "You must be logged in.", step: "validation" };
        setLastError(err);
        return { ok: false, error: err };
      }

      // Determine which file to upload
      let fileToUpload: File;
      
      if (!fileOrProcessed) {
        // Use already processed image
        if (!processedImage?.file) {
          const err: AvatarUploadError = { message: "No image selected.", step: "validation" };
          setLastError(err);
          return { ok: false, error: err };
        }
        fileToUpload = processedImage.file;
      } else if (fileOrProcessed instanceof File) {
        // Process the file first
        const processResult = await processImage(fileOrProcessed);
        if (!processResult.ok) {
          return processResult as { ok: false; error: AvatarUploadError };
        }
        fileToUpload = processResult.processed.file;
      } else {
        // Already processed
        fileToUpload = fileOrProcessed.file;
      }

      setIsUploading(true);
      setLastError(null);

      try {
        // Get auth session for edge function
        const { data: sessionData, error: sessError } = await supabase.auth.getSession();
        if (sessError || !sessionData.session) {
          const err: AvatarUploadError = { message: "Session expired. Please log in again.", step: "upload" };
          setLastError(err);
          return { ok: false, error: err };
        }

        const formData = new FormData();
        formData.append("file", fileToUpload);

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/upload-avatar`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
            body: formData,
          }
        );

        const json = await res.json();

        if (!res.ok) {
          const err: AvatarUploadError = { 
            message: json.error || "Upload failed", 
            name: json.name, 
            status: res.status,
            step: "upload"
          };
          setLastError(err);
          return { ok: false, error: err };
        }

        const url = json.url as string;

        // Clean up preview URL after successful upload
        if (processedImage?.previewUrl) {
          revokePreviewUrl(processedImage.previewUrl);
          setProcessedImage(null);
        }

        return { ok: true, url };
      } catch (e: unknown) {
        const err: AvatarUploadError = { 
          message: e instanceof Error ? e.message : "Network error", 
          name: e instanceof Error ? e.name : undefined,
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
   * Clear processed image and preview
   */
  const clearProcessedImage = useCallback(() => {
    if (processedImage?.previewUrl) {
      revokePreviewUrl(processedImage.previewUrl);
    }
    setProcessedImage(null);
    setLastMeta(null);
  }, [processedImage]);

  return { 
    isUploading, 
    isProcessing,
    lastError, 
    lastMeta, 
    processedImage,
    processImage,
    uploadAvatar,
    clearProcessedImage,
    formatFileSize,
  };
};
