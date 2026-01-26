import { useState, useRef, useCallback, useEffect } from "react";

interface UseAudioPreviewReturn {
  currentPreviewId: string | null;
  previewProgress: number;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  startPreview: (artistId: string, audioUrl: string | null) => void;
  stopPreview: () => void;
}

const PREVIEW_DURATION = 15; // 15 seconds max

export const useAudioPreview = (): UseAudioPreviewReturn => {
  const [currentPreviewId, setCurrentPreviewId] = useState<string | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopPreview = useCallback(() => {
    // Stop audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setCurrentPreviewId(null);
    setPreviewProgress(0);
    setIsPlaying(false);
    setIsLoading(false);
    setError(null);
  }, []);

  const startPreview = useCallback((artistId: string, audioUrl: string | null) => {
    // Stop any existing preview first
    stopPreview();

    // If no audio URL, set error
    if (!audioUrl) {
      setError("Hook preview not available. Tap STREAM to listen inside.");
      setCurrentPreviewId(artistId);
      return;
    }

    setCurrentPreviewId(artistId);
    setIsLoading(true);
    setError(null);

    // Create audio element
    const audio = new Audio(audioUrl);
    audio.preload = "auto";
    audio.volume = 0.8;
    audioRef.current = audio;

    // Handle successful load
    audio.addEventListener("canplaythrough", () => {
      setIsLoading(false);
      setIsPlaying(true);
      startTimeRef.current = Date.now();
      audio.play().catch((e) => {
        console.error("Audio play failed:", e);
        setError("Could not play preview");
        setIsPlaying(false);
      });

      // Start progress tracking
      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const progress = Math.min((elapsed / PREVIEW_DURATION) * 100, 100);
        
        setPreviewProgress(progress);

        // Stop at 15 seconds
        if (elapsed >= PREVIEW_DURATION) {
          stopPreview();
        }
      }, 100);
    }, { once: true });

    // Handle audio end (if file is shorter than 15s)
    audio.addEventListener("ended", () => {
      stopPreview();
    }, { once: true });

    // Handle load error
    audio.addEventListener("error", () => {
      setError("Could not load preview");
      setIsLoading(false);
      setIsPlaying(false);
    }, { once: true });

    // Start loading
    audio.load();
  }, [stopPreview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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
