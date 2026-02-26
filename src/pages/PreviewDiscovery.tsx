import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PreviewHeader } from "@/components/preview/PreviewHeader";
import { SearchFilterBar } from "@/components/discovery/SearchFilterBar";
import { PreviewTrackCard, PreviewTrack } from "@/components/preview/PreviewTrackCard";
import { PreviewUpsellModal } from "@/components/preview/PreviewUpsellModal";
import { usePublicAudioPreview } from "@/hooks/usePublicAudioPreview";
import { supabase } from "@/integrations/supabase/client";
import { DiscoveryGenre } from "@/data/genres";
import { Header } from "@/components/Header";
import Footer from "@/components/Footer";

/** Fetch preview-public tracks via the SECURITY DEFINER RPC */
const fetchPublicPreviewTracks = async (): Promise<PreviewTrack[]> => {
  const { data, error } = await supabase.rpc("get_public_preview_tracks");
  if (error) {
    console.error("[PreviewDiscovery] RPC error:", error);
    return [];
  }
  return (data ?? []) as PreviewTrack[];
};

const PreviewDiscovery = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<DiscoveryGenre>("All Genres");

  const {
    currentPreviewId,
    previewProgress,
    isPlaying,
    isLoading: isPreviewLoading,
    error: previewError,
    startPreview,
    stopPreview,
  } = usePublicAudioPreview();

  const { data: tracks = [], isLoading: isLoadingTracks } = useQuery({
    queryKey: ["public-preview-tracks"],
    queryFn: fetchPublicPreviewTracks,
    staleTime: 60_000,
  });

  // ── Upsell modal logic: 60s after first preview play ──
  const [showUpsell, setShowUpsell] = useState(false);
  const firstPlayTimeRef = useRef<number | null>(null);
  const upsellTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isPlaying && firstPlayTimeRef.current === null) {
      firstPlayTimeRef.current = Date.now();
      upsellTimerRef.current = setTimeout(() => {
        setShowUpsell(true);
      }, 60_000);
    }
  }, [isPlaying]);

  const handleDismissUpsell = useCallback(() => {
    setShowUpsell(false);
    upsellTimerRef.current = setTimeout(() => {
      setShowUpsell(true);
    }, 60_000);
  }, []);

  useEffect(() => {
    return () => {
      stopPreview();
      if (upsellTimerRef.current) clearTimeout(upsellTimerRef.current);
    };
  }, [stopPreview]);

  // ── Filter tracks ──
  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      const artistName = track.artist_name || "Artist";
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

  const handlePreview = (track: PreviewTrack) => {
    if (currentPreviewId === track.id && isPlaying) {
      stopPreview();
    } else {
      startPreview(track.id, track.preview_start_seconds || 0);
    }
  };

  const handleGetAccess = () => {
    navigate("/vault/enter");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 pt-20">
        <PreviewHeader />

        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedGenre={selectedGenre}
          onGenreChange={setSelectedGenre}
        />

        {/* Track count */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base uppercase tracking-wider text-foreground font-semibold">
            Exclusive Tracks
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
              <PreviewTrackCard
                key={track.id}
                track={track}
                isPreviewPlaying={currentPreviewId === track.id && isPlaying}
                isPreviewLoading={currentPreviewId === track.id && isPreviewLoading}
                previewProgress={currentPreviewId === track.id ? previewProgress : 0}
                previewError={currentPreviewId === track.id ? previewError : null}
                onPreview={() => handlePreview(track)}
                onGetAccess={handleGetAccess}
              />
            ))}
          </div>
        )}
      </div>

      <Footer />

      <PreviewUpsellModal open={showUpsell} onDismiss={handleDismissUpsell} />
    </div>
  );
};

export default PreviewDiscovery;
