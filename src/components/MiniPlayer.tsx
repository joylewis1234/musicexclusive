import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSharedAudioPlayer } from "@/contexts/AudioPlayerContext";
import { SignedArtwork } from "@/components/ui/SignedArtwork";

const MiniPlayer = () => {
  const { currentTrackMeta, isPlaying, play, pause } = useSharedAudioPlayer();

  // Don't render if no track is playing
  if (!currentTrackMeta) return null;

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) {
      pause();
    } else {
      void play();
    }
  };

  return (
    <div className="w-full px-4">
      {/* Outer glow */}
      <div 
        className="absolute inset-x-4 bottom-0 h-16 rounded-t-xl bg-primary/20 blur-xl opacity-50"
        aria-hidden="true"
      />
      
      {/* Main container */}
      <div
        className={cn(
          "relative w-full flex items-center gap-3 p-3 rounded-t-xl",
          "bg-card/95 backdrop-blur-lg border border-border/50 border-b-0",
          "shadow-[0_-4px_20px_rgba(0,255,255,0.15)]",
          "transition-all duration-300 hover:bg-card active:scale-[0.99]",
          "focus:outline-none focus:ring-2 focus:ring-primary/50"
        )}
      >
        {/* Album artwork */}
        <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
          <SignedArtwork
            trackId={currentTrackMeta.trackId}
            alt={currentTrackMeta.trackTitle ?? "Track artwork"}
            fallbackSrc={currentTrackMeta.artworkUrl}
            className="w-full h-full object-cover"
          />
          {/* Subtle glow on artwork */}
          <div 
            className="absolute inset-0 ring-1 ring-primary/30 rounded-lg"
            aria-hidden="true"
          />
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0 text-left">
          <p 
            className="font-display text-sm font-semibold text-foreground truncate"
            style={{
              textShadow: "0 0 10px rgba(0, 255, 255, 0.2)"
            }}
          >
            {currentTrackMeta.trackTitle ?? "Now Playing"}
          </p>
          <p className="text-xs text-primary/80 truncate">
            {currentTrackMeta.artistName ?? ""}
          </p>
        </div>

        {/* Play/Pause button */}
        <div
          onClick={handlePlayPause}
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
            "bg-primary text-primary-foreground shadow-cyan-sm",
            "hover:shadow-cyan-md transition-all duration-200 active:scale-95"
          )}
          role="button"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </div>
      </div>
    </div>
  );
};

export { MiniPlayer };
