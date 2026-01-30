import { RefreshCw, Flame, Play } from "lucide-react";
import { DbTrack, getArtistName } from "@/hooks/useTracks";
import { StatusBadge } from "@/components/ui/StatusBadge";

import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";

const artistImages: Record<string, string> = {
  nova: artist1,
  aura: artist2,
  echo: artist3,
  pulse: artist1,
  drift: artist2,
  vega: artist3,
  zenith: artist1,
  luna: artist2,
};

interface HotNewTracksProps {
  tracks: DbTrack[];
  onRefresh: () => void;
  onTrackClick: (track: DbTrack) => void;
  onStreamClick: (track: DbTrack) => void;
  isRefreshing: boolean;
}

export const HotNewTracks = ({
  tracks,
  onRefresh,
  onTrackClick,
  onStreamClick,
  isRefreshing,
}: HotNewTracksProps) => {
  if (tracks.length === 0) return null;

  return (
    <section className="mb-8 animate-fade-in">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-accent" />
          <h2 className="font-display text-lg uppercase tracking-wider text-foreground font-semibold">
            Hot New Drops
          </h2>
        </div>
        <button
          onClick={onRefresh}
          className="p-2 text-muted-foreground hover:text-primary transition-all duration-300 hover:rotate-180"
          aria-label="Refresh featured tracks"
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
          {tracks.map((track) => {
            const coverImage = track.artwork_url || artistImages[track.artist_id] || artist1;
            const artistName = getArtistName(track.artist_id);

            return (
              <button
                key={track.id}
                onClick={() => onTrackClick(track)}
                className="flex-shrink-0 w-[140px] group text-left"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden mb-2 transition-transform duration-300 group-hover:scale-[1.02]">
                  {/* Image */}
                  <img
                    src={coverImage}
                    alt={track.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  
                  {/* HOT Badge */}
                  <div className="absolute top-2 left-2">
                    <StatusBadge variant="superfan" size="sm">
                      🔥 HOT
                    </StatusBadge>
                  </div>

                  {/* Hook Preview indicator */}
                  {track.preview_audio_url && (
                    <div className="absolute bottom-2 left-2 right-2">
                      <span 
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-display uppercase tracking-wider text-primary bg-background/80 backdrop-blur-sm"
                      >
                        Hook • 15s
                      </span>
                    </div>
                  )}

                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl ring-1 ring-primary/40 shadow-[0_0_20px_hsl(var(--primary)/0.25)]" />
                </div>

                {/* Track Info */}
                <h3 className="font-display text-sm font-bold text-foreground tracking-wide truncate">
                  {track.title}
                </h3>
                <p className="text-primary text-[10px] font-display uppercase tracking-wider truncate mb-1.5">
                  {artistName}
                </p>
                
                {/* Stream Now CTA */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStreamClick(track);
                  }}
                   className="w-full flex items-center justify-center gap-1 py-1 rounded border transition-all hover:brightness-110"
                  style={{
                    background: "hsla(280, 80%, 70%, 0.12)",
                    borderColor: "hsla(280, 80%, 70%, 0.35)",
                    boxShadow: "0 0 10px hsla(280, 80%, 70%, 0.2)",
                  }}
                >
                  <Play className="w-2.5 h-2.5" style={{ color: "hsl(280, 80%, 70%)", fill: "hsla(280, 80%, 70%, 0.5)" }} />
                  <span className="text-[8px] font-display uppercase tracking-wider font-semibold" style={{ color: "hsl(280, 80%, 70%)" }}>
                    Stream (1 credit)
                  </span>
                </button>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
