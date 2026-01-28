import { Crown, Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";
import { cn } from "@/lib/utils";

interface ExclusiveTrackCardProps {
  id: string;
  title: string;
  artworkUrl: string | null;
  duration: number;
  likeCount: number;
  isLiked: boolean;
  isSelected: boolean;
  canLike: boolean;
  onSelect: () => void;
  onLike: () => void;
  onShare: () => void;
  fallbackImage: string;
}

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const ExclusiveTrackCard = ({
  id,
  title,
  artworkUrl,
  duration,
  likeCount,
  isLiked,
  isSelected,
  canLike,
  onSelect,
  onLike,
  onShare,
  fallbackImage,
}: ExclusiveTrackCardProps) => {
  return (
    <GlowCard 
      className={cn(
        "p-4 transition-all duration-200",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <div className="flex items-center gap-4">
        {/* Cover Art */}
        <div className="relative flex-shrink-0">
          <img
            src={artworkUrl || fallbackImage}
            alt={title}
            className="w-14 h-14 rounded-lg object-cover"
          />
        </div>

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-display text-sm font-semibold text-foreground truncate">
              {title}
            </h4>
            {/* Exclusive Badge with Crown */}
            <div className="relative px-2 py-0.5 rounded-full bg-primary/10 flex-shrink-0">
              <div className="absolute -top-2 -left-0.5">
                <div className="absolute inset-0 w-4 h-4 bg-amber-400/40 rounded-full blur-sm -translate-x-0.5 translate-y-0.5" />
                <Crown 
                  className="relative w-3 h-3 text-amber-400 rotate-[-20deg]" 
                  style={{ 
                    filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.8)) drop-shadow(0 0 8px rgba(251, 191, 36, 0.5))' 
                  }} 
                />
              </div>
              <span className="text-primary text-[10px] font-display uppercase tracking-wider">
                Exclusive
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatDuration(duration)}</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-purple-400">
              <Heart className={cn("w-3.5 h-3.5", isLiked && "fill-purple-400")} />
              <span className="font-medium">{likeCount}</span>
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Like Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLike();
            }}
            disabled={!canLike}
            className={cn(
              "w-9 h-9 rounded-full flex items-center justify-center transition-all",
              isLiked 
                ? "bg-purple-500/20 text-purple-400" 
                : "bg-muted/30 text-muted-foreground hover:bg-muted/50",
              !canLike && "opacity-50 cursor-not-allowed"
            )}
            aria-label={isLiked ? "Unlike" : "Like"}
          >
            <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
          </button>

          {/* Share Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
            className="w-9 h-9 rounded-full bg-muted/30 flex items-center justify-center hover:bg-muted/50 transition-colors"
            aria-label="Share"
          >
            <Share2 className="w-4 h-4 text-muted-foreground" />
          </button>

          {/* Select Button */}
          <Button
            size="sm"
            variant={isSelected ? "default" : "secondary"}
            className="rounded-xl h-9 px-4"
            onClick={onSelect}
          >
            {isSelected ? "Selected" : "Select"}
          </Button>
        </div>
      </div>
    </GlowCard>
  );
};
