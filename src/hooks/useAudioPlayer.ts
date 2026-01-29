import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlaybackDiagnostics {
  trackTitle: string | null;
  trackId: string | null;
  artistId: string | null;
  audioUrl: string | null;
  audioPath: string | null;
  bucketName: string;
  lastError: string | null;
  canPlay: boolean;
  readyState: number;
  retryCount: number;
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
  loadTrack: (audioUrl: string, trackTitle?: string, trackId?: string, artistId?: string) => void;
  retryPlay: () => Promise<void>;
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
 * Generate a public URL from a storage path
 */
export function generatePublicUrl(
  bucket: "track_audio" | "track_covers",
  path: string
): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl || "";
}

/**
 * Generate audio URL using multiple file extension attempts
 */
function generateAudioUrlWithExtensions(artistId: string, trackId: string): string[] {
  const extensions = [".mp3", ".wav", ".m4a", ".ogg"];
  return extensions.map(ext => {
    const path = `artists/${artistId}/${trackId}${ext}`;
    const { data } = supabase.storage.from("track_audio").getPublicUrl(path);
    return data?.publicUrl || "";
  }).filter(Boolean);
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(75);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Store track metadata for retry logic
  const trackMetaRef = useRef<{
    trackId: string | null;
    artistId: string | null;
    title: string | null;
    originalUrl: string | null;
  }>({
    trackId: null,
    artistId: null,
    title: null,
    originalUrl: null,
  });
  
  const [diagnostics, setDiagnostics] = useState<PlaybackDiagnostics>({
    trackTitle: null,
    trackId: null,
    artistId: null,
    audioUrl: null,
    audioPath: null,
    bucketName: "track_audio",
    lastError: null,
    canPlay: false,
    readyState: 0,
    retryCount: 0,
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

  const loadTrack = useCallback((audioUrl: string, trackTitle?: string, trackId?: string, artistId?: string) => {
    if (!audioRef.current) return;

    // Reset state
    setError(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    setRetryCount(0);

    // Store metadata for retry
    trackMetaRef.current = {
      trackId: trackId || null,
      artistId: artistId || null,
      title: trackTitle || null,
      originalUrl: audioUrl,
    };

    const audioPath = extractPathFromUrl(audioUrl);

    setDiagnostics({
      trackTitle: trackTitle || null,
      trackId: trackId || null,
      artistId: artistId || null,
      audioUrl,
      audioPath,
      bucketName: "track_audio",
      lastError: null,
      canPlay: false,
      readyState: 0,
      retryCount: 0,
    });

    // Load the new source
    audioRef.current.src = audioUrl;
    audioRef.current.load();
    
    console.log("[AudioPlayer] Loading track:", { trackTitle, trackId, artistId, audioUrl, audioPath });
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

  /**
   * Retry playback with alternative URLs if available
   */
  const retryPlay = useCallback(async () => {
    const { trackId, artistId, title } = trackMetaRef.current;
    
    if (!audioRef.current) {
      setError("Audio player not initialized");
      return;
    }

    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    setError(null);
    setIsLoading(true);

    console.log("[AudioPlayer] Retry attempt:", newRetryCount, { trackId, artistId });

    // If we have trackId and artistId, try generating URLs with different extensions
    if (trackId && artistId) {
      const alternativeUrls = generateAudioUrlWithExtensions(artistId, trackId);
      
      // Try each URL in sequence
      for (let i = 0; i < alternativeUrls.length; i++) {
        const url = alternativeUrls[i];
        console.log("[AudioPlayer] Trying alternative URL:", url);
        
        try {
          audioRef.current.src = url;
          audioRef.current.load();
          
          // Wait for canplay or error
          await new Promise<void>((resolve, reject) => {
            const audio = audioRef.current!;
            
            const onCanPlay = () => {
              audio.removeEventListener("canplay", onCanPlay);
              audio.removeEventListener("error", onError);
              resolve();
            };
            
            const onError = () => {
              audio.removeEventListener("canplay", onCanPlay);
              audio.removeEventListener("error", onError);
              reject(new Error("Failed to load"));
            };
            
            audio.addEventListener("canplay", onCanPlay, { once: true });
            audio.addEventListener("error", onError, { once: true });
            
            // Timeout after 5 seconds
            setTimeout(() => {
              audio.removeEventListener("canplay", onCanPlay);
              audio.removeEventListener("error", onError);
              reject(new Error("Load timeout"));
            }, 5000);
          });

          // Success - update diagnostics and play
          setDiagnostics(prev => ({
            ...prev,
            audioUrl: url,
            audioPath: extractPathFromUrl(url),
            retryCount: newRetryCount,
            lastError: null,
            canPlay: true,
          }));
          
          await audioRef.current.play();
          setIsPlaying(true);
          setIsLoading(false);
          return;
        } catch (err) {
          console.log("[AudioPlayer] URL failed:", url, err);
          continue; // Try next URL
        }
      }
    }

    // All retries failed
    setIsLoading(false);
    const errorMsg = "Playback failed — tap to retry.";
    setError(errorMsg);
    setDiagnostics(prev => ({
      ...prev,
      lastError: errorMsg,
      retryCount: newRetryCount,
      canPlay: false,
    }));
  }, [retryCount]);

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
    retryPlay,
  };
}
