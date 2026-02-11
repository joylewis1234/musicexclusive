import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DiscoveryHeader } from "@/components/discovery/DiscoveryHeader";
import { SearchFilterBar } from "@/components/discovery/SearchFilterBar";
import { HotNewTracks } from "@/components/discovery/HotNewTracks";
import { DiscoveryTrackCard } from "@/components/discovery/DiscoveryTrackCard";
import { ShareTrackModal } from "@/components/ShareTrackModal";
import { useAudioPreview } from "@/hooks/useAudioPreview";
import { useTracks, DbTrack, getArtistName } from "@/hooks/useTracks";
import { useTrackLikesBatch } from "@/hooks/useTrackLikesBatch";
import { Genre } from "@/data/discoveryArtists";
import { Track } from "@/contexts/PlayerContext";

// Convert DbTrack to Track for sharing
const dbTrackToTrack = (dbTrack: DbTrack): Track => ({
  id: dbTrack.id,
  title: dbTrack.title,
  artist: getArtistName(dbTrack),
  album: dbTrack.album || "Single",
  artwork: dbTrack.artwork_url || "",
  duration: dbTrack.duration,
});

const Discovery = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<Genre>("All Genres");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedTrackForShare, setSelectedTrackForShare] = useState<Track | null>(null);

  const {
    currentPreviewId,
    previewProgress,
    isPlaying,
    isLoading: isPreviewLoading,
    error: previewError,
    startPreview,
    stopPreview,
  } = useAudioPreview();

  const { tracks, isLoading: isLoadingTracks } = useTracks();

  const trackIds = useMemo(() => tracks.map((t) => t.id), [tracks]);
  const { getLikeState } = useTrackLikesBatch(trackIds, null);

  const [featuredTrackIds, setFeaturedTrackIds] = useState<string[]>([]);

  useEffect(() => {
    if (tracks.length > 0 && featuredTrackIds.length === 0) {
      setFeaturedTrackIds(tracks.slice(0, 5).map((t) => t.id));
    }
  }, [tracks, featuredTrackIds.length]);

  const featuredTracks = useMemo(() => {
    return featuredTrackIds
      .map((id) => tracks.find((t) => t.id === id))
      .filter((t): t is DbTrack => t !== undefined);
  }, [tracks, featuredTrackIds]);

  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      const artistName = getArtistName(track);
      const matchesSearch =
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        artistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (track.genre?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

      const matchesGenre =
        selectedGenre === "All Genres" ||
        track.genre?.toLowerCase() === selectedGenre.toLowerCase();

      return matchesSearch && matchesGenre;
    });
  }, [tracks, searchQuery, selectedGenre]);

  const displayedFeaturedTracks = useMemo(() => {
    if (searchQuery || selectedGenre !== "All Genres") {
      return featuredTracks.filter((track) => {
        const artistName = getArtistName(track);
        const matchesSearch =
          track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          artistName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (track.genre?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

        const matchesGenre =
          selectedGenre === "All Genres" ||
          track.genre?.toLowerCase() === selectedGenre.toLowerCase();

        return matchesSearch && matchesGenre;
      });
    }
    return featuredTracks;
  }, [featuredTracks, searchQuery, selectedGenre]);

  const handleRefreshFeatured = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setFeaturedTrackIds((prev) => {
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

  const handleStreamTrack = (track: DbTrack) => {
    navigate(`/artist/${track.artist_id}?track=${track.id}`);
  };

  const handleTrackClick = (track: DbTrack) => {
    handleStreamTrack(track);
  };

  const handlePreview = (track: DbTrack) => {
    if (currentPreviewId === track.id && isPlaying) {
      stopPreview();
    } else {
      const audioUrl = track.preview_audio_url || track.full_audio_url;
      const startSeconds = track.preview_start_seconds || 0;
      startPreview(track.id, audioUrl, startSeconds);
    }
  };

  const handleShare = (track: DbTrack) => {
    setSelectedTrackForShare(dbTrackToTrack(track));
    setIsShareModalOpen(true);
  };

  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, [stopPreview]);

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 py-6">
      <div className="flex-1 w-full max-w-5xl mx-auto">
        <DiscoveryHeader />

        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedGenre={selectedGenre}
          onGenreChange={setSelectedGenre}
        />

        {/* Hot New Drops */}
        <HotNewTracks
          tracks={displayedFeaturedTracks}
          onRefresh={handleRefreshFeatured}
          onTrackClick={handleTrackClick}
          onStreamClick={handleStreamTrack}
          isRefreshing={isRefreshing}
        />

        {/* All Tracks */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base uppercase tracking-wider text-foreground font-semibold">
            All Tracks
          </h2>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            {filteredTracks.length} tracks
          </span>
        </div>

        {isLoadingTracks ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground font-display text-sm">Loading tracks…</p>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground font-display text-sm">
              No tracks found matching your search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 animate-fade-in">
            {filteredTracks.map((track) => (
              <DiscoveryTrackCard
                key={track.id}
                track={track}
                isPreviewPlaying={currentPreviewId === track.id && isPlaying}
                isPreviewLoading={currentPreviewId === track.id && isPreviewLoading}
                previewProgress={currentPreviewId === track.id ? previewProgress : 0}
                previewError={currentPreviewId === track.id ? previewError : null}
                likeCount={getLikeState(track.id).count}
                onPreview={() => handlePreview(track)}
                onStream={() => handleStreamTrack(track)}
                onShare={() => handleShare(track)}
                onArtistClick={() => handleArtistClick(track.artist_id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      <ShareTrackModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        track={selectedTrackForShare}
      />
    </div>
  );
};

export default Discovery;
