import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_PROJECT_ID } from "@/config/supabase";

interface UsePublicAudioPreviewReturn {
  currentPreviewId: string | null;
  previewProgress: number;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  startPreview: (trackId: string, startSeconds?: number) => void;
  stopPreview: () => void;
}

const PREVIEW_DURATION = 25;

/**
 * Public audio preview hook — calls mint-playback-url-public-preview
 * which uses ANON key + SECURITY DEFINER RPC. No auth required.
 */
export const usePublicAudioPreview = (): UsePublicAudioPreviewReturn => {
  const [currentPreviewId, setCurrentPreviewId] = useState<string | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stopPreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    setCurrentPreviewId(null);
    setPreviewProgress(0);
    setIsPlaying(false);
    setIsLoading(false);
    setError(null);
  }, []);

  const startPreview = useCallback(
    async (trackId: string, startSeconds: number = 0) => {
      stopPreview();

      setCurrentPreviewId(trackId);
      setIsLoading(true);
      setError(null);

      // Call the secure public preview endpoint (no auth header needed)
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/mint-playback-url-public-preview`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: anonKey,
          },
          body: JSON.stringify({ trackId }),
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body?.error || "Preview not available yet.");
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      if (!data?.url) {
        setError("Preview not available yet.");
        setIsLoading(false);
        return;
      }

      const audio = new Audio(data.url);
      audio.preload = "auto";
      audio.volume = 0.8;
      audioRef.current = audio;

      audio.addEventListener(
        "canplaythrough",
        () => {
          setIsLoading(false);
          setIsPlaying(true);
          startTimeRef.current = Date.now();

          audio.currentTime = startSeconds;

          audio.play().catch((e) => {
            console.error("Audio play failed:", e);
            setError("Could not play preview");
            setIsPlaying(false);
          });

          intervalRef.current = setInterval(() => {
            const elapsed = (Date.now() - startTimeRef.current) / 1000;
            const progress = Math.min((elapsed / PREVIEW_DURATION) * 100, 100);
            setPreviewProgress(progress);
            if (elapsed >= PREVIEW_DURATION) {
              stopPreview();
            }
          }, 100);

          stopTimeoutRef.current = setTimeout(() => {
            stopPreview();
          }, PREVIEW_DURATION * 1000);
        },
        { once: true }
      );

      audio.addEventListener("ended", () => stopPreview(), { once: true });
      audio.addEventListener(
        "error",
        () => {
          setError("Could not load preview");
          setIsLoading(false);
          setIsPlaying(false);
        },
        { once: true }
      );

      audio.load();
    },
    [stopPreview]
  );

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    };
  }, []);

  return {
    currentPreviewId,
    previewProgress,
    isPlaying,
    isLoading,
    error,
    startPreview,
    stopPreview,
  };
};
