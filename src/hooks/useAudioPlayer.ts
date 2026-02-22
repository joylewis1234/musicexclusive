import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type PlaybackFileType = "audio" | "preview";

export interface PlaybackDiagnostics {
  trackTitle: string | null;
  trackId: string | null;
  fileType: PlaybackFileType | null;
  audioUrl: string | null;
  audioPath: string | null;
  bucketName: string;
  lastError: string | null;
  canPlay: boolean;
  readyState: number;
}

export interface LoadTrackParams {
  trackId: string;
  fileType: PlaybackFileType;
  trackTitle?: string;
  forceRefresh?: boolean;
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
  loadTrack: (params: LoadTrackParams) => Promise<void>;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const signedUrlCacheRef = useRef(
    new Map<string, { url: string; expiresAt: number }>()
  );

  const [currentTrack, setCurrentTrack] = useState<{
    trackId: string;
    fileType: PlaybackFileType;
    trackTitle?: string;
  } | null>(null);

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
    audioUrl: null,
    audioPath: null,
    bucketName: "r2",
    lastError: null,
    canPlay: false,
    readyState: 0,
  });

  const getCacheKey = (trackId: string, fileType: PlaybackFileType) =>
    `${trackId}:${fileType}`;

  const mintSignedUrl = useCallback(
    async (trackId: string, fileType: PlaybackFileType) => {
      const { data, error: fnError } = await supabase.functions.invoke(
        "mint-playback-url",
        { body: { trackId, fileType } }
      );

      if (fnError) {
        throw new Error(fnError.message || "Failed to mint playback URL");
      }
      if (!data?.url) {
        throw new Error("Failed to mint playback URL (missing url)");
      }

      const expiresAt = data.expiresAt
        ? new Date(data.expiresAt).getTime()
        : Date.now() + 60_000;

      return { url: data.url as string, expiresAt };
    },
    []
  );

  const loadSignedUrl = useCallback(
    async (trackId: string, fileType: PlaybackFileType, forceRefresh = false) => {
      const cacheKey = getCacheKey(trackId, fileType);
      const now = Date.now();
      const cached = signedUrlCacheRef.current.get(cacheKey);

      if (!forceRefresh && cached && cached.expiresAt > now + 5_000) {
        return cached.url;
      }

      const minted = await mintSignedUrl(trackId, fileType);
      signedUrlCacheRef.current.set(cacheKey, minted);
      return minted.url;
    },
    [mintSignedUrl]
  );

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
      setDiagnostics((prev) => ({
        ...prev,
        canPlay: true,
        readyState: audio.readyState,
      }));
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      setDiagnostics((prev) => ({
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
      setDiagnostics((prev) => ({
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

  const loadTrack = useCallback(
    async ({ trackId, fileType, trackTitle, forceRefresh }: LoadTrackParams) => {
      if (!audioRef.current) return;

      if (!trackId) {
        setError("Missing trackId");
        return;
      }

      setError(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setIsLoading(true);
      setCurrentTrack({ trackId, fileType, trackTitle });

      setDiagnostics({
        trackTitle: trackTitle || null,
        trackId,
        fileType,
        audioUrl: null,
        audioPath: null,
        bucketName: "r2",
        lastError: null,
        canPlay: false,
        readyState: 0,
      });

      try {
        const signedUrl = await loadSignedUrl(
          trackId,
          fileType,
          !!forceRefresh
        );

        setDiagnostics((prev) => ({
          ...prev,
          audioUrl: signedUrl,
        }));

        audioRef.current.src = signedUrl;
        audioRef.current.load();

        console.log("[AudioPlayer] Loading track:", {
          trackTitle,
          trackId,
          fileType,
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to load audio";
        setError(msg);
        setIsLoading(false);
        setDiagnostics((prev) => ({
          ...prev,
          lastError: msg,
        }));
      }
    },
    [loadSignedUrl]
  );

  const play = useCallback(async () => {
    if (!audioRef.current) {
      setError("Audio player not initialized");
      return;
    }

    const audio = audioRef.current;

    if (!audio.src || !currentTrack) {
      setError("No audio source loaded");
      return;
    }

    try {
      const cacheKey = getCacheKey(
        currentTrack.trackId,
        currentTrack.fileType
      );
      const cached = signedUrlCacheRef.current.get(cacheKey);

      if (!cached || cached.expiresAt <= Date.now() + 5_000) {
        const refreshed = await loadSignedUrl(
          currentTrack.trackId,
          currentTrack.fileType,
          true
        );
        audio.src = refreshed;
        audio.load();
        setDiagnostics((prev) => ({
          ...prev,
          audioUrl: refreshed,
        }));
      }

      setIsLoading(true);
      setError(null);
      await audio.play();
      setIsPlaying(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to play audio";
      console.error("[AudioPlayer] Play failed:", err);
      setError(msg);
      setIsPlaying(false);
      setDiagnostics((prev) => ({
        ...prev,
        lastError: msg,
      }));
    } finally {
      setIsLoading(false);
    }
  }, [currentTrack, loadSignedUrl]);

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
