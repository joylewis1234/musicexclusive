import { useState, useEffect } from "react";
import { Play, Pause, Square, Volume2, Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Track {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
  audioUrl: string;
}

interface VaultMusicPlayerProps {
  track: Track | null;
  hasVaultAccess: boolean;
  onAccessDenied?: () => void;
  onPlay?: () => void;
}

export const VaultMusicPlayer = ({
  track,
  hasVaultAccess,
  onAccessDenied,
  onPlay,
}: VaultMusicPlayerProps) => {
  const [hasCalledOnPlay, setHasCalledOnPlay] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isLoading,
    error,
    diagnostics,
    play,
    pause,
    stop,
    seek,
    setVolume,
    loadTrack,
  } = useAudioPlayer();

  // Load track when it changes
  useEffect(() => {
    if (track?.audioUrl) {
      loadTrack(track.audioUrl, track.title);
      setHasCalledOnPlay(false);
    }
  }, [track?.id, track?.audioUrl, loadTrack]);

  const handlePlayPause = async () => {
    if (!track) return;

    if (!hasVaultAccess) {
      onAccessDenied?.();
      return;
    }

    if (!track.audioUrl) {
      console.error("[VaultPlayer] No audio URL for track:", track.title);
      return;
    }

    if (isPlaying) {
      pause();
    } else {
      await play();
      // Trigger stream charge on first play
      if (!hasCalledOnPlay) {
        onPlay?.();
        setHasCalledOnPlay(true);
      }
    }
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

  // Empty state
  if (!track) {
    return (
      <div className="relative rounded-2xl overflow-hidden">
        {/* Outer glow ring */}
        <div 
          className="absolute -inset-[2px] rounded-2xl blur-md opacity-40"
          style={{ 
            background: 'linear-gradient(135deg, hsl(280, 80%, 50%), hsl(300, 80%, 50%), hsl(280, 80%, 50%))' 
          }}
        />
        
        {/* Inner border */}
        <div 
          className="absolute inset-0 rounded-2xl p-[1px]"
          style={{ 
            background: 'linear-gradient(135deg, hsla(280, 80%, 60%, 0.5), hsla(300, 80%, 60%, 0.4), hsla(280, 80%, 60%, 0.5))' 
          }}
        />
        
        <div className="relative bg-card/95 backdrop-blur-sm rounded-2xl p-6 border border-transparent">
          <div className="text-center py-8">
            {/* Vault icon placeholder */}
            <div 
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{
                background: 'hsla(280, 80%, 50%, 0.15)',
                boxShadow: '0 0 20px hsla(280, 80%, 50%, 0.2), inset 0 0 15px hsla(280, 80%, 50%, 0.1)'
              }}
            >
              <Play className="w-7 h-7 text-purple-400/60 ml-0.5" />
            </div>
            <p 
              className="font-display text-sm uppercase tracking-wider"
              style={{ color: 'hsl(280, 70%, 60%)' }}
            >
              Select a track to load the Vault Player
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden group">
      {/* Outer glow */}
      <div 
        className={cn(
          "absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-primary via-purple-500 to-pink-500 blur-md transition-opacity duration-500",
          isPlaying ? "opacity-60 animate-pulse" : "opacity-30"
        )}
      />
      
      {/* Inner border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/50 via-purple-500/40 to-pink-500/50 p-[1px]" />
      
      {/* Content */}
      <div className="relative bg-card/95 backdrop-blur-sm rounded-2xl p-5">
        {/* Track info */}
        <div className="flex items-center gap-4 mb-5">
          {/* Album art with glow */}
          <div className="relative">
            <div className="absolute -inset-1 rounded-lg bg-gradient-to-r from-primary/40 to-purple-500/40 blur-sm" />
            <img
              src={track.artworkUrl}
              alt={track.title}
              className="relative w-16 h-16 rounded-lg object-cover"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm font-semibold text-foreground truncate">
              {track.title}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {track.artist}
            </p>
            {isLoading && (
              <div className="flex items-center gap-1.5 mt-1">
                <Loader2 className="w-3 h-3 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Loading...</span>
              </div>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-destructive font-medium">Playback Error</p>
              <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Progress bar */}
        <div className="mb-4">
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

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {/* Stop button */}
          <button
            onClick={handleStop}
            disabled={isLoading}
            className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center hover:bg-muted/50 transition-colors disabled:opacity-50"
            aria-label="Stop"
          >
            <Square className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Play/Pause button */}
          <button
            onClick={handlePlayPause}
            disabled={isLoading && !isPlaying}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
              isPlaying
                ? "bg-primary/30 border-2 border-primary"
                : "bg-gradient-to-r from-primary to-purple-500 hover:from-primary/80 hover:to-purple-500/80",
              (isLoading && !isPlaying) && "opacity-70"
            )}
            style={{
              boxShadow: isPlaying ? "0 0 25px hsl(var(--primary) / 0.6)" : "0 0 15px hsl(var(--primary) / 0.3)",
            }}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isLoading && !isPlaying ? (
              <Loader2 className="w-6 h-6 animate-spin text-white" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6 text-primary" />
            ) : (
              <Play className="w-6 h-6 ml-0.5 text-white" />
            )}
          </button>

          {/* Volume */}
          <div className="flex items-center gap-2 w-24">
            <Volume2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Slider
              value={[volume]}
              onValueChange={(v) => setVolume(v[0])}
              max={100}
              step={1}
              className="cursor-pointer"
            />
          </div>
        </div>

        {/* Vault access message */}
        {!hasVaultAccess && (
          <div className="mt-4 text-center">
            <p className="text-xs text-amber-400/80">
              Vault access required to stream full tracks
            </p>
          </div>
        )}

        {/* Debug Panel (collapsible) */}
        <Collapsible open={showDebug} onOpenChange={setShowDebug}>
          <CollapsibleTrigger className="w-full mt-4 pt-3 border-t border-border/30 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {showDebug ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span>Playback Debug</span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 p-3 rounded-lg bg-muted/20 border border-border/30 text-xs font-mono space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Track:</span>
                <span className="text-foreground truncate max-w-[180px]">{diagnostics.trackTitle || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bucket:</span>
                <span className="text-foreground">{diagnostics.bucketName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Audio URL:</span>
                <p className="text-foreground break-all mt-0.5 text-[10px]">{diagnostics.audioUrl || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Audio Path:</span>
                <p className="text-foreground break-all mt-0.5 text-[10px]">{diagnostics.audioPath || "—"}</p>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Can Play:</span>
                <span className={diagnostics.canPlay ? "text-green-400" : "text-amber-400"}>
                  {diagnostics.canPlay ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ready State:</span>
                <span className="text-foreground">{diagnostics.readyState}</span>
              </div>
              {diagnostics.lastError && (
                <div>
                  <span className="text-destructive">Last Error:</span>
                  <p className="text-destructive break-all mt-0.5">{diagnostics.lastError}</p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};
