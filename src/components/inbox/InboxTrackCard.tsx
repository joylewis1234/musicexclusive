import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Music } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface InboxTrackCardProps {
  id: string;
  senderName: string;
  trackTitle: string;
  trackArtist: string;
  note: string | null;
  createdAt: string;
  listenedAt: string | null;
  index: number;
  onListen: () => void;
}

export const InboxTrackCard = ({
  senderName,
  trackTitle,
  trackArtist,
  note,
  createdAt,
  listenedAt,
  index,
  onListen,
}: InboxTrackCardProps) => {
  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: false }) + " ago";
    } catch {
      return "";
    }
  };

  return (
    <GlowCard
      glowColor="accent"
      hover
      className="animate-fade-in"
      style={{ animationDelay: `${(index + 1) * 50}ms` }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Track Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-primary font-display uppercase tracking-wider">
                From {senderName}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {formatTimeAgo(createdAt)}
              </span>
              {!listenedAt && (
                <span className="ml-auto px-1.5 py-0.5 rounded-full bg-accent/20 border border-accent/40 text-[9px] text-accent font-display uppercase tracking-wider">
                  New
                </span>
              )}
            </div>

            <h3 className="font-display text-sm font-semibold text-foreground truncate mb-0.5">
              {trackTitle}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {trackArtist}
            </p>

            {note && (
              <p className="text-xs text-muted-foreground/70 italic mt-2 line-clamp-2">
                "{note}"
              </p>
            )}
          </div>

          {/* Listen Button */}
          <Button
            variant="accent"
            size="sm"
            className="flex-shrink-0 gap-1.5"
            onClick={onListen}
          >
            <Music className="w-3.5 h-3.5" />
            Listen
          </Button>
        </div>
      </div>
    </GlowCard>
  );
};
