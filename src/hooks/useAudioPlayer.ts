import { useState, useRef, useEffect, useCallback } from "react";
import Hls from "hls.js";
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
  hlsActive: boolean;
  sessionId?: string | null;
}

export interface LoadTrackParams {
  trackId: string;
  fileType: PlaybackFileType;
  trackTitle?: string;
  forceRefresh?: boolean;
}

export interface LoadPaidStreamParams {
  trackId: string;
  hlsUrl: string;
  sessionId?: string | null;
}

export interface UseAudioPlayerReturn {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  error: string | null;
  diagnostics: PlaybackDiagnostics;
  currentTrack: { trackId: string; fileType: PlaybackFileType; trackTitle?: string } | null;
  lastEndedTrackId: string | null;
  lastEndedAt: number | null;
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (vol: number) => void;
  loadTrack: (params: LoadTrackParams) => Promise<void>;
  loadPaidStream: (params: LoadPaidStreamParams) => void;
}

interface CachedEntry {
  url: string;
  hlsUrl?: string;
  expiresAt: number;
  sessionId?: string | null;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const signedUrlCacheRef = useRef(new Map<string, CachedEntry>());
  const loadStartRef = useRef<number | null>(null);
  const telemetrySentRef = useRef(false);
  const playbackSessionRef = useRef<string | null>(null);

