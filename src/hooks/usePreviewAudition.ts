import { useState, useRef, useCallback, useEffect } from "react";

interface UsePreviewAuditionReturn {
  isPlaying: boolean;
  isLoading: boolean;
  timeRemaining: number;
  startAudition: (audioUrl: string, startSeconds: number) => void;
  stopAudition: () => void;
}

const PREVIEW_DURATION = 25; // 25 seconds

export const usePreviewAudition = (): UsePreviewAuditionReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const stopTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const stopAudition = useCallback(() => {
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
    
    // Clear timeout
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    
    setIsPlaying(false);
    setIsLoading(false);
    setTimeRemaining(0);
  }, []);

  const startAudition = useCallback((audioUrl: string, startSeconds: number) => {
    // Stop any existing audition first
    stopAudition();

    if (!audioUrl) return;

    setIsLoading(true);

    // Create audio element
    const audio = new Audio(audioUrl);
    audio.preload = "auto";
    audioRef.current = audio;

    // Handle successful load
    const handleCanPlay = () => {
      setIsLoading(false);
      setIsPlaying(true);
      setTimeRemaining(PREVIEW_DURATION);
      
      // Set start time
      audio.currentTime = startSeconds;
      
      audio.play().catch((e) => {
        console.error("Audio play failed:", e);
        setIsPlaying(false);
      });

      // Update countdown every second
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            stopAudition();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-stop after 15 seconds
      stopTimeoutRef.current = setTimeout(() => {
        stopAudition();
      }, PREVIEW_DURATION * 1000);
    };

    audio.addEventListener("canplaythrough", handleCanPlay, { once: true });

    // Handle audio end (if file is shorter than remaining duration)
    audio.addEventListener("ended", () => {
      stopAudition();
    }, { once: true });

    // Handle load error
    audio.addEventListener("error", () => {
      setIsLoading(false);
      setIsPlaying(false);
    }, { once: true });

    // Start loading
    audio.load();
  }, [stopAudition]);

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
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }
    };
  }, []);

  return {
    isPlaying,
    isLoading,
    timeRemaining,
    startAudition,
    stopAudition,
  };
};
