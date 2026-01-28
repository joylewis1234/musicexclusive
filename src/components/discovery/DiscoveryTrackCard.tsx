import { Play, Pause, Share2, Headphones, Loader2, AlertCircle, User, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DbTrack, getArtistName } from "@/hooks/useTracks";
import { useLikeCount } from "@/hooks/useLikeCount";

import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";

// Artist image mapping
const artistImages: Record<string, string> = {
  nova: artist1,
  aura: artist2,
  echo: artist3,
  pulse: artist1,
  drift: artist2,
  vega: artist3,
  zenith: artist1,
  luna: artist2,
};

interface DiscoveryTrackCardProps {
  track: DbTrack;
  isPreviewPlaying: boolean;
  isPreviewLoading: boolean;
  previewProgress: number;
  previewError: string | null;
  onPreview: () => void;
  onStream: () => void;
  onShare: () => void;
  onArtistClick: () => void;
}

export const DiscoveryTrackCard = ({
  track,
  isPreviewPlaying,
  isPreviewLoading,
  previewProgress,
  previewError,
  onPreview,
  onStream,
  onShare,
  onArtistClick,
}: DiscoveryTrackCardProps) => {
  const artistName = getArtistName(track.artist_id);
  const coverImage = track.artwork_url || artistImages[track.artist_id] || artist1;
  const hasPreview = !!track.preview_audio_url;
  const showError = previewError && !isPreviewPlaying && !isPreviewLoading;
  const isPreviewDisabled = !hasPreview && !isPreviewPlaying;
  const likeCount = useLikeCount(track.id);

  return (
    <div 
      className="relative rounded-2xl overflow-hidden bg-card/50 border border-border/50 group transition-all duration-300 hover:border-primary/30"
      style={{
        boxShadow: isPreviewPlaying 
          ? "0 0 30px hsl(var(--primary) / 0.3), inset 0 0 20px hsl(var(--primary) / 0.05)" 
          : undefined,
      }}
    >
      {/* Preview Progress Bar */}
      {(isPreviewPlaying || isPreviewLoading) && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-muted/30 z-20">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-100"
            style={{ width: `${previewProgress}%` }}
          />
        </div>
      )}

      {/* Cover Art Section */}
      <div className="relative aspect-square overflow-hidden">
        <img
          src={coverImage}
          alt={track.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
        
        {/* Genre Badge */}
        {track.genre && (
          <div className="absolute top-3 left-3">
            <StatusBadge variant="exclusive" size="sm">
              {track.genre}
            </StatusBadge>
          </div>
        )}

        {/* Top Right Actions: Like Count + Share */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {/* Like Count (Social Proof) */}
          <div className="flex items-center gap-1 px-2 py-1 bg-background/60 backdrop-blur-sm rounded-full">
            <Heart className="w-3.5 h-3.5 text-pink-400 fill-pink-400/50" />
            <span className="text-xs font-medium text-foreground/90">{likeCount}</span>
          </div>
          
          {/* Share Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="p-2 bg-background/60 backdrop-blur-sm rounded-full text-muted-foreground hover:text-primary hover:bg-background/80 transition-all duration-200"
            aria-label="Share track"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>

        {/* Playing/Loading Indicator */}
        {(isPreviewPlaying || isPreviewLoading) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div 
              className={`w-16 h-16 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center ${isPreviewPlaying ? "animate-pulse" : ""}`}
              style={{
                boxShadow: "0 0 40px hsl(var(--primary) / 0.5)",
              }}
            >
              {isPreviewLoading ? (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              ) : (
                <Headphones className="w-8 h-8 text-primary" />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Track Title */}
        <h3 className="font-display text-lg font-bold text-foreground tracking-wide mb-1 line-clamp-1">
          {track.title}
        </h3>
        
        {/* Artist Name (Clickable) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onArtistClick();
          }}
          className="flex items-center gap-1.5 text-primary text-sm font-display uppercase tracking-wider mb-3 hover:underline transition-all"
        >
          <User className="w-3 h-3" />
          {artistName}
        </button>

        {/* Error / No Preview Message */}
        {(showError || isPreviewDisabled) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 p-2 rounded-lg bg-muted/20 border border-border/50">
            <AlertCircle className="w-4 h-4 text-accent flex-shrink-0" />
            <span>
              {previewError || "Hook preview not available. Tap STREAM to listen."}
            </span>
          </div>
        )}

        {/* Hook Preview Badge */}
        {hasPreview && !showError && (
          <div className="mb-3 flex items-center gap-2">
            <span 
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-display uppercase tracking-wider text-primary border border-primary/40 bg-primary/10"
              style={{
                boxShadow: "0 0 8px hsl(var(--primary) / 0.2)",
              }}
            >
              Hook Preview • 15s
            </span>
          </div>
        )}

        {/* Playing Label */}
        {isPreviewPlaying && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs text-primary font-display uppercase tracking-wider animate-pulse">
              ▶ Playing Hook Preview
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            disabled={isPreviewLoading || isPreviewDisabled}
            className={`flex-1 gap-1.5 text-xs uppercase tracking-wider border-border/50 hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 ${
              isPreviewDisabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            style={{
              boxShadow: isPreviewPlaying ? "0 0 15px hsl(var(--primary) / 0.3)" : undefined,
            }}
          >
            {isPreviewLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading
              </>
            ) : isPreviewPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Preview 15s
              </>
            )}
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={onStream}
            className={`flex-1 gap-1.5 text-xs uppercase tracking-wider ${
              isPreviewDisabled || showError ? "ring-2 ring-accent/50 animate-pulse" : ""
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            Stream
          </Button>
        </div>
      </div>

      {/* Hover glow border */}
      <div 
        className="absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary) / 0.1), hsl(var(--accent) / 0.1))",
          boxShadow: "inset 0 0 0 1px hsl(var(--primary) / 0.2)",
        }}
      />
    </div>
  );
};
