import { forwardRef } from "react";
import { Heart } from "lucide-react";
import { useTrackLikes } from "@/hooks/useTrackLikes";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

import artist1 from "@/assets/artist-1.jpg";

interface TrackListItemProps {
  track: {
    id: string;
    title: string;
    artworkUrl: string | null;
  };
  fanId: string | null;
  hasVaultAccess: boolean;
  isSelected: boolean;
  isHighlighted?: boolean;
  onSelect: () => void;
}

export const TrackListItem = forwardRef<HTMLDivElement, TrackListItemProps>(({
  track,
  fanId,
  hasVaultAccess,
  isSelected,
  isHighlighted = false,
  onSelect,
}, ref) => {
  const { likeCount, isLiked, toggleLike, isLoading } = useTrackLikes(track.id, fanId);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!hasVaultAccess) {
      toast({
        title: "Vault Access Required",
        description: "Enter the Vault to like and stream exclusive music.",
        variant: "destructive",
      });
      return;
    }
    
    if (fanId) {
      toggleLike();
    }
  };

  const canLike = fanId && hasVaultAccess;

  const showHighlight = isHighlighted || isSelected;

  return (
    <div
      ref={ref}
      onClick={onSelect}
      className={cn(
        "group relative rounded-xl p-3 cursor-pointer transition-all duration-300",
        showHighlight
          ? "bg-primary/10 border-2 border-primary/60 ring-2 ring-primary/30"
          : "bg-card/50 border border-transparent hover:bg-card/80 hover:border-primary/20"
      )}
      style={{
        boxShadow: showHighlight ? "0 0 25px hsl(var(--primary) / 0.3)" : undefined,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Cover art */}
        <div className="relative flex-shrink-0">
          {showHighlight && (
            <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-r from-primary to-purple-500 blur-sm opacity-60" />
          )}
          <img
            src={track.artworkUrl || artist1}
            alt={track.title}
            className="relative w-12 h-12 rounded-lg object-cover"
          />
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn(
              "font-display text-sm font-medium truncate transition-colors",
              showHighlight ? "text-primary" : "text-foreground"
            )}>
              {track.title}
            </p>
            {isHighlighted && !isSelected && (
              <StatusBadge variant="exclusive" size="sm">
                Selected
              </StatusBadge>
            )}
          </div>
          {isSelected && (
            <p className="text-xs text-primary/70 font-display uppercase tracking-wider mt-0.5">
              Now Playing
            </p>
          )}
        </div>

        {/* Like button */}
        <button
          onClick={handleLikeClick}
          disabled={isLoading}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-200",
            isLiked
              ? "bg-pink-500/20 text-pink-400"
              : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
            !canLike && "opacity-50",
            isLoading && "cursor-not-allowed"
          )}
          aria-label={isLiked ? "Unlike" : "Like"}
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-all",
              isLiked && "fill-current scale-110"
            )}
          />
          <span className="text-xs font-medium min-w-[1ch]">{likeCount}</span>
        </button>
      </div>
    </div>
  );
});

TrackListItem.displayName = "TrackListItem";
