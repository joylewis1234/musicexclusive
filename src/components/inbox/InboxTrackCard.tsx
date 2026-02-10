import { useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Music } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface InboxTrackCardProps {
  id: string;
  senderName: string;
  trackTitle: string;
  trackArtist: string;
  trackId: string;
  artistId: string;
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
  trackId,
  artistId,
  note,
  createdAt,
  listenedAt,
  index,
  onListen,
}: InboxTrackCardProps) => {
  const navigate = useNavigate();

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: false }) + " ago";
    } catch {
      return "";
    }
  };

  const handleListenOnProfile = () => {
    onListen();
    navigate(`/artist/${artistId}?track=${trackId}`);
  };

  return (
    <GlowCard
      glowColor="accent"
      hover
      className="animate-fade-in"
      style={{ animationDelay: `${(index + 1) * 50}ms` }}
    >
      <div className="p-4">
        {/* Top row: From + timeAgo */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-primary font-display uppercase tracking-wider">
            From {senderName || "A fan"}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {formatTimeAgo(createdAt)}
            </span>
            {!listenedAt && (
              <span className="px-1.5 py-0.5 rounded-full bg-accent/20 border border-accent/40 text-[9px] text-accent font-display uppercase tracking-wider">
                New
              </span>
            )}
          </div>
        </div>

        {/* Track info */}
        <h3 className="font-display text-sm font-semibold text-foreground truncate mb-0.5">
          {trackTitle}
        </h3>
        <p className="text-xs text-muted-foreground truncate">
          {trackArtist}
        </p>

        {/* Message bubble */}
        {note && (
          <p className="text-xs text-muted-foreground/70 italic mt-3 line-clamp-2 px-1">
            "{note}"
          </p>
        )}

        {/* CTA */}
        <Button
          variant="accent"
          size="sm"
          className="w-full mt-3 gap-1.5"
          onClick={handleListenOnProfile}
        >
          <Music className="w-3.5 h-3.5" />
          Listen on Artist Profile
        </Button>
      </div>
    </GlowCard>
  );
};
