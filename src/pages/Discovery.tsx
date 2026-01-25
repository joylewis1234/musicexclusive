import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { DiscoveryHeader } from "@/components/discovery/DiscoveryHeader";
import { SearchFilterBar } from "@/components/discovery/SearchFilterBar";
import { HotNewArtists } from "@/components/discovery/HotNewArtists";
import { DiscoveryArtistCard } from "@/components/discovery/DiscoveryArtistCard";
import { ShareTrackModal } from "@/components/ShareTrackModal";
import { useAudioPreview } from "@/hooks/useAudioPreview";
import { discoveryArtists, Genre } from "@/data/discoveryArtists";
import { Track } from "@/contexts/PlayerContext";

// Mock track for sharing (since we're sharing artists, we create a placeholder track)
const createMockTrackForArtist = (artistId: string, artistName: string): Track => ({
  id: `${artistId}-featured`,
  title: "Featured Track",
  artist: artistName,
  album: "Discovery",
  artwork: "",
  duration: 180,
});

const Discovery = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<Genre>("All Genres");
  const [featuredArtists, setFeaturedArtists] = useState(() => 
    discoveryArtists.filter(a => a.isFeatured)
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedArtistForShare, setSelectedArtistForShare] = useState<Track | null>(null);

  const { currentPreviewId, previewProgress, startPreview, stopPreview } = useAudioPreview();

  // Filter artists based on search and genre
  const filteredArtists = useMemo(() => {
    return discoveryArtists.filter((artist) => {
      const matchesSearch = 
        artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artist.genre.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesGenre = 
        selectedGenre === "All Genres" || 
        artist.genre.toLowerCase() === selectedGenre.toLowerCase();

      return matchesSearch && matchesGenre;
    });
  }, [searchQuery, selectedGenre]);

  // Non-featured artists for the main grid
  const gridArtists = useMemo(() => {
    return filteredArtists.filter(a => !a.isFeatured || !featuredArtists.some(f => f.id === a.id));
  }, [filteredArtists, featuredArtists]);

  // Filtered featured artists
  const displayedFeaturedArtists = useMemo(() => {
    if (searchQuery || selectedGenre !== "All Genres") {
      return featuredArtists.filter((artist) => {
        const matchesSearch = 
          artist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          artist.genre.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesGenre = 
          selectedGenre === "All Genres" || 
          artist.genre.toLowerCase() === selectedGenre.toLowerCase();

        return matchesSearch && matchesGenre;
      });
    }
    return featuredArtists;
  }, [featuredArtists, searchQuery, selectedGenre]);

  const handleRefreshFeatured = useCallback(() => {
    setIsRefreshing(true);
    
    // Simulate refresh with rotation
    setTimeout(() => {
      setFeaturedArtists((prev) => {
        const rotated = [...prev];
        const first = rotated.shift();
        if (first) rotated.push(first);
        return rotated;
      });
      setIsRefreshing(false);
    }, 500);
  }, []);

  const handleArtistClick = (artistId: string) => {
    navigate(`/artist/${artistId}`);
  };

  const handlePreview = (artistId: string) => {
    if (currentPreviewId === artistId) {
      stopPreview();
    } else {
      startPreview(artistId);
    }
  };

  const handleShare = (artist: typeof discoveryArtists[0]) => {
    const mockTrack = createMockTrackForArtist(artist.id, artist.name);
    setSelectedArtistForShare(mockTrack);
    setIsShareModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 py-6">
      <div className="flex-1 w-full max-w-2xl mx-auto">
        <DiscoveryHeader />

        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedGenre={selectedGenre}
          onGenreChange={setSelectedGenre}
        />

        {/* Hot New Artists */}
        <HotNewArtists
          artists={displayedFeaturedArtists}
          onRefresh={handleRefreshFeatured}
          onArtistClick={handleArtistClick}
          isRefreshing={isRefreshing}
        />

        {/* All Artists Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg uppercase tracking-wider text-foreground font-semibold">
            All Artists
          </h2>
          <span className="text-xs text-muted-foreground">
            {filteredArtists.length} artists
          </span>
        </div>

        {/* Artist Grid */}
        {filteredArtists.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground font-display">
              No artists found matching your search.
            </p>
          </div>
        ) : (
          <div 
            className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in"
            style={{ animationDelay: "100ms" }}
          >
            {filteredArtists.map((artist) => (
              <DiscoveryArtistCard
                key={artist.id}
                artist={artist}
                isPreviewPlaying={currentPreviewId === artist.id}
                previewProgress={currentPreviewId === artist.id ? previewProgress : 0}
                onPreview={() => handlePreview(artist.id)}
                onStream={() => handleArtistClick(artist.id)}
                onShare={() => handleShare(artist)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bottom spacing for navigation */}
      <div className="h-24" />

      {/* Share Modal */}
      <ShareTrackModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        track={selectedArtistForShare}
      />
    </div>
  );
};

export default Discovery;
