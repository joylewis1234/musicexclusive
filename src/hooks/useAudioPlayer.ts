import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlaybackDiagnostics {
  trackTitle: string | null;
  audioUrl: string | null;
  audioPath: string | null;
  bucketName: string;
  lastError: string | null;
  canPlay: boolean;
  readyState: number;
}

export interface UseAudioPlayerReturn {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  error: string | null;
  diagnostics: PlaybackDiagnostics;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  loadTrack: (audioUrl: string, trackTitle?: string) => void;
}

/**
 * Extract storage path from a Supabase public URL
 * URL format: https://xxx.supabase.co/storage/v1/object/public/{bucket}/{path}
 */
function extractPathFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Generate a public URL from a storage path if the URL is missing
 */
export function generatePublicUrl(
  bucket: "track_audio" | "track_covers",
  path: string
): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || "";
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(75);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [diagnostics, setDiagnostics] = useState<PlaybackDiagnostics>({
    trackTitle: null,
    audioUrl: null,
    audioPath: null,
    bucketName: "track_audio",
    lastError: null,
    canPlay: false,
    readyState: 0,
  });

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume / 100;

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      setDiagnostics(prev => ({
        ...prev,
        canPlay: true,
        readyState: audio.readyState,
      }));
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setDiagnostics(prev => ({
        ...prev,
        canPlay: true,
        readyState: audio.readyState,
      }));
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      const audioEl = e.target as HTMLAudioElement;
      let errorMessage = "Unknown playback error";
      
      if (audioEl.error) {
        switch (audioEl.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = "Playback aborted";
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = "Network error while loading audio";
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = "Audio decode error - file may be corrupted";
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = "Audio format not supported or URL invalid";
            break;
        }
      }

      console.error("[AudioPlayer] Error:", errorMessage, audioEl.error);
      setError(errorMessage);
      setIsLoading(false);
      setIsPlaying(false);
      setDiagnostics(prev => ({
        ...prev,
        lastError: errorMessage,
        canPlay: false,
        readyState: audioEl.readyState,
      }));
    };

    const handleWaiting = () => {
      setIsLoading(true);
    };

    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audioRef.current = null;
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const loadTrack = useCallback((audioUrl: string, trackTitle?: string) => {
    if (!audioRef.current) return;

    // Reset state
    setError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);

    const audioPath = extractPathFromUrl(audioUrl);

    setDiagnostics({
      trackTitle: trackTitle || null,
      audioUrl,
      audioPath,
      bucketName: "track_audio",
      lastError: null,
      canPlay: false,
      readyState: 0,
    });

    // Load the new source
    audioRef.current.src = audioUrl;
    audioRef.current.load();
    
    console.log("[AudioPlayer] Loading track:", { trackTitle, audioUrl, audioPath });
  }, []);

  const play = useCallback(async () => {
    if (!audioRef.current) {
      setError("Audio player not initialized");
      return;
    }

    const audio = audioRef.current;
    
    if (!audio.src) {
      setError("No audio source loaded");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to play audio";
      console.error("[AudioPlayer] Play failed:", err);
      setError(msg);
      setIsPlaying(false);
      setDiagnostics(prev => ({
        ...prev,
        lastError: msg,
      }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current && isFinite(time)) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setVolume = useCallback((vol: number) => {
    setVolumeState(Math.max(0, Math.min(100, vol)));
  }, []);

  return {
    isPlaying,
    currentTime,
    duration,
    volume,
    isLoading,
    error,
    diagnostics,
    play,
    pause,
    stop,
    seek,
    setVolume,
    loadTrack,
  };
}
