import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DiscoveryHeader } from "@/components/discovery/DiscoveryHeader";
import { SearchFilterBar } from "@/components/discovery/SearchFilterBar";
import { HotNewTracks } from "@/components/discovery/HotNewTracks";
import { DiscoveryTrackCard } from "@/components/discovery/DiscoveryTrackCard";
import { ShareTrackModal } from "@/components/ShareTrackModal";
import { useAudioPreview } from "@/hooks/useAudioPreview";
import { useTracks, DbTrack, getArtistName } from "@/hooks/useTracks";
import { supabase } from "@/integrations/supabase/client";
import { Genre } from "@/data/discoveryArtists";
import { Track } from "@/contexts/PlayerContext";

// Convert DbTrack to Track for sharing
const dbTrackToTrack = (dbTrack: DbTrack): Track => ({
  id: dbTrack.id,
  title: dbTrack.title,
  artist: getArtistName(dbTrack.artist_id),
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
    stopPreview 
  } = useAudioPreview();

  // Fetch tracks from database
  const { tracks, isLoading: isLoadingTracks } = useTracks();

  // Featured tracks (first 5 for hot section)
  const [featuredTrackIds, setFeaturedTrackIds] = useState<string[]>([]);

  // Initialize featured tracks when tracks load
  useEffect(() => {
    if (tracks.length > 0 && featuredTrackIds.length === 0) {
      setFeaturedTrackIds(tracks.slice(0, 5).map(t => t.id));
    }
  }, [tracks, featuredTrackIds.length]);

  const featuredTracks = useMemo(() => {
    return featuredTrackIds
      .map(id => tracks.find(t => t.id === id))
      .filter((t): t is DbTrack => t !== undefined);
  }, [tracks, featuredTrackIds]);

  // Filter tracks based on search and genre
  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      const artistName = getArtistName(track.artist_id);
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

  // Filtered featured tracks
  const displayedFeaturedTracks = useMemo(() => {
    if (searchQuery || selectedGenre !== "All Genres") {
      return featuredTracks.filter((track) => {
        const artistName = getArtistName(track.artist_id);
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
    
    // Rotate featured tracks
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

  const handleArtistClick = async (artistId: string) => {
    // artistId here is actually the artist's email from tracks.artist_id
    // We need to look up the artist profile ID
    // Use public view to avoid exposing sensitive fields
    const { data: profile } = await supabase
      .from("public_artist_profiles")
      .select("id")
      .eq("artist_name", getArtistName(artistId))
      .maybeSingle();

    if (profile) {
      navigate(`/artist/${profile.id}`);
    } else {
      // Fallback - try to find by email in applications
      const { data: app } = await supabase
        .from("artist_applications")
        .select("artist_name")
        .eq("contact_email", artistId)
        .maybeSingle();

      if (app) {
        const { data: profileByName } = await supabase
          .from("public_artist_profiles")
          .select("id")
          .eq("artist_name", app.artist_name)
          .maybeSingle();

        if (profileByName) {
          navigate(`/artist/${profileByName.id}`);
          return;
        }
      }
      // If no profile found, navigate anyway (will show error on profile page)
      navigate(`/artist/${artistId}`);
    }
  };

  const handleStreamTrack = async (track: DbTrack) => {
    // Look up artist profile ID from the track's artist_id (email)
    const { data: app } = await supabase
      .from("artist_applications")
      .select("artist_name")
      .eq("contact_email", track.artist_id)
      .maybeSingle();

    if (app) {
      const { data: profile } = await supabase
        .from("artist_profiles")
        .select("id")
        .eq("artist_name", app.artist_name)
        .maybeSingle();

      if (profile) {
        navigate(`/artist/${profile.id}?track=${track.id}`);
        return;
      }
    }
    // Fallback
    navigate(`/artist/${track.artist_id}?track=${track.id}`);
  };

  const handleTrackClick = async (track: DbTrack) => {
    await handleStreamTrack(track);
  };

  const handlePreview = (track: DbTrack) => {
    if (currentPreviewId === track.id && isPlaying) {
      stopPreview();
    } else {
      // Use preview_audio_url if available, otherwise use full_audio_url with start offset
      const audioUrl = track.preview_audio_url || track.full_audio_url;
      const startSeconds = track.preview_start_seconds || 0;
      startPreview(track.id, audioUrl, startSeconds);
    }
  };

  const handleShare = (track: DbTrack) => {
    setSelectedTrackForShare(dbTrackToTrack(track));
    setIsShareModalOpen(true);
  };

  // Stop preview when navigating away
  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, [stopPreview]);

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

        {/* Hot New Drops */}
        <HotNewTracks
          tracks={displayedFeaturedTracks}
          onRefresh={handleRefreshFeatured}
          onTrackClick={handleTrackClick}
          onStreamClick={handleStreamTrack}
          isRefreshing={isRefreshing}
        />

        {/* All Tracks Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg uppercase tracking-wider text-foreground font-semibold">
            All Tracks
          </h2>
          <span className="text-xs text-muted-foreground">
            {filteredTracks.length} tracks
          </span>
        </div>

        {/* Loading State */}
        {isLoadingTracks ? (
          <div className="text-center py-12">
             <p className="text-muted-foreground font-display">
              Loading tracks...
            </p>
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground font-display">
              No tracks found matching your search.
            </p>
          </div>
        ) : (
          <div 
            className="grid grid-cols-2 gap-4 animate-fade-in"
            style={{ animationDelay: "100ms" }}
          >
            {filteredTracks.map((track) => (
              <DiscoveryTrackCard
                key={track.id}
                track={track}
                isPreviewPlaying={currentPreviewId === track.id && isPlaying}
                isPreviewLoading={currentPreviewId === track.id && isPreviewLoading}
                previewProgress={currentPreviewId === track.id ? previewProgress : 0}
                previewError={currentPreviewId === track.id ? previewError : null}
                onPreview={() => handlePreview(track)}
                onStream={() => handleStreamTrack(track)}
                onShare={() => handleShare(track)}
                onArtistClick={() => handleArtistClick(track.artist_id)}
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
        track={selectedTrackForShare}
      />
    </div>
  );
};

export default Discovery;
