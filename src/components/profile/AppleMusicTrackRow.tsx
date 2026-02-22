import { forwardRef } from "react";
import { Play, Share2, Check, Plus, ListMusic } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ExclusiveBadge } from "@/components/ui/ExclusiveBadge";
import { LikeButton } from "@/components/ui/LikeButton";
import { SignedArtwork } from "@/components/ui/SignedArtwork";

interface AppleMusicTrackRowProps {
  track: {
    id: string;
    title: string;
    artworkUrl: string | null;
    duration: number;
    exclusivityDecision?: string | null;
  };
  index: number;
  fanId: string | null;
  hasVaultAccess: boolean;
  isSelected: boolean;
  isHighlighted?: boolean;
  likeCount: number;
  isLiked: boolean;
  isLikeLoading: boolean;
  onToggleLike: () => void;
  onSelect: () => void;
  onShare: () => void;
  onAddToPlaylist?: () => void;
  isInPlaylist?: boolean;
  fallbackImage: string;
  hidePlayButton?: boolean;
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
  likeCount,
  isLiked,
  isLikeLoading,
  onToggleLike,
  onSelect,
  onShare,
  onAddToPlaylist,
  isInPlaylist = false,
  fallbackImage,
  hidePlayButton = false,
}, ref) => {
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
      onToggleLike();
    }
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShare();
  };

  const handlePlaylistClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasVaultAccess) {
      toast({
        title: "Vault Access Required",
        description: "Enter the Vault to manage your playlist.",
        variant: "destructive",
      });
      return;
    }
    if (fanId && onAddToPlaylist) {
      onAddToPlaylist();
    }
  };

  const canLike = fanId && hasVaultAccess;
  const showHighlight = isHighlighted || isSelected;

  return (
    <div
      ref={ref}
      onClick={hidePlayButton ? undefined : onSelect}
      className={cn(
        "group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
        hidePlayButton
          ? ""
          : "cursor-pointer",
        !hidePlayButton && showHighlight
          ? "bg-primary/10"
          : !hidePlayButton
          ? "hover:bg-muted/30 active:bg-muted/40"
          : ""
      )}
      style={{
        boxShadow: showHighlight ? "inset 0 0 0 1px hsla(280, 80%, 50%, 0.3)" : undefined,
      }}
    >
      {/* Track number or play indicator */}
      <div className="w-6 flex-shrink-0 text-center">
        {hidePlayButton ? (
          <span className="text-sm text-muted-foreground font-mono">
            {index + 1}
          </span>
        ) : showHighlight ? (
          <div className="w-5 h-5 mx-auto rounded-full bg-primary flex items-center justify-center">
            <Play className="w-3 h-3 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        ) : (
          <span className="text-sm text-muted-foreground font-mono group-hover:hidden">
            {index + 1}
          </span>
        )}
        {!hidePlayButton && !showHighlight && (
          <Play className="w-4 h-4 text-foreground hidden group-hover:block mx-auto" />
        )}
      </div>

      {/* Cover art */}
      <div className="relative flex-shrink-0">
        <SignedArtwork
          trackId={track.id}
          alt={track.title}
          fallbackSrc={fallbackImage}
          className="w-12 h-12 rounded-lg object-cover"
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
          
          <ExclusiveBadge isNonExclusive={track.exclusivityDecision === "keep"} />
        </div>
        
        {/* Duration */}
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDuration(track.duration)}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <LikeButton
          isLiked={isLiked}
          isLoading={isLikeLoading}
          canLike={canLike}
          onClick={handleLikeClick}
        />

        {/* Add to playlist button */}
        {onAddToPlaylist && (
          <button
            onClick={handlePlaylistClick}
            className={cn(
              "p-2 rounded-full transition-colors",
              isInPlaylist
                ? "text-primary bg-primary/15"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label={isInPlaylist ? "In playlist" : "Add to playlist"}
          >
            {isInPlaylist ? (
              <ListMusic className="w-5 h-5" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Share button */}
        <button
          onClick={handleShareClick}
          className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Share"
        >
          <Share2 className="w-5 h-5" />
        </button>

        {/* Select/Selected indicator (hidden in artist preview) */}
        {!hidePlayButton && (
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
        )}
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
