import { useState, useRef, useEffect } from "react";
import { Play, Pause, Square, Volume2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

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
}

export const VaultMusicPlayer = ({
  track,
  hasVaultAccess,
  onAccessDenied,
}: VaultMusicPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(75);

  // Reset player when track changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [track?.id]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const handlePlayPause = () => {
    if (!track) return;

    if (!hasVaultAccess) {
      onAccessDenied?.();
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current && duration) {
      const newTime = (value[0] / 100) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  if (!track) {
    return (
      <div className="relative rounded-2xl overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-primary/30 via-purple-500/20 to-pink-500/30 blur-sm" />
        
        <div className="relative bg-card/90 backdrop-blur-sm rounded-2xl p-6 border border-primary/20">
          <div className="text-center text-muted-foreground py-8">
            <p className="font-display text-sm uppercase tracking-wider">
              Select a track to play
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
        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          src={track.audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />

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
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <Slider
            value={[progressPercent]}
            onValueChange={handleSeek}
            max={100}
            step={0.1}
            className="cursor-pointer"
            disabled={!hasVaultAccess}
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
            className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center hover:bg-muted/50 transition-colors"
            aria-label="Stop"
          >
            <Square className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Play/Pause button */}
          <button
            onClick={handlePlayPause}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
              isPlaying
                ? "bg-primary/30 border-2 border-primary"
                : "bg-gradient-to-r from-primary to-purple-500 hover:from-primary/80 hover:to-purple-500/80"
            )}
            style={{
              boxShadow: isPlaying ? "0 0 25px hsl(var(--primary) / 0.6)" : "0 0 15px hsl(var(--primary) / 0.3)",
            }}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
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
      </div>
    </div>
  );
};
