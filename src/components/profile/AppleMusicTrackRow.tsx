import { forwardRef } from "react";
import { Play, Heart, Share2, Crown, Check } from "lucide-react";
import { useTrackLikes } from "@/hooks/useTrackLikes";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface AppleMusicTrackRowProps {
  track: {
    id: string;
    title: string;
    artworkUrl: string | null;
    duration: number;
  };
  index: number;
  fanId: string | null;
  hasVaultAccess: boolean;
  isSelected: boolean;
  isHighlighted?: boolean;
  onSelect: () => void;
  onShare: () => void;
  fallbackImage: string;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const AppleMusicTrackRow = forwardRef<HTMLDivElement, AppleMusicTrackRowProps>(({
  track,
  index,
  fanId,
  hasVaultAccess,
  isSelected,
  isHighlighted = false,
  onSelect,
  onShare,
  fallbackImage,
}, ref) => {
  const { likeCount, isLiked, toggleLike, isLoading } = useTrackLikes(track.id, fanId);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!hasVaultAccess) {
      toast({
        title: "Vault Access Required",
        description: "Enter the Vault to like exclusive music.",
        variant: "destructive",
      });
      return;
    }
    
    if (fanId) {
      toggleLike();
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare();
  };

  const canLike = fanId && hasVaultAccess;
  const showHighlight = isHighlighted || isSelected;

  return (
    <div
      ref={ref}
      onClick={onSelect}
      className={cn(
        "group relative flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200",
        showHighlight
          ? "bg-primary/10"
          : "hover:bg-muted/30 active:bg-muted/40"
      )}
      style={{
        boxShadow: showHighlight ? "inset 0 0 0 1px hsla(280, 80%, 50%, 0.3)" : undefined,
      }}
    >
      {/* Track number or play indicator */}
      <div className="w-6 flex-shrink-0 text-center">
        {showHighlight ? (
          <div className="w-5 h-5 mx-auto rounded-full bg-primary flex items-center justify-center">
            <Play className="w-3 h-3 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        ) : (
          <span className="text-sm text-muted-foreground font-mono group-hover:hidden">
            {index + 1}
          </span>
        )}
        {!showHighlight && (
          <Play className="w-4 h-4 text-foreground hidden group-hover:block mx-auto" />
        )}
      </div>

      {/* Cover art */}
      <div className="relative flex-shrink-0">
        <img
          src={track.artworkUrl || fallbackImage}
          alt={track.title}
          className="w-12 h-12 rounded-lg object-cover"
          loading="lazy"
        />
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn(
            "font-medium text-sm truncate transition-colors",
            showHighlight ? "text-primary" : "text-foreground"
          )}>
            {track.title}
          </p>
          
          {/* Exclusive badge - Neon Purple + Gold Crown */}
          <div 
            className="relative px-2 py-0.5 rounded-full flex-shrink-0"
            style={{
              background: 'hsla(280, 80%, 50%, 0.15)',
            }}
          >
            <Crown 
              className="absolute -top-1 -left-0.5 w-2.5 h-2.5 rotate-[-12deg]"
              style={{
                color: 'hsl(45, 90%, 55%)',
                filter: 'drop-shadow(0 0 2px hsla(45, 90%, 55%, 0.8))'
              }}
              fill="hsl(45, 90%, 55%)"
            />
            <span 
              className="text-[9px] font-display uppercase tracking-wider pl-1"
              style={{ color: 'hsl(280, 80%, 70%)' }}
            >
              Exclusive
            </span>
          </div>
        </div>
        
        {/* Duration */}
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDuration(track.duration)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {/* Like button */}
        <button
          onClick={handleLikeClick}
          disabled={isLoading}
          className={cn(
            "p-2 rounded-full transition-all",
            isLiked
              ? "text-pink-400"
              : "text-muted-foreground hover:text-foreground",
            !canLike && "opacity-40"
          )}
          aria-label={isLiked ? "Unlike" : "Like"}
        >
          <Heart 
            className={cn(
              "w-5 h-5 transition-transform",
              isLiked && "fill-current scale-110"
            )} 
          />
        </button>

        {/* Share button */}
        <button
          onClick={handleShareClick}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Share"
        >
          <Share2 className="w-5 h-5" />
        </button>

        {/* Select/Selected indicator */}
        <div 
          className={cn(
            "ml-1 w-7 h-7 rounded-full flex items-center justify-center transition-all",
            isSelected 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted/50 text-muted-foreground group-hover:bg-muted"
          )}
        >
          {isSelected ? (
            <Check className="w-4 h-4" />
          ) : (
            <Play className="w-3.5 h-3.5 ml-0.5" />
          )}
        </div>
      </div>

      {/* Selected glow effect */}
      {showHighlight && (
        <div 
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: '0 0 20px hsla(280, 80%, 50%, 0.15)'
          }}
        />
      )}
    </div>
  );
});

AppleMusicTrackRow.displayName = "AppleMusicTrackRow";
