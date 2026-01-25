import { useState, useRef, useCallback, useEffect } from "react";

interface UseAudioPreviewReturn {
  currentPreviewId: string | null;
  previewProgress: number;
  isPlaying: boolean;
  startPreview: (artistId: string) => void;
  stopPreview: () => void;
}

const PREVIEW_DURATION = 15; // 15 seconds

export const useAudioPreview = (): UseAudioPreviewReturn => {
  const [currentPreviewId, setCurrentPreviewId] = useState<string | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopPreview = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentPreviewId(null);
    setPreviewProgress(0);
    setIsPlaying(false);
  }, []);

  const startPreview = useCallback((artistId: string) => {
    // Stop any existing preview first
    stopPreview();

    // Start new preview
    setCurrentPreviewId(artistId);
    setIsPlaying(true);
    setPreviewProgress(0);
    startTimeRef.current = Date.now();

    // Simulate audio progress
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const progress = Math.min((elapsed / PREVIEW_DURATION) * 100, 100);
      
      setPreviewProgress(progress);

      if (elapsed >= PREVIEW_DURATION) {
        stopPreview();
      }
    }, 100);
  }, [stopPreview]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    currentPreviewId,
    previewProgress,
    isPlaying,
    startPreview,
    stopPreview,
  };
};
