import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DiscoveryHeader } from "@/components/discovery/DiscoveryHeader";
import { SearchFilterBar } from "@/components/discovery/SearchFilterBar";
import { HotNewTracks } from "@/components/discovery/HotNewTracks";
import { DiscoveryTrackCard } from "@/components/discovery/DiscoveryTrackCard";
import { ShareTrackModal } from "@/components/ShareTrackModal";
import { PreviewStreamModal } from "@/components/discovery/PreviewStreamModal";
import { useTracks, DbTrack, getArtistName } from "@/hooks/useTracks";
import { useTrackLikesBatch } from "@/hooks/useTrackLikesBatch";
import { usePlayer, type PlayerTrack } from "@/contexts/PlayerContext";
import { Track } from "@/contexts/PlayerContext";
import { Genre } from "@/data/discoveryArtists";
import { supabase } from "@/integrations/supabase/client";

// Convert DbTrack to legacy Track for ShareTrackModal
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
  const player = usePlayer();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<Genre>("All Genres");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedTrackForShare, setSelectedTrackForShare] = useState<Track | null>(null);

  // Stream modal state
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [streamModalTrack, setStreamModalTrack] = useState<DbTrack | null>(null);

  // Preview URL fetch state
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const [previewErrors, setPreviewErrors] = useState<Record<string, string>>({});

  const { tracks, isLoading: isLoadingTracks } = useTracks();

  const trackIds = useMemo(() => tracks.map((t) => t.id), [tracks]);
  const { getLikeState } = useTrackLikesBatch(trackIds, null);

  // Wire preview-limit callback — only fires when 25 s cumulative is reached
  useEffect(() => {
    player.onPreviewLimitReachedRef.current = (trackId: string) => {
      const track = tracks.find((t) => t.id === trackId);
      if (track) {
        setStreamModalTrack(track);
        setShowStreamModal(true);
      }
    };
    return () => { player.onPreviewLimitReachedRef.current = null; };
  }, [tracks, player.onPreviewLimitReachedRef]);

  const handleStreamRedirect = useCallback(() => {
    if (!streamModalTrack) return;
    setShowStreamModal(false);
    navigate(`/artist/${streamModalTrack.artist_id}`, {
      state: { autoplayTrackId: streamModalTrack.id },
    });
  }, [streamModalTrack, navigate]);

  const handleDismissStreamModal = useCallback(() => {
    setShowStreamModal(false);
    setStreamModalTrack(null);
  }, []);

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

  // ---- Preview handler (uses PlayerContext single audio engine) ----
  const handlePreview = useCallback(async (track: DbTrack) => {
    const isThisPreview = player.currentTrack?.id === track.id && player.playbackMode === "preview";

    // Toggle pause/resume for current preview
    if (isThisPreview && player.isPlaying) {
      player.pause();
      return;
    }
    if (isThisPreview && !player.isPlaying) {
      player.play();
      return;
    }

    // New preview — fetch signed URL then play (takes over any current audio)
    setPreviewLoadingId(track.id);
    setPreviewErrors((prev) => {
      const next = { ...prev };
      delete next[track.id];
      return next;
    });

    const { data, error: fnError } = await supabase.functions.invoke("mint-playback-url", {
      body: { trackId: track.id, fileType: "preview" },
    });

    setPreviewLoadingId(null);

    if (fnError || !data?.url) {
      setPreviewErrors((prev) => ({ ...prev, [track.id]: "Preview not available. Tap Stream to listen." }));
      return;
    }

    const artistName = getArtistName(track);
    const pt: PlayerTrack = {
      id: track.id,
      title: track.title,
      artist: artistName,
      artworkUrl: track.artwork_url || track.artist_avatar_url || "",
      artistId: track.artist_id,
      album: track.album || "Single",
      artwork: track.artwork_url || track.artist_avatar_url || "",
      duration: track.duration,
    };

    player.loadAndPlayPreview(pt, data.url, track.preview_start_seconds || 0, 25);
  }, [player]);

  const handleShare = (track: DbTrack) => {
    setSelectedTrackForShare(dbTrackToTrack(track));
    setIsShareModalOpen(true);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // If a preview is playing when leaving Discovery, stop it
      if (player.playbackMode === "preview") {
        player.stopCurrent("manualStop");
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
            {filteredTracks.map((track) => {
              const isThisPreview = player.currentTrack?.id === track.id && player.playbackMode === "preview";
              const isPreviewPlaying = isThisPreview && player.isPlaying;
              const isPreviewLoading = previewLoadingId === track.id || (isThisPreview && player.isLoading);
              const previewProgressVal = isThisPreview ? player.previewProgress : 0;
              const previewErrorVal = previewErrors[track.id] || (isThisPreview ? player.error : null);

              return (
                <DiscoveryTrackCard
                  key={track.id}
                  track={track}
                  isPreviewPlaying={isPreviewPlaying}
                  isPreviewLoading={isPreviewLoading}
                  previewProgress={previewProgressVal}
                  previewError={previewErrorVal}
                  likeCount={getLikeState(track.id).count}
                  onPreview={() => handlePreview(track)}
                  onStream={() => handleStreamTrack(track)}
                  onShare={() => handleShare(track)}
                  onArtistClick={() => handleArtistClick(track.artist_id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Share Modal */}
      <ShareTrackModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        track={selectedTrackForShare}
      />

      {/* Preview Stream Modal */}
      <PreviewStreamModal
        open={showStreamModal}
        trackTitle={streamModalTrack?.title || ""}
        artistName={streamModalTrack ? getArtistName(streamModalTrack) : ""}
        onStream={handleStreamRedirect}
        onDismiss={handleDismissStreamModal}
      />
    </div>
  );
};

export default Discovery;
