import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Pause, Square, Heart, Share2, Loader2, AlertCircle, Crown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { SignedArtwork } from "@/components/ui/SignedArtwork";

interface Track {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
}

interface CompactVaultPlayerProps {
  track: Track | null;
  hasVaultAccess: boolean;
  isLiked?: boolean;
  onAccessDenied?: () => void;
  onPlay?: () => void; // Called BEFORE playback starts (for confirmation modal)
  onLike?: () => void;
  onShare?: () => void;
  /** If true, skip the onPlay callback and play directly */
  skipPlayConfirm?: boolean;
  /** Trigger auto-play when this becomes true */
  autoPlay?: boolean;
  /** Called when autoPlay has been consumed */
  onAutoPlayConsumed?: () => void;
  /** Called when the track finishes playing (song completed) */
  onTrackEnded?: () => void;
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
  autoPlay = false,
  onAutoPlayConsumed,
  onTrackEnded,
}: CompactVaultPlayerProps) => {
  const [hasCalledOnPlay, setHasCalledOnPlay] = useState(false);
  
  const {
    isPlaying,
    currentTime,
    duration,
    isLoading,
    error,
    play,
    pause,
    stop,
    seek,
    loadTrack,
  } = useAudioPlayer();

  const prevIsPlayingRef = useRef(isPlaying);

  // Load track when it changes — fetch signed URL via edge function
  useEffect(() => {
    if (track?.id) {
      void loadTrack({ trackId: track.id, fileType: "audio", trackTitle: track.title });
      setHasCalledOnPlay(false);
    }
  }, [track?.id, loadTrack, track?.title]);

  // Detect song completion: was playing, now stopped, and currentTime is at/near end
  useEffect(() => {
    if (prevIsPlayingRef.current && !isPlaying && duration > 0 && currentTime >= duration - 0.5) {
      // Song finished naturally
      setHasCalledOnPlay(false);
      onTrackEnded?.();
    }
    prevIsPlayingRef.current = isPlaying;
  }, [isPlaying, currentTime, duration, onTrackEnded]);

  // Handle auto-play trigger from parent (after confirmation modal)
  useEffect(() => {
    if (autoPlay && track?.id && hasVaultAccess) {
      play().then(() => {
        setHasCalledOnPlay(true);
        onAutoPlayConsumed?.();
      });
    }
  }, [autoPlay, track?.id, hasVaultAccess, play, onAutoPlayConsumed]);

  const handlePlayPause = async () => {
    if (!track) return;

    if (!hasVaultAccess) {
      onAccessDenied?.();
      return;
    }

    if (!track.id) {
      console.error("[VaultPlayer] No track id");
      return;
    }

    if (isPlaying) {
      pause();
    } else {
      // If not already charged this session, call onPlay to show confirmation modal
      // IMPORTANT: Do NOT play audio here - wait for parent to confirm via autoPlay prop
      if (!skipPlayConfirm && onPlay) {
        onPlay(); // This opens the confirmation modal
        // Don't play yet - playback only starts via autoPlay prop after successful transaction
        return;
      }
      
      // Only reach here if skipPlayConfirm is true (already charged for this track)
      await play();
      setHasCalledOnPlay(true);
    }
  };

  // External method to start playback after confirmation
  const startPlayback = async () => {
    if (!track?.id) return;
    await play();
    setHasCalledOnPlay(true);
  };

  const handleStop = () => {
    stop();
    setHasCalledOnPlay(false);
  };

  const handleSeek = (value: number[]) => {
    if (duration) {
      const newTime = (value[0] / 100) * duration;
      seek(newTime);
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  // Empty state - Compact card
  if (!track) {
    return (
      <div className="mx-5 mb-6">
        <div 
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, hsla(280, 80%, 50%, 0.08), hsla(280, 80%, 30%, 0.05))',
            border: '1px solid hsla(280, 80%, 50%, 0.15)'
          }}
        >
          <div className="px-5 py-6 text-center">
            <div 
              className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center"
              style={{
                background: 'hsla(280, 80%, 50%, 0.12)',
              }}
            >
              <Play className="w-5 h-5 text-primary/50 ml-0.5" />
            </div>
            <p 
              className="text-sm font-medium"
              style={{ color: 'hsl(280, 70%, 65%)' }}
            >
              Select a track to load the Vault Player
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-5 mb-6" style={{ contain: 'layout style paint', isolation: 'isolate', transform: 'translateZ(0)' }}>
      <div className="relative rounded-2xl overflow-hidden">
        {/* Animated glow border when playing */}
        <div 
          className={cn(
            "absolute -inset-[1px] rounded-2xl transition-opacity duration-500",
            isPlaying ? "opacity-100" : "opacity-50"
          )}
          style={{
            background: 'linear-gradient(135deg, hsl(280, 80%, 50%), hsl(300, 70%, 50%), hsl(280, 80%, 50%))',
            filter: isPlaying ? 'blur(4px)' : 'blur(2px)',
            willChange: 'opacity',
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
        />
        
        {/* Content container */}
        <div 
          className="relative rounded-2xl p-4"
          style={{
            background: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsla(280, 30%, 8%, 0.98) 100%)'
          }}
        >
          {/* Top section: Artwork + Info + Controls */}
          <div className="flex items-center gap-4 mb-4">
            {/* Album art with glow */}
            <div className="relative flex-shrink-0">
              <div 
                className="absolute -inset-1 rounded-xl blur-sm opacity-60"
                style={{ background: 'hsl(280, 80%, 50%)' }}
              />
              <SignedArtwork
                trackId={track.id}
                alt={track.title}
                fallbackSrc={track.artworkUrl}
                className="relative w-16 h-16 rounded-xl object-cover"
              />
              
              {/* Playing indicator overlay */}
              {isPlaying && (
                <div className="absolute inset-0 rounded-xl bg-black/30 flex items-center justify-center" style={{ transform: 'translate3d(0,0,0)' }}>
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1 bg-white rounded-full"
                        style={{
                          height: '12px',
                          animation: `pulse 600ms cubic-bezier(0.4, 0, 0.6, 1) infinite ${i * 150}ms`,
                          willChange: 'opacity',
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
                <p className="font-semibold text-foreground truncate">
                  {track.title}
                </p>
                {/* Mini crown badge */}
                <Crown 
                  className="w-3.5 h-3.5 flex-shrink-0"
                  style={{
                    color: 'hsl(45, 90%, 55%)',
                    filter: 'drop-shadow(0 0 3px hsla(45, 90%, 55%, 0.6))'
                  }}
                  fill="hsl(45, 90%, 55%)"
                />
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {track.artist}
              </p>
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
                isPlaying
                  ? "bg-primary/20 border-2 border-primary"
                  : "bg-primary hover:bg-primary/90"
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

          {/* Progress bar */}
          <div className="mb-3">
            <Slider
              value={[progressPercent]}
              onValueChange={handleSeek}
              max={100}
              step={0.1}
              className="cursor-pointer"
              disabled={!hasVaultAccess || isLoading}
            />
            <div className="flex justify-between mt-1.5 text-xs text-muted-foreground font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Bottom controls: Stop, Like, Share */}
          <div className="flex items-center justify-between">
            {/* Stop button */}
            <button
              onClick={handleStop}
              disabled={isLoading}
              className="p-2.5 rounded-full bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors disabled:opacity-50"
              aria-label="Stop"
            >
              <Square className="w-4 h-4" />
            </button>

            {/* Like + Share */}
            <div className="flex items-center gap-2">
              {onLike && (
                <button
                  onClick={onLike}
                  className={cn(
                    "p-2.5 rounded-full transition-all",
                    isLiked
                      ? "bg-pink-500/20 text-pink-400"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
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
          </div>

          {/* Vault access message */}
          {!hasVaultAccess && (
            <div className="mt-3 text-center">
              <p className="text-xs text-amber-400/80">
                Vault access required to stream
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
