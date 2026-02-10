import { useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { User, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface InboxArtistCardProps {
  id: string;
  senderName: string;
  artistProfileId: string;
  artistName: string;
  artistAvatarUrl: string | null;
  artistGenre: string | null;
  note: string | null;
  createdAt: string;
  viewedAt: string | null;
  index: number;
  onView: () => void;
}

export const InboxArtistCard = ({
  senderName,
  artistProfileId,
  artistName,
  artistAvatarUrl,
  artistGenre,
  note,
  createdAt,
  viewedAt,
  index,
  onView,
}: InboxArtistCardProps) => {
  const navigate = useNavigate();

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: false }) + " ago";
    } catch {
      return "";
    }
  };

  const handleVisitProfile = () => {
    onView();
    navigate(`/artist/${artistProfileId}`);
  };

  return (
    <GlowCard
      glowColor="accent"
      hover
      className="animate-fade-in"
      style={{ animationDelay: `${(index + 1) * 50}ms` }}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-primary font-display uppercase tracking-wider">
            From {senderName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formatTimeAgo(createdAt)}
          </span>
          {!viewedAt && (
            <span className="ml-auto px-1.5 py-0.5 rounded-full bg-accent/20 border border-accent/40 text-[9px] text-accent font-display uppercase tracking-wider">
              New
            </span>
          )}
        </div>

        {/* Artist mini-profile card */}
        <div
          className="flex items-center gap-3 p-3 rounded-xl bg-muted/15 border border-border/40 cursor-pointer hover:border-primary/30 transition-all"
          onClick={handleVisitProfile}
        >
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border-2 border-primary/30"
            style={{
              boxShadow: "0 0 12px hsl(var(--primary) / 0.2)",
            }}
          >
            {artistAvatarUrl ? (
              <img
                src={artistAvatarUrl}
                alt={artistName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                <User className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Artist info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-sm font-bold text-foreground tracking-wide truncate">
              {artistName}
            </h3>
            {artistGenre && (
              <p className="text-xs text-primary font-display uppercase tracking-wider truncate">
                {artistGenre}
              </p>
            )}
          </div>

          {/* Visit CTA */}
          <Button
            variant="outline"
            size="sm"
            className="flex-shrink-0 gap-1.5 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50"
            onClick={(e) => {
              e.stopPropagation();
              handleVisitProfile();
            }}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Artist
          </Button>
        </div>

        {/* Note */}
        {note && (
          <p className="text-xs text-muted-foreground/70 italic mt-3 line-clamp-2 px-1">
            "{note}"
          </p>
        )}
      </div>
    </GlowCard>
  );
};
