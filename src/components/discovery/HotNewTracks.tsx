import { RefreshCw, Flame, Play } from "lucide-react";
import { DbTrack, getArtistName } from "@/hooks/useTracks";
import { SignedArtwork } from "@/components/ui/SignedArtwork";

import artist1 from "@/assets/artist-1.jpg";

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
          <h2 className="font-display text-base uppercase tracking-wider text-foreground font-semibold">
            🔥 Hot New Drops
          </h2>
        </div>
        <button
          onClick={onRefresh}
          className="p-1.5 text-muted-foreground hover:text-primary transition-all duration-300 hover:rotate-180"
          aria-label="Refresh featured tracks"
        >
          <RefreshCw
            className={`w-4 h-4 transition-transform duration-500 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      {/* Horizontal Scroll - larger cards */}
      <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        <div
          className={`flex gap-3 transition-opacity duration-300 ${isRefreshing ? "opacity-50" : "opacity-100"}`}
        >
          {tracks.map((track) => {
            const artistName = getArtistName(track);

            return (
              <button
                key={track.id}
                onClick={() => onTrackClick(track)}
                className="flex-shrink-0 w-[160px] group text-left"
              >
                <div
                  className="relative aspect-square rounded-lg overflow-hidden mb-2 transition-all duration-300"
                  style={{
                    boxShadow: "0 0 6px hsl(var(--primary) / 0.08)",
                  }}
                >
                  <SignedArtwork
                    trackId={track.id}
                    alt={track.title}
                    fallbackSrc={track.artist_avatar_url || artist1}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Hover play overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Play className="w-5 h-5 text-white ml-0.5" />
                    </div>
                  </div>

                  {/* Neon glow border on hover */}
                  <div
                    className="absolute inset-0 rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{
                      boxShadow:
                        "inset 0 0 0 1px hsl(var(--primary) / 0.3), 0 0 14px hsl(var(--primary) / 0.15)",
                    }}
                  />
                </div>

                {/* Track Info */}
                <h3 className="font-display text-xs font-bold text-foreground tracking-wide truncate">
                  {track.title}
                </h3>
                <p className="text-[10px] text-muted-foreground font-display tracking-wider truncate">
                  {artistName}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
