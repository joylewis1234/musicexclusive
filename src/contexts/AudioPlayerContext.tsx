import React, { createContext, useContext, useRef, useCallback, useState, useEffect } from "react";
import { useAudioPlayer, UseAudioPlayerReturn, LoadPaidStreamParams } from "@/hooks/useAudioPlayer";
import { supabase } from "@/integrations/supabase/client";

const PREVIEW_DURATION = 25;

export interface PreviewState {
  currentPreviewId: string | null;
  previewProgress: number;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AudioPlayerContextValue extends UseAudioPlayerReturn {
  /** Start a 25s preview. Stops any paid stream first. */
  startPreview: (trackId: string, startSeconds?: number, onComplete?: () => void) => void;
  /** Stop the current preview. */
  stopPreview: () => void;
  /** Preview state for UI binding. */
  previewState: PreviewState;
  /** Start a paid stream. Stops any preview first. */
  startPaidTrack: (params: LoadPaidStreamParams) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

export const useSharedAudioPlayer = () => {
  const ctx = useContext(AudioPlayerContext);
  if (!ctx) throw new Error("useSharedAudioPlayer must be used within AudioPlayerProvider");
  return ctx;
};

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const player = useAudioPlayer();

  // Preview state
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);
  const previewStartRef = useRef<number>(0);
  const previewOnCompleteRef = useRef<(() => void) | null>(null);
  const previewActiveRef = useRef(false);

  const clearPreviewTimers = useCallback(() => {
    if (previewTimerRef.current) {
      clearInterval(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  }, []);

  const stopPreview = useCallback(() => {
    clearPreviewTimers();
    previewActiveRef.current = false;
    if (previewId) {
      player.stop();
    }
    setPreviewId(null);
    setPreviewProgress(0);
    setPreviewLoading(false);
    setPreviewError(null);
    previewOnCompleteRef.current = null;
  }, [previewId, player, clearPreviewTimers]);

  const startPreview = useCallback(
    async (trackId: string, startSeconds: number = 0, onComplete?: () => void) => {
      // Stop any current preview
      stopPreview();

      setPreviewId(trackId);
      setPreviewLoading(true);
      setPreviewError(null);
      previewOnCompleteRef.current = onComplete || null;
      previewActiveRef.current = true;

      try {
        // Mint a preview URL
        const { data, error: fnError } = await supabase.functions.invoke(
          "mint-playback-url",
          { body: { trackId, fileType: "preview" } }
        );

        if (!previewActiveRef.current) return; // cancelled while fetching

        if (fnError || !data?.url) {
          setPreviewError("Preview not available. Tap STREAM to listen inside.");
          setPreviewLoading(false);
          return;
        }

        // Load and play via the shared audio player
        await player.loadTrack({ trackId, fileType: "preview", trackTitle: "Preview" });

        if (!previewActiveRef.current) return;

        // Seek to start position
        if (startSeconds > 0) {
          player.seek(startSeconds);
        }

        await player.play();
        setPreviewLoading(false);

        // Start 25s countdown
        previewStartRef.current = Date.now();
        previewTimerRef.current = setInterval(() => {
          const elapsed = (Date.now() - previewStartRef.current) / 1000;
          const progress = Math.min((elapsed / PREVIEW_DURATION) * 100, 100);
          setPreviewProgress(progress);

          if (elapsed >= PREVIEW_DURATION) {
            // Auto-stop preview
            clearPreviewTimers();
            player.stop();
            previewActiveRef.current = false;
            setPreviewId(null);
            setPreviewProgress(0);
            // Fire completion callback
            const cb = previewOnCompleteRef.current;
            previewOnCompleteRef.current = null;
            cb?.();
          }
        }, 100);
      } catch (err) {
        if (!previewActiveRef.current) return;
        setPreviewError("Could not play preview");
        setPreviewLoading(false);
      }
    },
    [stopPreview, player, clearPreviewTimers]
  );

  const startPaidTrack = useCallback(
    (params: LoadPaidStreamParams) => {
      // Stop any preview first
      if (previewActiveRef.current) {
        stopPreview();
      }
      player.loadPaidStream(params);
    },
    [player, stopPreview]
  );

  // If audio ends while a preview is active, clean up preview state
  useEffect(() => {
    if (player.lastEndedTrackId && previewActiveRef.current) {
      stopPreview();
    }
  }, [player.lastEndedTrackId, stopPreview]);

  const previewState: PreviewState = {
    currentPreviewId: previewId,
    previewProgress,
    isPlaying: previewId !== null && player.isPlaying,
    isLoading: previewLoading,
    error: previewError,
  };

  const value: AudioPlayerContextValue = {
    ...player,
    startPreview,
    stopPreview,
    previewState,
    startPaidTrack,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
};
