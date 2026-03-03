import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useAudioPlayer,
  type LoadTrackParams,
  type UseAudioPlayerReturn,
} from "@/hooks/useAudioPlayer";

interface TrackMeta {
  trackId: string;
  trackTitle?: string;
  artistName?: string;
  artworkUrl?: string;
}

interface PreviewState {
  currentPreviewId: string | null;
  previewProgress: number;
  isPreviewPlaying: boolean;
  isPreviewLoading: boolean;
  previewError: string | null;
}

interface StartPreviewParams {
  trackId: string;
  startSeconds?: number;
  trackTitle?: string;
  artistName?: string;
  artworkUrl?: string;
  onComplete?: () => void;
}

interface AudioPlayerContextValue extends UseAudioPlayerReturn {
  currentTrackMeta: TrackMeta | null;
  startPaidTrack: (params: LoadTrackParams & TrackMeta) => Promise<void>;
  startPreview: (params: StartPreviewParams) => Promise<void>;
  stopPreview: () => void;
  previewState: PreviewState;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

const PREVIEW_DURATION_SECONDS = 25;

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  const player = useAudioPlayer();
  const [currentTrackMeta, setCurrentTrackMeta] = useState<TrackMeta | null>(null);
  const [previewState, setPreviewState] = useState<PreviewState>({
    currentPreviewId: null,
    previewProgress: 0,
    isPreviewPlaying: false,
    isPreviewLoading: false,
    previewError: null,
  });

  const previewIntervalRef = useRef<number | null>(null);
  const previewTimeoutRef = useRef<number | null>(null);
  const previewStartRef = useRef<number>(0);
  const previewCompleteRef = useRef<(() => void) | null>(null);

  const clearPreviewTimers = useCallback(() => {
    if (previewIntervalRef.current) {
      window.clearInterval(previewIntervalRef.current);
      previewIntervalRef.current = null;
    }
    if (previewTimeoutRef.current) {
      window.clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
  }, []);

  const stopPreview = useCallback(() => {
    if (player.currentTrack?.fileType === "preview") {
      player.stop();
    }
    clearPreviewTimers();
    previewCompleteRef.current = null;
    setPreviewState({
      currentPreviewId: null,
      previewProgress: 0,
      isPreviewPlaying: false,
      isPreviewLoading: false,
      previewError: null,
    });
  }, [clearPreviewTimers, player]);

  const startPaidTrack = useCallback(
    async (params: LoadTrackParams & TrackMeta) => {
      stopPreview();
      player.stop();
      setCurrentTrackMeta({
        trackId: params.trackId,
        trackTitle: params.trackTitle,
        artistName: params.artistName,
        artworkUrl: params.artworkUrl,
      });
      await player.loadTrack({
        trackId: params.trackId,
        fileType: params.fileType,
        trackTitle: params.trackTitle,
        forceRefresh: params.forceRefresh,
      });
    },
    [player, stopPreview]
  );

  const startPreview = useCallback(
    async ({
      trackId,
      startSeconds = 0,
      trackTitle,
      artistName,
      artworkUrl,
      onComplete,
    }: StartPreviewParams) => {
      clearPreviewTimers();
      previewCompleteRef.current = onComplete ?? null;

      // Stop any paid stream immediately before preview starts.
      player.stop();

      setCurrentTrackMeta({
        trackId,
        trackTitle,
        artistName,
        artworkUrl,
      });
      setPreviewState({
        currentPreviewId: trackId,
        previewProgress: 0,
        isPreviewPlaying: false,
        isPreviewLoading: true,
        previewError: null,
      });

      try {
        await player.loadTrack({
          trackId,
          fileType: "preview",
          trackTitle,
        });

        // Jump to the preview start once loaded.
        if (startSeconds > 0) {
          player.seek(startSeconds);
        }

        previewStartRef.current = performance.now();
        await player.play();
        setPreviewState((prev) => ({
          ...prev,
          isPreviewPlaying: true,
          isPreviewLoading: false,
        }));

        previewIntervalRef.current = window.setInterval(() => {
          const elapsed = (performance.now() - previewStartRef.current) / 1000;
          const progress = Math.min((elapsed / PREVIEW_DURATION_SECONDS) * 100, 100);
          setPreviewState((prev) => ({ ...prev, previewProgress: progress }));
        }, 100);

        previewTimeoutRef.current = window.setTimeout(() => {
          clearPreviewTimers();
          player.stop();
          setPreviewState({
            currentPreviewId: null,
            previewProgress: 100,
            isPreviewPlaying: false,
            isPreviewLoading: false,
            previewError: null,
          });
          previewCompleteRef.current?.();
          previewCompleteRef.current = null;
        }, PREVIEW_DURATION_SECONDS * 1000);
      } catch (err) {
        console.error("[AudioPlayer] Preview start failed:", err);
        clearPreviewTimers();
        setPreviewState({
          currentPreviewId: trackId,
          previewProgress: 0,
          isPreviewPlaying: false,
          isPreviewLoading: false,
          previewError: "Preview not available. Tap STREAM to listen inside.",
        });
      }
    },
    [clearPreviewTimers, player]
  );

  const value = useMemo<AudioPlayerContextValue>(
    () => ({
      ...player,
      currentTrackMeta,
      startPaidTrack,
      startPreview,
      stopPreview,
      previewState,
    }),
    [player, currentTrackMeta, startPaidTrack, startPreview, stopPreview, previewState]
  );

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useSharedAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useSharedAudioPlayer must be used within AudioPlayerProvider");
  }
  return context;
};
