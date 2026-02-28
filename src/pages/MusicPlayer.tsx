import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ChevronDown, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX,
  Heart,
  Share2
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { usePlayer, tracksLibrary, type Track } from "@/contexts/PlayerContext";
import { ShareTrackModal } from "@/components/ShareTrackModal";

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const MusicPlayer = () => {
  const navigate = useNavigate();
  const { trackId } = useParams();
  const { 
    currentTrack, 
    isPlaying, 
    currentTime, 
    volume: globalVolume,
    playTrack, 
    togglePlayPause, 
    setCurrentTime,
    setVolume: setGlobalVolume 
  } = usePlayer();
  
  // Local UI state
  const [localVolume, setLocalVolume] = useState([globalVolume]);
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Load track from URL param if no current track or different track
  useEffect(() => {
    if (trackId && tracksLibrary[trackId]) {
      if (!currentTrack || currentTrack.id !== trackId) {
        playTrack(tracksLibrary[trackId]);
      }
    } else if (!currentTrack) {
      // Default to first track if nothing is playing
      playTrack(tracksLibrary["1"]);
    }
  }, [trackId, currentTrack, playTrack]);

  // Use current track or fallback
  const track = currentTrack || tracksLibrary["1"];
  const legacyTrack: Track = {
    id: track.id,
    title: track.title,
    artist: track.artist,
    album: track.album || "",
    artwork: track.artwork || ("artworkUrl" in track ? (track as any).artworkUrl : "") || "",
    duration: track.duration || 0,
  };
  const progress = legacyTrack.duration ? (currentTime / legacyTrack.duration) * 100 : 0;

  // Simulate progress when playing
  useEffect(() => {
    if (!isPlaying || !track) return;
    
    const interval = setInterval(() => {
      setCurrentTime(currentTime + 1);
      if (currentTime >= legacyTrack.duration) {
        togglePlayPause();
        setCurrentTime(0);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, track, setCurrentTime, togglePlayPause]);

  const handleProgressChange = (value: number[]) => {
    if (track) {
      setCurrentTime((value[0] / 100) * legacyTrack.duration);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setLocalVolume(value);
    setGlobalVolume(value[0]);
    if (value[0] > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  if (!track) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background glow effect */}
      <div 
        className="absolute inset-0 opacity-30 blur-3xl"
        style={{
          background: `radial-gradient(circle at 50% 30%, hsl(var(--primary) / 0.4) 0%, transparent 50%)`
        }}
      />

      {/* Header */}
      <header className="relative z-10 w-full px-4 py-4 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close player"
        >
          <ChevronDown className="w-6 h-6" />
        </button>
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Now Playing
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsShareModalOpen(true)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Share track"
          >
            <Share2 className="w-6 h-6" />
          </button>
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={cn(
              "p-2 transition-colors",
              isLiked ? "text-pink-500" : "text-muted-foreground hover:text-foreground"
            )}
            aria-label={isLiked ? "Unlike" : "Like"}
          >
            <Heart className={cn("w-6 h-6", isLiked && "fill-current")} />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Album Artwork */}
        <div className="relative mb-8 animate-fade-in">
          {/* Glow behind artwork */}
          <div 
            className="absolute inset-[-20px] rounded-3xl blur-2xl opacity-50"
            style={{
              background: `linear-gradient(135deg, hsl(var(--primary) / 0.5) 0%, hsl(280 100% 50% / 0.3) 100%)`
            }}
          />
          <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-2xl overflow-hidden shadow-2xl">
            <img
              src={legacyTrack.artwork}
              alt={`${legacyTrack.album} by ${legacyTrack.artist}`}
              className={cn(
                "w-full h-full object-cover transition-transform duration-1000",
                isPlaying && "scale-105"
              )}
            />
            {/* Subtle overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
          </div>
        </div>

        {/* Track Info */}
        <div className="text-center mb-8 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <h1 
            className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 tracking-wide"
            style={{
              textShadow: "0 0 30px rgba(0, 255, 255, 0.3)"
            }}
          >
            {track.title}
          </h1>
          <p className="text-primary font-display text-sm uppercase tracking-wider">
            {track.artist}
          </p>
          <p className="text-muted-foreground text-xs mt-1">
            {legacyTrack.album}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-sm mb-6 animate-fade-in" style={{ animationDelay: "150ms" }}>
          <Slider
            value={[progress]}
            onValueChange={handleProgressChange}
            max={100}
            step={0.1}
            className="cursor-pointer"
          />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground font-mono">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(legacyTrack.duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6 mb-8 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <button
            className="p-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Previous track"
          >
            <SkipBack className="w-7 h-7" />
          </button>
          
          <button
            onClick={togglePlayPause}
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300",
              "bg-primary text-primary-foreground shadow-cyan-md hover:shadow-cyan-lg hover:scale-105 active:scale-95"
            )}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7" />
            ) : (
              <Play className="w-7 h-7 ml-1" />
            )}
          </button>
          
          <button
            className="p-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Next track"
          >
            <SkipForward className="w-7 h-7" />
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-3 w-full max-w-xs animate-fade-in" style={{ animationDelay: "250ms" }}>
          <button
            onClick={toggleMute}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || localVolume[0] === 0 ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
          <Slider
            value={isMuted ? [0] : localVolume}
            onValueChange={handleVolumeChange}
            max={100}
            step={1}
            className="flex-1"
          />
        </div>
      </div>

      {/* Payment Info Footer */}
      <footer className="relative z-10 w-full px-6 py-6 border-t border-border/30 animate-fade-in" style={{ animationDelay: "300ms" }}>
        <div className="max-w-sm mx-auto text-center">
          <p 
            className="font-display text-lg font-semibold text-primary mb-1"
            style={{
              textShadow: "0 0 20px rgba(0, 255, 255, 0.4)"
            }}
          >
            $0.20 per stream
          </p>
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            Artist is paid directly
          </p>
        </div>
      </footer>

      {/* Share Modal */}
      <ShareTrackModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        track={legacyTrack}
      />
    </div>
  );
};

export default MusicPlayer;