  const currentTrackRef = useRef<{
    trackId: string;
    fileType: PlaybackFileType;
    trackTitle?: string;
  } | null>(null);

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
  const [lastEndedTrackId, setLastEndedTrackId] = useState<string | null>(null);
  const [lastEndedAt, setLastEndedAt] = useState<number | null>(null);

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
    hlsActive: false,
  });

  const getCacheKey = (trackId: string, fileType: PlaybackFileType) =>
    `${trackId}:${fileType}`;

  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

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

      return {
        url: data.url as string,
        hlsUrl: (data.hlsUrl as string) || undefined,
        expiresAt,
        sessionId: (data.session?.session_id as string) ?? null,
      };
    },
    []
  );

  const loadSignedUrl = useCallback(
    async (trackId: string, fileType: PlaybackFileType, forceRefresh = false) => {
      const cacheKey = getCacheKey(trackId, fileType);
      const now = Date.now();
      const cached = signedUrlCacheRef.current.get(cacheKey);

      if (!forceRefresh && cached && cached.expiresAt > now + 5_000) {
        return cached;
      }

      const minted = await mintSignedUrl(trackId, fileType);
      const entry: CachedEntry = {
        url: minted.url,
        hlsUrl: minted.hlsUrl,
        expiresAt: minted.expiresAt,
        sessionId: minted.sessionId,
      };
      signedUrlCacheRef.current.set(cacheKey, entry);
      return entry;
    },
    [mintSignedUrl]
  );

  const sendPlaybackTelemetry = useCallback(
    async (status: number, latencyMs?: number) => {
      const track = currentTrackRef.current;
      if (!track) return;
      try {
        await supabase.functions.invoke("playback-telemetry", {
          body: {
            trackId: track.trackId,
            sessionId: playbackSessionRef.current,
            status,
            latencyMs,
          },
        });
      } catch {
        // swallow telemetry errors
      }
    },
    []
  );

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
      // Track end state for replay-charge enforcement
      const track = currentTrackRef.current;
      if (track) {
        setLastEndedTrackId(track.trackId);
        setLastEndedAt(Date.now());
      }
    };
    const handleError = (e: Event) => {
      const audioEl = e.target as HTMLAudioElement;
      let errorMessage = "Unknown playback error";
      if (audioEl.error) {
        switch (audioEl.error.code) {
          case MediaError.MEDIA_ERR_ABORTED: errorMessage = "Playback aborted"; break;
          case MediaError.MEDIA_ERR_NETWORK: errorMessage = "Network error while loading audio"; break;
          case MediaError.MEDIA_ERR_DECODE: errorMessage = "Audio decode error - file may be corrupted"; break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: errorMessage = "Audio format not supported or URL invalid"; break;
        }
      }
      console.error("[AudioPlayer] Error:", errorMessage, audioEl.error);
      const latencyMs = loadStartRef.current
        ? Math.round(performance.now() - loadStartRef.current)
        : undefined;
      void sendPlaybackTelemetry(500, latencyMs);
      setError(errorMessage);
      setIsLoading(false);
      setIsPlaying(false);
      setDiagnostics((prev) => ({ ...prev, lastError: errorMessage, canPlay: false, readyState: audioEl.readyState }));
    };
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => {
      setIsLoading(false);
      setIsPlaying(true);
      if (!telemetrySentRef.current) {
        telemetrySentRef.current = true;
        const latencyMs = loadStartRef.current
          ? Math.round(performance.now() - loadStartRef.current)
          : undefined;
        void sendPlaybackTelemetry(200, latencyMs);
      }
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
      destroyHls();
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  const loadTrack = useCallback(
    async ({ trackId, fileType, trackTitle, forceRefresh }: LoadTrackParams) => {
      if (!audioRef.current) return;
      if (!trackId) { setError("Missing trackId"); return; }

      // Reset state
      destroyHls();
      setError(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setIsLoading(true);
      // Clear ended state when loading a new track
      setLastEndedTrackId(null);
      setLastEndedAt(null);
      setCurrentTrack({ trackId, fileType, trackTitle });
      currentTrackRef.current = { trackId, fileType, trackTitle };
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
        hlsActive: false,
      });

      try {
        const entry = await loadSignedUrl(trackId, fileType, !!forceRefresh);
        loadStartRef.current = performance.now();
        telemetrySentRef.current = false;
        playbackSessionRef.current = entry.sessionId ?? null;
        setDiagnostics((prev) => ({ ...prev, sessionId: entry.sessionId ?? null }));
        const audio = audioRef.current!;

        // Prefer HLS when available
        if (entry.hlsUrl) {
          if (Hls.isSupported()) {
            const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
            hlsRef.current = hls;

            hls.on(Hls.Events.ERROR, (_event, data) => {
              console.error("[AudioPlayer] HLS error:", data.type, data.details);
              if (data.fatal) {
                console.warn("[AudioPlayer] Fatal HLS error, falling back to signed URL");
                destroyHls();
                audio.src = entry.url;
                audio.load();
                setDiagnostics((prev) => ({
                  ...prev,
                  hlsActive: false,
                  audioUrl: entry.url,
                  lastError: `HLS fatal: ${data.details}, fell back to direct URL`,
                }));
              }
            });

            hls.loadSource(entry.hlsUrl);
            hls.attachMedia(audio);

            setDiagnostics((prev) => ({
              ...prev,
              audioUrl: entry.hlsUrl!,
              hlsActive: true,
            }));

            console.log("[AudioPlayer] HLS active for track:", { trackTitle, trackId, fileType });
          } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
            audio.src = entry.hlsUrl;
            audio.load();
            setDiagnostics((prev) => ({
              ...prev,
              audioUrl: entry.hlsUrl!,
              hlsActive: true,
            }));
            console.log("[AudioPlayer] Native HLS (Safari) for track:", { trackTitle, trackId });
          } else {
            audio.src = entry.url;
            audio.load();
            setDiagnostics((prev) => ({ ...prev, audioUrl: entry.url }));
            console.log("[AudioPlayer] No HLS support, using signed URL:", { trackTitle, trackId });
          }
        } else {
          audio.src = entry.url;
          audio.load();
          setDiagnostics((prev) => ({ ...prev, audioUrl: entry.url }));
          console.log("[AudioPlayer] No hlsUrl, using signed URL:", { trackTitle, trackId, fileType });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load audio";
        setError(msg);
        setIsLoading(false);
        setDiagnostics((prev) => ({ ...prev, lastError: msg }));
      }
    },
    [loadSignedUrl, destroyHls]
  );

  const play = useCallback(async () => {
    if (!audioRef.current) { setError("Audio player not initialized"); return; }
    const audio = audioRef.current;
    if (!audio.src || !currentTrack) { setError("No audio source loaded"); return; }

    // If at end, reset to beginning
    if (duration > 0 && audio.currentTime >= duration - 0.1) {
      audio.currentTime = 0;
      setCurrentTime(0);
    }

    try {
      // Only refresh signed URL if NOT using HLS
      if (!hlsRef.current) {
        const cacheKey = getCacheKey(currentTrack.trackId, currentTrack.fileType);
        const cached = signedUrlCacheRef.current.get(cacheKey);
        if (!cached || cached.expiresAt <= Date.now() + 5_000) {
          const refreshed = await loadSignedUrl(currentTrack.trackId, currentTrack.fileType, true);
          audio.src = refreshed.url;
          audio.load();
          setDiagnostics((prev) => ({ ...prev, audioUrl: refreshed.url }));
        }
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
      setDiagnostics((prev) => ({ ...prev, lastError: msg }));
    } finally {
      setIsLoading(false);
    }
  }, [currentTrack, loadSignedUrl, duration]);

  const pause = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false); }
  }, []);

  const stop = useCallback(() => {
    if (hlsRef.current) hlsRef.current.stopLoad();
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

  const loadPaidStream = useCallback(
    (params: LoadPaidStreamParams) => {
      if (!audioRef.current) return;

      destroyHls();
      setError(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setIsLoading(true);
      // Clear ended state when loading a new paid stream
      setLastEndedTrackId(null);
      setLastEndedAt(null);
      loadStartRef.current = performance.now();
      telemetrySentRef.current = false;
      playbackSessionRef.current = params.sessionId ?? null;

      const audio = audioRef.current;

      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        hlsRef.current = hls;

        hls.on(Hls.Events.ERROR, (_event, data) => {
          console.error("[AudioPlayer] HLS error (paid):", data.type, data.details);
          if (data.fatal) {
            destroyHls();
            setError("Playback error — please retry");
            setIsLoading(false);
          }
        });

        hls.loadSource(params.hlsUrl);
        hls.attachMedia(audio);

        setDiagnostics((prev) => ({
          ...prev,
          trackId: params.trackId,
          audioUrl: params.hlsUrl,
          hlsActive: true,
          sessionId: params.sessionId ?? null,
          canPlay: false,
          readyState: 0,
          lastError: null,
        }));
      } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
        audio.src = params.hlsUrl;
        audio.load();
        setDiagnostics((prev) => ({
          ...prev,
          trackId: params.trackId,
          audioUrl: params.hlsUrl,
          hlsActive: true,
          sessionId: params.sessionId ?? null,
          canPlay: false,
          readyState: 0,
          lastError: null,
        }));
      } else {
        setError("HLS not supported on this browser");
        setIsLoading(false);
      }
    },
    [destroyHls]
  );

  return {
    isPlaying, currentTime, duration, volume, isLoading, error, diagnostics,
    currentTrack, lastEndedTrackId, lastEndedAt,
    play, pause, stop, seek, setVolume, loadTrack, loadPaidStream,
  };
}
