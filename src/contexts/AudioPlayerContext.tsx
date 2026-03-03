import React, { createContext, useContext, useRef, useCallback, useState, useEffect } from "react";
import { useAudioPlayer, UseAudioPlayerReturn, LoadPaidStreamParams } from "@/hooks/useAudioPlayer";

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
  // Use a ref for previewId to avoid dependency loops in stopPreview
  const previewIdRef = useRef<string | null>(null);

  const clearPreviewTimers = useCallback(() => {
    if (previewTimerRef.current) {
      clearInterval(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  }, []);

  // Keep ref in sync with state
  useEffect(() => {
    previewIdRef.current = previewId;
  }, [previewId]);

  // Use a ref for player.stop to break dependency chain
  const playerStopRef = useRef(player.stop);
  useEffect(() => {
    playerStopRef.current = player.stop;
  }, [player.stop]);

  const stopPreview = useCallback(() => {
    clearPreviewTimers();
    previewActiveRef.current = false;
    if (previewIdRef.current) {
      playerStopRef.current();
    }
    setPreviewId(null);
    setPreviewProgress(0);
    setPreviewLoading(false);
    setPreviewError(null);
    previewOnCompleteRef.current = null;
  }, [clearPreviewTimers]); // stable — no previewId or player deps

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
        // loadTrack already mints a signed URL internally — no separate mint needed
        await player.loadTrack({ trackId, fileType: "preview", trackTitle: "Preview" });

        if (!previewActiveRef.current) return; // cancelled while loading

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
            playerStopRef.current();
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
  // Only stop if the ended track matches the current preview track
  useEffect(() => {
    if (
      player.lastEndedTrackId &&
      previewActiveRef.current &&
      player.lastEndedTrackId === previewIdRef.current
    ) {
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
