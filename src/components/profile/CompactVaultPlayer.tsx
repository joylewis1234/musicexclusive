import { Play, Pause, Heart, Share2, Loader2, AlertCircle, Crown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlayer, type PlayerTrack } from "@/contexts/PlayerContext";
import { SignedArtwork } from "@/components/ui/SignedArtwork";

interface CompactVaultPlayerProps {
  track: PlayerTrack | null;
  hasVaultAccess: boolean;
  isLiked?: boolean;
  onAccessDenied?: () => void;
  onPlay?: () => void;
  onLike?: () => void;
  onShare?: () => void;
  /** If true, skip the onPlay callback and resume directly (already charged) */
  skipPlayConfirm?: boolean;
}

export const CompactVaultPlayer = ({
  track,
  hasVaultAccess,
  isLiked = false,
  onAccessDenied,
  onPlay,
  onLike,
  onShare,
  skipPlayConfirm = false,
}: CompactVaultPlayerProps) => {
  const player = usePlayer();

  // This track is the active paid stream in the global engine
  const isActive = track !== null && player.currentTrack?.id === track.id && player.playbackMode === "paid";
  const isPlaying = isActive && player.isPlaying;
  const currentTime = isActive ? player.currentTime : 0;
  const duration = isActive ? player.duration : 0;
  const isLoading = isActive && player.isLoading;
  const error = isActive ? player.error : null;

  const handlePlayPause = () => {
    if (!track) return;

    if (!hasVaultAccess) {
      onAccessDenied?.();
      return;
    }

    if (isPlaying) {
      player.pause();
    } else if (isActive && !player.isPlaying && skipPlayConfirm) {
      // Resume existing paid session (free — no new charge)
      player.play();
    } else {
      // Not active or not charged yet — open confirmation modal
      onPlay?.();
    }
  };

  // Empty state
  if (!track) {
    return (
      <div className="mx-5 mb-6">
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsla(280, 80%, 50%, 0.08), hsla(280, 80%, 30%, 0.05))",
            border: "1px solid hsla(280, 80%, 50%, 0.15)",
          }}
        >
          <div className="px-5 py-6 text-center">
            <div
              className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
              style={{ background: "hsla(280, 80%, 50%, 0.12)" }}
            >
              <Play className="w-5 h-5 text-primary/50 ml-0.5" />
            </div>
            <p className="text-sm font-medium" style={{ color: "hsl(280, 70%, 65%)" }}>
              Select a track to load the Vault Player
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-5 mb-6" style={{ contain: "layout style paint", isolation: "isolate", transform: "translateZ(0)" }}>
      <div className="relative rounded-2xl overflow-hidden">
        {/* Animated glow border when playing */}
        <div
          className={cn(
            "absolute -inset-[1px] rounded-2xl transition-opacity duration-500",
            isPlaying ? "opacity-100" : "opacity-50",
          )}
          style={{
            background: "linear-gradient(135deg, hsl(280, 80%, 50%), hsl(300, 70%, 50%), hsl(280, 80%, 50%))",
            filter: isPlaying ? "blur(4px)" : "blur(2px)",
            willChange: "opacity",
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
          }}
        />

        {/* Content container */}
        <div
          className="relative rounded-2xl p-4"
          style={{ background: "linear-gradient(180deg, hsl(var(--card)) 0%, hsla(280, 30%, 8%, 0.98) 100%)" }}
        >
          {/* Top section: Artwork + Info + Controls */}
          <div className="flex items-center gap-4 mb-4">
            {/* Album art with glow */}
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-1 rounded-xl blur-sm opacity-60" style={{ background: "hsl(280, 80%, 50%)" }} />
              <SignedArtwork
                trackId={track.id}
                alt={track.title}
                fallbackSrc={track.artworkUrl}
                className="relative w-16 h-16 rounded-xl object-cover"
              />
              {isPlaying && (
                <div className="absolute inset-0 rounded-xl bg-black/30 flex items-center justify-center" style={{ transform: "translate3d(0,0,0)" }}>
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1 bg-white rounded-full"
                        style={{
                          height: "12px",
                          animation: `pulse 600ms cubic-bezier(0.4, 0, 0.6, 1) infinite ${i * 150}ms`,
                          willChange: "opacity",
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Track info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="font-semibold text-foreground truncate">{track.title}</p>
                <Crown
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{ color: "hsl(45, 90%, 55%)", filter: "drop-shadow(0 0 3px hsla(45, 90%, 55%, 0.6))" }}
                  fill="hsl(45, 90%, 55%)"
                />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
                {duration > 0 && (
                  <span
                    className="flex items-center gap-1 flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground/70"
                    style={{ background: "hsla(var(--muted), 0.3)" }}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, "0")}
                  </span>
                )}
              </div>
              {isLoading && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Loading...</span>
                </div>
              )}
            </div>

            {/* Main play/pause button */}
            <button
              onClick={handlePlayPause}
              disabled={isLoading && !isPlaying}
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center transition-all flex-shrink-0",
                isPlaying ? "bg-primary/20 border-2 border-primary" : "bg-primary hover:bg-primary/90",
              )}
              style={{
                boxShadow: isPlaying
                  ? "0 0 25px hsla(280, 80%, 50%, 0.5)"
                  : "0 0 15px hsla(280, 80%, 50%, 0.3)",
              }}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isLoading && !isPlaying ? (
                <Loader2 className="w-6 h-6 animate-spin text-white" />
              ) : isPlaying ? (
                <Pause className="w-6 h-6 text-primary" />
              ) : (
                <Play className="w-6 h-6 ml-0.5 text-primary-foreground" fill="currentColor" />
              )}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-3 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {/* Like + Share */}
          <div className="flex items-center justify-end gap-2 mt-1">
            {onLike && (
              <button
                onClick={onLike}
                className={cn(
                  "p-2.5 rounded-full transition-all",
                  isLiked
                    ? "bg-pink-500/20 text-pink-400"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
                aria-label={isLiked ? "Unlike" : "Like"}
              >
                <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
              </button>
            )}
            {onShare && (
              <button
                onClick={onShare}
                className="p-2.5 rounded-full bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                aria-label="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Vault access message */}
          {!hasVaultAccess && (
            <div className="mt-3 text-center">
              <p className="text-xs text-amber-400/80">Vault access required to stream</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
