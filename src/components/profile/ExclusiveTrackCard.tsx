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
            {/* Exclusive Badge with Crown - Neon Purple */}
            <div 
              className="relative px-2.5 py-0.5 rounded-full flex-shrink-0"
              style={{
                background: 'hsla(280, 80%, 50%, 0.15)',
                boxShadow: '0 0 8px hsla(280, 80%, 50%, 0.25)'
              }}
            >
              {/* Gold Crown on top-left corner edge */}
              <Crown 
                className="absolute -top-[6px] -left-[6px] w-3 h-3 rotate-[-10deg]" 
                style={{ 
                  color: '#fbbf24',
                  filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.9)) drop-shadow(0 0 8px rgba(251, 191, 36, 0.5))' 
                }} 
              />
              <span 
                className="text-[10px] font-display uppercase tracking-wider pl-1"
                style={{ color: 'hsl(280, 80%, 70%)' }}
              >
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
