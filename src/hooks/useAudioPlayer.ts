import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/* ── Signed-URL in-memory cache ── */

interface CachedUrl {
  url: string;
  expiresAt: number; // Date.now() + TTL
}

const urlCache = new Map<string, CachedUrl>();
const CACHE_TTL_MS = 60_000; // 60 seconds (signed URLs last 90s)

function getCachedUrl(trackId: string, fileType: string): string | null {
  const key = `${trackId}:${fileType}`;
  const entry = urlCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.url;
  }
  urlCache.delete(key);
  return null;
}

function setCachedUrl(trackId: string, fileType: string, url: string) {
  urlCache.set(`${trackId}:${fileType}`, { url, expiresAt: Date.now() + CACHE_TTL_MS });
}

/* ── Mint signed playback URL via edge function ── */

async function mintPlaybackUrl(
  trackId: string,
  fileType: "audio" | "preview"
): Promise<string> {
  // Check cache first
  const cached = getCachedUrl(trackId, fileType);
  if (cached) {
    console.log("[AudioPlayer] Using cached signed URL for", trackId, fileType);
    return cached;
  }

  const { data, error } = await supabase.functions.invoke("mint-playback-url", {
    body: { trackId, fileType },
  });

  if (error) {
    throw new Error(error.message || "Failed to get playback URL");
  }

  if (!data?.url) {
    throw new Error(data?.error || "No URL returned from mint-playback-url");
  }

  setCachedUrl(trackId, fileType, data.url);
  console.log("[AudioPlayer] Minted signed URL for", trackId, fileType);
  return data.url;
}

/* ── Types ── */

export interface PlaybackDiagnostics {
  trackTitle: string | null;
  trackId: string | null;
  fileType: string | null;
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
  loadTrack: (trackId: string, fileType: "audio" | "preview", trackTitle?: string) => void;
}

/* ── Hook ── */

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
    trackId: null,
    fileType: null,
    lastError: null,
    canPlay: false,
    readyState: 0,
  });

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.volume = volume / 100;

    const audio = audioRef.current;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
      setDiagnostics((prev) => ({ ...prev, canPlay: true, readyState: audio.readyState }));
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setDiagnostics((prev) => ({ ...prev, canPlay: true, readyState: audio.readyState }));
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
      setDiagnostics((prev) => ({
        ...prev,
        lastError: errorMessage,
        canPlay: false,
        readyState: audioEl.readyState,
      }));
    };

    const handleWaiting = () => setIsLoading(true);
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

  const loadTrack = useCallback(
    (trackId: string, fileType: "audio" | "preview", trackTitle?: string) => {
      if (!audioRef.current) return;

      // Reset state
      setError(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setIsLoading(true);

      setDiagnostics({
        trackTitle: trackTitle || null,
        trackId,
        fileType,
        lastError: null,
        canPlay: false,
        readyState: 0,
      });

      console.log("[AudioPlayer] Loading track:", { trackId, fileType, trackTitle });

      // Fetch signed URL then load
      mintPlaybackUrl(trackId, fileType)
        .then((signedUrl) => {
          if (!audioRef.current) return;
          audioRef.current.src = signedUrl;
          audioRef.current.load();
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : "Failed to get playback URL";
          console.error("[AudioPlayer] mintPlaybackUrl failed:", msg);
          setError(msg);
          setIsLoading(false);
          setDiagnostics((prev) => ({ ...prev, lastError: msg }));
        });
    },
    []
  );

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
      setDiagnostics((prev) => ({ ...prev, lastError: msg }));
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
