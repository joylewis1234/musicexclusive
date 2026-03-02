import { Play, Pause, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlaylistTrack } from "@/hooks/usePlaylist";
import { SignedArtwork } from "@/components/ui/SignedArtwork";

import artist1 from "@/assets/artist-1.jpg";

interface PlaylistPlayerBarProps {
  activeTrack: PlaylistTrack | null;
  playlist: PlaylistTrack[];
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
}

const formatTime = (seconds: number) => {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const PlaylistPlayerBar = ({
  activeTrack,
  playlist,
  isPlaying,
  isLoading,
  currentTime,
  duration,
  onPlayPause,
}: PlaylistPlayerBarProps) => {
  if (!activeTrack) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 px-4">
      {/* Outer glow */}
      <div
        className="absolute inset-x-4 bottom-0 h-16 rounded-t-xl bg-primary/20 blur-xl opacity-50"
        aria-hidden="true"
      />

      {/* Main container — no seek bar, no stop button */}
      <div
        className={cn(
          "relative w-full rounded-t-xl overflow-hidden",
          "bg-card/95 backdrop-blur-lg border border-border/50 border-b-0",
          "shadow-[0_-4px_20px_rgba(0,255,255,0.15)]"
        )}
      >
        <div className="flex items-center gap-3 p-3">
          {/* Artwork */}
          <SignedArtwork
            trackId={activeTrack.track_id}
            alt={activeTrack.title}
            fallbackSrc={artist1}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          />

          {/* Track info */}
          <div className="flex-1 min-w-0">
            <p
              className="font-display text-sm font-semibold text-foreground truncate"
              style={{ textShadow: "0 0 10px rgba(0, 255, 255, 0.2)" }}
            >
              {activeTrack.title}
            </p>
            <p className="text-xs text-primary/80 truncate">
              {activeTrack.artist_name} · {formatTime(currentTime)} / {formatTime(duration)}
            </p>
          </div>

          {/* Play/Pause only */}
          <button
            onClick={onPlayPause}
            disabled={isLoading}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all",
              "bg-primary text-primary-foreground",
              "hover:shadow-[0_0_15px_hsla(180,100%,50%,0.3)] active:scale-95"
            )}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
