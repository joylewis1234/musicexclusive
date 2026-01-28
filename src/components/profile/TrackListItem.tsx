import { Heart } from "lucide-react";
import { useTrackLikes } from "@/hooks/useTrackLikes";
import { cn } from "@/lib/utils";

import artist1 from "@/assets/artist-1.jpg";

interface TrackListItemProps {
  track: {
    id: string;
    title: string;
    artworkUrl: string | null;
  };
  fanId: string | null;
  isSelected: boolean;
  onSelect: () => void;
}

export const TrackListItem = ({
  track,
  fanId,
  isSelected,
  onSelect,
}: TrackListItemProps) => {
  const { likeCount, isLiked, toggleLike, isLoading } = useTrackLikes(track.id, fanId);

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (fanId) {
      toggleLike();
    }
  };

  return (
    <div
      onClick={onSelect}
      className={cn(
        "group relative rounded-xl p-3 cursor-pointer transition-all duration-300",
        isSelected
          ? "bg-primary/10 border border-primary/40"
          : "bg-card/50 border border-transparent hover:bg-card/80 hover:border-primary/20"
      )}
      style={{
        boxShadow: isSelected ? "0 0 20px hsl(var(--primary) / 0.2)" : undefined,
      }}
    >
      <div className="flex items-center gap-3">
        {/* Cover art */}
        <div className="relative flex-shrink-0">
          {isSelected && (
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
          <p className={cn(
            "font-display text-sm font-medium truncate transition-colors",
            isSelected ? "text-primary" : "text-foreground"
          )}>
            {track.title}
          </p>
          {isSelected && (
            <p className="text-xs text-primary/70 font-display uppercase tracking-wider mt-0.5">
              Now Selected
            </p>
          )}
        </div>

        {/* Like button */}
        <button
          onClick={handleLikeClick}
          disabled={!fanId || isLoading}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-200",
            isLiked
              ? "bg-pink-500/20 text-pink-400"
              : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
            (!fanId || isLoading) && "opacity-50 cursor-not-allowed"
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
};
