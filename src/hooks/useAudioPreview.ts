import { useSharedAudioPlayer } from "@/contexts/AudioPlayerContext";

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
  const { previewState, startPreview, stopPreview } = useSharedAudioPlayer();

  return {
    currentPreviewId: previewState.currentPreviewId,
    previewProgress: previewState.previewProgress,
    isPlaying: previewState.isPreviewPlaying,
    isLoading: previewState.isPreviewLoading,
    error: previewState.previewError,
    startPreview: (trackId, startSeconds, onComplete) =>
      void startPreview({ trackId, startSeconds, onComplete }),
    stopPreview,
  };
};
