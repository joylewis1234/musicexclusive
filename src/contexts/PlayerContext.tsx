import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import Hls from "hls.js";

import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";

// Legacy Track interface (kept for MusicPlayer.tsx / ShareTrackModal backward compat)
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  duration: number;
}

// PlayerTrack – used by global audio engine
export interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
  artistId: string;
  // Optional legacy compat fields
  album?: string;
  artwork?: string;
  duration?: number;
}

type PlaybackMode = "preview" | "paid";
type StopReason = "ended" | "manualStop";

interface PlayerContextType {
  // ---- New API ----
  currentTrack: PlayerTrack | null;
  playbackMode: PlaybackMode | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
  previewProgress: number;
  originArtistId: string | null;
  loadAndPlayPreview: (track: PlayerTrack, signedUrl: string, startSeconds: number, durationLimit?: number) => void;
  loadAndPlayPaid: (track: PlayerTrack, hlsUrl: string, sessionId?: string | null) => void;
  play: () => void;
  pause: () => void;
  stopCurrent: (reason: StopReason) => void;
  onEndedRef: React.MutableRefObject<(() => void) | null>;
  onPreviewLimitReachedRef: React.MutableRefObject<((trackId: string) => void) | null>;
  // ---- Legacy API (MusicPlayer.tsx) ----
  volume: number;
  playTrack: (track: Track) => void;
  togglePlayPause: () => void;
  setCurrentTime: (time: number) => void;
  setVolume: (volume: number) => void;
  stopPlayback: () => void;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

// Mock tracks library (legacy, for MusicPlayer.tsx)
export const tracksLibrary: Record<string, Track> = {
  "1": { id: "1", title: "Midnight Protocol", artist: "NOVA", album: "Digital Dreams", artwork: artist1, duration: 234 },
  "2": { id: "2", title: "Velvet Skies", artist: "AURA", album: "Ethereal", artwork: artist2, duration: 198 },
  "3": { id: "3", title: "Lost Frequency", artist: "ECHO", album: "Signals", artwork: artist3, duration: 267 },
};

export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  // ---- State ----
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeState, setCurrentTimeState] = useState(0);
  const [durationState, setDurationState] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [originArtistId, setOriginArtistId] = useState<string | null>(null);
  const [volume, setVolumeState] = useState(75);

  // ---- Persistent refs ----
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playbackModeRef = useRef<PlaybackMode | null>(null);
  const currentTrackRef = useRef<PlayerTrack | null>(null);

  // Preview cumulative tracking
  const previewBankedTimeRef = useRef(0);
  const previewPlayStartRef = useRef<number | null>(null);
  const previewDurationLimitRef = useRef(25);
  const previewIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // External callbacks
  const onEndedRef = useRef<(() => void) | null>(null);
  const onPreviewLimitReachedRef = useRef<((trackId: string) => void) | null>(null);

  // ---- Helpers ----
  const destroyHls = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  const clearPreviewTracking = useCallback(() => {
    if (previewIntervalRef.current) {
      clearInterval(previewIntervalRef.current);
      previewIntervalRef.current = null;
    }
    previewPlayStartRef.current = null;
  }, []);

  const startPreviewTracking = useCallback(() => {
    previewPlayStartRef.current = Date.now();
    previewIntervalRef.current = setInterval(() => {
      if (previewPlayStartRef.current === null) return;
      const elapsed = previewBankedTimeRef.current + (Date.now() - previewPlayStartRef.current) / 1000;
      const limit = previewDurationLimitRef.current;
      const progress = Math.min((elapsed / limit) * 100, 100);
      setPreviewProgress(progress);

      if (elapsed >= limit) {
        // 25 s cumulative reached — fire modal callback
        clearPreviewTracking();
        if (audioRef.current) audioRef.current.pause();
        const trackId = currentTrackRef.current?.id || "";
        // Clear state
        setCurrentTrack(null);
        currentTrackRef.current = null;
        setPlaybackMode(null);
        playbackModeRef.current = null;
        setIsPlaying(false);
        setCurrentTimeState(0);
        setPreviewProgress(0);
        setOriginArtistId(null);
        setDurationState(0);
        // Fire callback AFTER clearing (only place that fires it)
        onPreviewLimitReachedRef.current?.(trackId);
      }
    }, 100);
  }, [clearPreviewTracking]);

  // Stops audio + HLS without touching React state (for takeover — avoids flicker)
  const internalCleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current.load(); // reset element
    }
    destroyHls();
    clearPreviewTracking();
  }, [destroyHls, clearPreviewTracking]);

  // ---- Initialise persistent audio element (once) ----
  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.75;
    audio.loop = false;
    audioRef.current = audio;

    const handleTimeUpdate = () => setCurrentTimeState(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDurationState(audio.duration);
      setIsLoading(false);
    };
    const handleEnded = () => {
      const mode = playbackModeRef.current;
      clearPreviewTracking();
      destroyHls();
      setCurrentTrack(null);
      currentTrackRef.current = null;
      setPlaybackMode(null);
      playbackModeRef.current = null;
      setIsPlaying(false);
      setCurrentTimeState(0);
      setPreviewProgress(0);
      setOriginArtistId(null);
      setDurationState(0);
      // Only paid mode fires onEndedRef (preview ending before 25 s = no modal)
      if (mode === "paid") {
        onEndedRef.current?.();
      }
    };
    const handleError = () => {
      const err = audio.error;
      let msg = "Playback error";
      if (err) {
        switch (err.code) {
          case MediaError.MEDIA_ERR_NETWORK: msg = "Network error"; break;
          case MediaError.MEDIA_ERR_DECODE: msg = "Audio decode error"; break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: msg = "Format not supported"; break;
        }
      }
      setError(msg);
      setIsLoading(false);
      setIsPlaying(false);
    };
    const handleWaiting = () => setIsLoading(true);
    const handlePlaying = () => { setIsLoading(false); setIsPlaying(true); };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("playing", handlePlaying);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("playing", handlePlaying);
      audioRef.current = null;
      destroyHls();
      clearPreviewTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100;
  }, [volume]);

  // ---- Public API ----

  const loadAndPlayPreview = useCallback(
    (track: PlayerTrack, signedUrl: string, startSeconds: number, durationLimit: number = 25) => {
      const prevMode = playbackModeRef.current;
      internalCleanup();
      if (prevMode === "paid") onEndedRef.current?.(); // invalidate paid session

      // Reset cumulative counter for new preview
      previewBankedTimeRef.current = 0;
      previewDurationLimitRef.current = durationLimit;

      // Set state immediately (avoids flicker)
      setCurrentTrack(track);
      currentTrackRef.current = track;
      setPlaybackMode("preview");
      playbackModeRef.current = "preview";
      setOriginArtistId(track.artistId);
      setIsPlaying(false);
      setIsLoading(true);
      setCurrentTimeState(0);
      setDurationState(0);
      setError(null);
      setPreviewProgress(0);

      const audio = audioRef.current!;
      const onReady = () => {
        audio.currentTime = startSeconds;
        audio.play()
          .then(() => { startPreviewTracking(); })
          .catch(() => { setError("Could not play preview"); setIsLoading(false); });
      };
      audio.addEventListener("canplaythrough", onReady, { once: true });
      audio.src = signedUrl;
      audio.load();
    },
    [internalCleanup, startPreviewTracking],
  );

  const loadAndPlayPaid = useCallback(
    (track: PlayerTrack, hlsUrl: string, _sessionId?: string | null) => {
      const prevMode = playbackModeRef.current;
      internalCleanup();
      if (prevMode === "paid") onEndedRef.current?.();

      setCurrentTrack(track);
      currentTrackRef.current = track;
      setPlaybackMode("paid");
      playbackModeRef.current = "paid";
      setOriginArtistId(track.artistId);
      setIsPlaying(false);
      setIsLoading(true);
      setCurrentTimeState(0);
      setDurationState(0);
      setError(null);
      setPreviewProgress(0);

      const audio = audioRef.current!;
      audio.loop = false;

      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        hlsRef.current = hls;
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            destroyHls();
            setError("Playback error — please retry");
            setIsLoading(false);
          }
        });
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          audio.play().catch(() => { setError("Playback failed"); setIsLoading(false); });
        });
        hls.loadSource(hlsUrl);
        hls.attachMedia(audio);
      } else if (audio.canPlayType("application/vnd.apple.mpegurl")) {
        audio.addEventListener("canplay", () => {
          audio.play().catch(() => { setError("Playback failed"); setIsLoading(false); });
        }, { once: true });
        audio.src = hlsUrl;
        audio.load();
      } else {
        setError("HLS not supported on this browser");
        setIsLoading(false);
      }
    },
    [internalCleanup, destroyHls],
  );

  const play = useCallback(() => {
    if (!audioRef.current || !currentTrackRef.current) return;
    audioRef.current.play()
      .then(() => {
        setIsPlaying(true);
        if (playbackModeRef.current === "preview") startPreviewTracking();
      })
      .catch(() => { setError("Could not resume playback"); });
  }, [startPreviewTracking]);

  const pause = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
    // Bank preview time
    if (playbackModeRef.current === "preview" && previewPlayStartRef.current !== null) {
      previewBankedTimeRef.current += (Date.now() - previewPlayStartRef.current) / 1000;
      previewPlayStartRef.current = null;
      if (previewIntervalRef.current) {
        clearInterval(previewIntervalRef.current);
        previewIntervalRef.current = null;
      }
    }
  }, []);

  const stopCurrent = useCallback((reason: StopReason) => {
    const prevMode = playbackModeRef.current;
    internalCleanup();
    if (reason === "ended" && prevMode === "paid") onEndedRef.current?.();
    setCurrentTrack(null);
    currentTrackRef.current = null;
    setPlaybackMode(null);
    playbackModeRef.current = null;
    setIsPlaying(false);
    setCurrentTimeState(0);
    setDurationState(0);
    setPreviewProgress(0);
    setOriginArtistId(null);
    setError(null);
  }, [internalCleanup]);

  // ---- Legacy wrappers (MusicPlayer.tsx) ----
  const playTrack = useCallback((track: Track) => {
    const pt: PlayerTrack = {
      id: track.id, title: track.title, artist: track.artist,
      artworkUrl: track.artwork, artistId: "",
      album: track.album, artwork: track.artwork, duration: track.duration,
    };
    internalCleanup();
    setCurrentTrack(pt);
    currentTrackRef.current = pt;
    setPlaybackMode(null);
    playbackModeRef.current = null;
    setIsPlaying(true);
    setCurrentTimeState(0);
    setDurationState(track.duration);
  }, [internalCleanup]);

  const togglePlayPause = useCallback(() => { setIsPlaying((p) => !p); }, []);
  const setCurrentTimeLegacy = useCallback((t: number) => { setCurrentTimeState(t); }, []);
  const setVolumeLegacy = useCallback((v: number) => { setVolumeState(v); }, []);
  const stopPlayback = useCallback(() => { stopCurrent("manualStop"); }, [stopCurrent]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack, playbackMode, isPlaying,
        currentTime: currentTimeState, duration: durationState,
        isLoading, error, previewProgress, originArtistId,
        loadAndPlayPreview, loadAndPlayPaid, play, pause, stopCurrent,
        onEndedRef, onPreviewLimitReachedRef,
        volume, playTrack, togglePlayPause,
        setCurrentTime: setCurrentTimeLegacy,
        setVolume: setVolumeLegacy, stopPlayback,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used within a PlayerProvider");
  return context;
};
