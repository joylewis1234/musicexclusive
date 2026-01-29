import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AvatarUploadError = {
  name?: string;
  message: string;
  status?: number;
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
};

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const useAvatarUpload = (params: { userId?: string | null }) => {
  const { userId } = params;

  const [isUploading, setIsUploading] = useState(false);
  const [lastError, setLastError] = useState<AvatarUploadError | null>(null);
  const [lastMeta, setLastMeta] = useState<AvatarUploadMeta | null>(null);

  const uploadAvatar = useCallback(
    async (file: File): Promise<{ ok: true; url: string } | { ok: false; error: AvatarUploadError }> => {
      if (!userId) {
        const err: AvatarUploadError = { message: "You must be logged in." };
        setLastError(err);
        return { ok: false, error: err };
      }

      if (!file) {
        const err: AvatarUploadError = { message: "No file selected." };
        setLastError(err);
        return { ok: false, error: err };
      }

      if (file.size > MAX_BYTES) {
        const err: AvatarUploadError = { message: "Image must be 10MB or less." };
        setLastError(err);
        return { ok: false, error: err };
      }

      if (!ALLOWED_TYPES.includes(file.type as any)) {
        const err: AvatarUploadError = { message: "Please upload a JPG, PNG, or WEBP image." };
        setLastError(err);
        return { ok: false, error: err };
      }

      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      const objectPath = `${userId}/profile.${ext}`;
      const displayPath = `avatars/${objectPath}`;

      setIsUploading(true);
      setLastError(null);
      setLastMeta({
        bucket: "avatars",
        objectPath,
        displayPath,
        file: { name: file.name, type: file.type, size: file.size },
      });

      try {
        // Get auth session for edge function
        const { data: sessionData, error: sessError } = await supabase.auth.getSession();
        if (sessError || !sessionData.session) {
          const err: AvatarUploadError = { message: "Session expired. Please log in again." };
          setLastError(err);
          return { ok: false, error: err };
        }

        const formData = new FormData();
        formData.append("file", file);

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
          const err: AvatarUploadError = { message: json.error || "Upload failed", name: json.name, status: res.status };
          setLastError(err);
          return { ok: false, error: err };
        }

        const url = json.url as string;
        return { ok: true, url };
      } catch (e: any) {
        const err: AvatarUploadError = { message: e?.message || "Network error", name: e?.name };
        setLastError(err);
        return { ok: false, error: err };
      } finally {
        setIsUploading(false);
      }
    },
    [userId]
  );

  return { isUploading, lastError, lastMeta, uploadAvatar };
};
