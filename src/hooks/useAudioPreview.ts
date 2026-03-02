import { useCallback } from "react";
import { useSharedAudioPlayer, PreviewState } from "@/contexts/AudioPlayerContext";

interface UseAudioPreviewReturn {
  currentPreviewId: string | null;
  previewProgress: number;
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  startPreview: (trackId: string, startSeconds?: number, onComplete?: () => void) => void;
  stopPreview: () => void;
}

export const useAudioPreview = (): UseAudioPreviewReturn => {
  const { startPreview, stopPreview, previewState } = useSharedAudioPlayer();

  return {
    currentPreviewId: previewState.currentPreviewId,
    previewProgress: previewState.previewProgress,
    isPlaying: previewState.isPlaying,
    isLoading: previewState.isLoading,
    error: previewState.error,
    startPreview,
    stopPreview,
  };
};
