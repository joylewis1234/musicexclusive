import { RefreshCw, Flame } from "lucide-react";
import { DiscoveryArtist } from "@/data/discoveryArtists";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface HotNewArtistsProps {
  artists: DiscoveryArtist[];
  onRefresh: () => void;
  onArtistClick: (artistId: string) => void;
  isRefreshing: boolean;
}

export const HotNewArtists = ({
  artists,
  onRefresh,
  onArtistClick,
  isRefreshing,
}: HotNewArtistsProps) => {
  if (artists.length === 0) return null;

  return (
    <section className="mb-8 animate-fade-in">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-accent" />
          <h2 className="font-display text-lg uppercase tracking-wider text-foreground font-semibold">
            Hot New Artists
          </h2>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 text-muted-foreground hover:text-primary transition-all duration-300 hover:rotate-180"
          aria-label="Refresh featured artists"
        >
          <RefreshCw 
            className={`w-4 h-4 transition-transform duration-500 ${isRefreshing ? "animate-spin" : ""}`} 
          />
        </button>
      </div>

      {/* Horizontal Scroll */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        <div 
          className={`flex gap-4 transition-opacity duration-300 ${isRefreshing ? "opacity-50" : "opacity-100"}`}
        >
          {artists.map((artist) => (
            <button
              key={artist.id}
              onClick={() => onArtistClick(artist.id)}
              className="flex-shrink-0 w-[160px] group"
            >
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-2 transition-transform duration-300 group-hover:scale-[1.02]">
                {/* Image */}
                <img
                  src={artist.imageUrl}
                  alt={artist.name}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                
                {/* HOT NEW Badge */}
                <div className="absolute top-2 left-2">
                  <StatusBadge variant="superfan" size="sm">
                    🔥 HOT NEW
                  </StatusBadge>
                </div>

                {/* Exclusive Label */}
                <div className="absolute top-2 right-2">
                  <span className="text-[10px] uppercase tracking-wider text-primary font-display font-semibold px-1.5 py-0.5 bg-background/60 backdrop-blur-sm rounded">
                    Exclusive
                  </span>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <h3 className="font-display text-sm font-bold text-foreground tracking-wide truncate">
                    {artist.name}
                  </h3>
                  <p className="text-primary text-[10px] font-display uppercase tracking-wider">
                    {artist.genre}
                  </p>
                </div>

                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl ring-1 ring-primary/40 shadow-[0_0_20px_hsl(var(--primary)/0.25)]" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
