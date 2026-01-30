import { Play, Pause, Share2, Headphones, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DiscoveryArtist } from "@/data/discoveryArtists";

interface DiscoveryArtistCardProps {
  artist: DiscoveryArtist;
  isPreviewPlaying: boolean;
  isPreviewLoading: boolean;
  previewProgress: number;
  previewError: string | null;
  hasPreviewAvailable: boolean;
  onPreview: () => void;
  onStream: () => void;
  onShare: () => void;
}

export const DiscoveryArtistCard = ({
  artist,
  isPreviewPlaying,
  isPreviewLoading,
  previewProgress,
  previewError,
  hasPreviewAvailable,
  onPreview,
  onStream,
  onShare,
}: DiscoveryArtistCardProps) => {
  const badgeVariant = artist.badge === "Exclusive" 
    ? "exclusive" 
    : artist.badge === "Trending" 
    ? "superfan" 
    : "vault";

  const showError = previewError && !isPreviewPlaying && !isPreviewLoading;
  const isPreviewDisabled = !hasPreviewAvailable && !isPreviewPlaying;

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

      {/* Image Section */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={artist.imageUrl}
          alt={artist.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
        
        {/* Badge */}
        {artist.badge && (
          <div className="absolute top-3 left-3">
            <StatusBadge variant={badgeVariant} size="sm">
              {artist.badge}
            </StatusBadge>
          </div>
        )}

        {/* Share Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
          className="absolute top-3 right-3 p-2 bg-background/60 backdrop-blur-sm rounded-full text-muted-foreground hover:text-primary hover:bg-background/80 transition-all duration-200"
          aria-label="Share artist"
        >
          <Share2 className="w-4 h-4" />
        </button>

        {/* Playing/Loading Indicator */}
        {(isPreviewPlaying || isPreviewLoading) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div 
              className={`w-16 h-16 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center ${isPreviewPlaying ? "animate-pulse-slow" : ""}`}
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
        <h3 className="font-display text-lg font-bold text-foreground tracking-wide mb-1">
          {artist.name}
        </h3>
        <p className="text-primary text-xs font-display uppercase tracking-wider mb-3">
          {artist.genre}
        </p>

        {/* Error Message / No Preview Message */}
        {(showError || isPreviewDisabled) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 p-2 rounded-lg bg-muted/20 border border-border/50">
            <AlertCircle className="w-4 h-4 text-accent flex-shrink-0" />
            <span>
              {previewError || "Hook preview not available. Tap STREAM to listen inside."}
            </span>
          </div>
        )}

        {/* Hook Preview Badge */}
        {hasPreviewAvailable && !showError && (
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
            <span className="text-xs text-primary font-display uppercase tracking-wider animate-pulse-slow">
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
              isPreviewDisabled || showError ? "ring-2 ring-accent/50 animate-pulse-slow" : ""
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
