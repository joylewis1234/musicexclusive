import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Pause, Trash2, Music, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaylistTrack } from "@/hooks/usePlaylist";
import { StreamConfirmModal } from "@/components/player/StreamConfirmModal";
import { useStreamCharge } from "@/hooks/useStreamCharge";
import { useCredits } from "@/hooks/useCredits";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";

import artist1 from "@/assets/artist-1.jpg";

interface PlaylistSectionProps {
  playlist: PlaylistTrack[];
  isLoading: boolean;
  onRemove: (playlistEntryId: string, trackId: string) => Promise<boolean>;
  userEmail: string | null | undefined;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const PlaylistSection = ({
  playlist,
  isLoading,
  onRemove,
  userEmail,
}: PlaylistSectionProps) => {
  const navigate = useNavigate();
  const { credits, refetch: refetchCredits } = useCredits();
  const { chargeStream, hasBeenCharged, clearCharged } = useStreamCharge(userEmail);
  const {
    isPlaying,
    currentTime,
    duration,
    isLoading: audioLoading,
    play,
    pause,
    loadTrack,
  } = useAudioPlayer();

  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);
  const [showStreamConfirm, setShowStreamConfirm] = useState(false);
  const [pendingTrack, setPendingTrack] = useState<PlaylistTrack | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handlePlayPause = useCallback(
    (track: PlaylistTrack) => {
      // If this track is currently playing, just pause
      if (activeTrackId === track.track_id && isPlaying) {
        pause();
        return;
      }

      // If this track is paused (already loaded), resume
      if (activeTrackId === track.track_id && !isPlaying && hasBeenCharged(track.track_id)) {
        play();
        return;
      }

      // New track or needs charge — show confirmation
      if (!hasBeenCharged(track.track_id)) {
        setPendingTrack(track);
        setShowStreamConfirm(true);
        return;
      }

      // Already charged, load and play
      loadTrack(track.full_audio_url || "", track.title);
      setActiveTrackId(track.track_id);
      setTimeout(() => play(), 100);
    },
    [activeTrackId, isPlaying, hasBeenCharged, pause, play, loadTrack]
  );

  const handleStreamConfirm = useCallback(async () => {
    if (!pendingTrack) return;

    const result = await chargeStream(pendingTrack.track_id);

    if (result.success) {
      refetchCredits();
      loadTrack(pendingTrack.full_audio_url || "", pendingTrack.title);
      setActiveTrackId(pendingTrack.track_id);
      setTimeout(() => play(), 100);
    } else if (result.requiresCredits) {
      throw new Error("Insufficient credits");
    } else {
      throw new Error(result.error || "Failed to process stream");
    }
  }, [pendingTrack, chargeStream, refetchCredits, loadTrack, play]);

  const handleAddCredits = useCallback(() => {
    navigate("/fan/add-credits");
  }, [navigate]);

  const handleRemove = useCallback(
    async (track: PlaylistTrack) => {
      setRemovingId(track.id);
      // If this track is playing, pause first
      if (activeTrackId === track.track_id) {
        pause();
        setActiveTrackId(null);
      }
      await onRemove(track.id, track.track_id);
      setRemovingId(null);
    },
    [activeTrackId, pause, onRemove]
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (playlist.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Your playlist is empty</p>
        <p className="text-xs mt-1">
          Tap the + on any track to add it here
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1">
        {playlist.map((track) => {
          const isActive = activeTrackId === track.track_id;
          const isTrackPlaying = isActive && isPlaying;

          return (
            <div
              key={track.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                isActive
                  ? "bg-primary/10"
                  : "hover:bg-muted/30"
              )}
              style={{
                boxShadow: isActive
                  ? "inset 0 0 0 1px hsla(280, 80%, 50%, 0.3)"
                  : undefined,
              }}
            >
              {/* Play/Pause button */}
              <button
                onClick={() => handlePlayPause(track)}
                disabled={audioLoading && isActive}
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                  isTrackPlaying
                    ? "bg-primary/20 border border-primary"
                    : "bg-primary hover:bg-primary/90"
                )}
                style={{
                  boxShadow: isTrackPlaying
                    ? "0 0 15px hsla(280, 80%, 50%, 0.4)"
                    : "0 0 8px hsla(280, 80%, 50%, 0.2)",
                }}
                aria-label={isTrackPlaying ? "Pause" : "Play"}
              >
                {audioLoading && isActive ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : isTrackPlaying ? (
                  <Pause className="w-4 h-4 text-primary" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5 text-primary-foreground" fill="currentColor" />
                )}
              </button>

              {/* Artwork */}
              <img
                src={track.artwork_url || artist1}
                alt={track.title}
                className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                loading="lazy"
              />

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-sm font-medium truncate",
                    isActive ? "text-primary" : "text-foreground"
                  )}
                >
                  {track.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {track.artist_name} · {formatDuration(track.duration)}
                </p>
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleRemove(track)}
                disabled={removingId === track.id}
                className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors flex-shrink-0"
                aria-label="Remove from playlist"
              >
                {removingId === track.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Stream Confirmation Modal */}
      <StreamConfirmModal
        open={showStreamConfirm}
        onOpenChange={setShowStreamConfirm}
        artistName={pendingTrack?.artist_name || ""}
        trackTitle={pendingTrack?.title || ""}
        userCredits={credits}
        onConfirm={handleStreamConfirm}
        onAddCredits={handleAddCredits}
      />
    </>
  );
};
