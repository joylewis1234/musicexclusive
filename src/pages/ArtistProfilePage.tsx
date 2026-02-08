import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, Loader2, Music, Crown, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArtistProfileHero } from "@/components/profile/ArtistProfileHero";
import { ArtistAboutSection } from "@/components/profile/ArtistAboutSection";
import { AppleMusicTrackRow } from "@/components/profile/AppleMusicTrackRow";
import { CompactVaultPlayer } from "@/components/profile/CompactVaultPlayer";
import { ShareArtistSection } from "@/components/profile/ShareArtistSection";
import { VaultAccessGate } from "@/components/profile/VaultAccessGate";
import { ShareExclusiveTrackModal } from "@/components/profile/ShareExclusiveTrackModal";
import { StreamConfirmModal } from "@/components/player/StreamConfirmModal";
import { PlayerErrorBoundary, TrackListErrorBoundary } from "@/components/error-boundaries";
import { useTrackLikesBatch } from "@/hooks/useTrackLikesBatch";
import { useStreamCharge } from "@/hooks/useStreamCharge";
import { useCredits } from "@/hooks/useCredits";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

import artist1 from "@/assets/artist-1.jpg";

interface ArtistProfile {
  id: string;
  user_id: string;
  artist_name: string;
  genre: string | null;
  bio: string | null;
  avatar_url: string | null;
}

interface TrackData {
  id: string;
  title: string;
  genre: string | null;
  artwork_url: string | null;
  full_audio_url: string | null;
  duration: number;
  created_at: string;
  artist_id: string;
}

interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
  audioUrl: string;
}

type ViewerContext = "fan" | "artist-own" | "artist-preview";

const ArtistProfilePage = () => {
  const navigate = useNavigate();
  const { artistId } = useParams<{ artistId: string }>();
  const [searchParams] = useSearchParams();
  const { user, role } = useAuth();
  
  const isPreviewMode = searchParams.get("view") === "fan";
  const highlightTrackId = searchParams.get("track");

  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerContext, setViewerContext] = useState<ViewerContext>("fan");
  const [hasVaultAccess, setHasVaultAccess] = useState(false);
  const [fanId, setFanId] = useState<string | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<PlayerTrack | null>(null);
  const [showAccessGate, setShowAccessGate] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [trackToShare, setTrackToShare] = useState<TrackData | null>(null);
  const [artistEmail, setArtistEmail] = useState<string>("");
  const [showStreamConfirm, setShowStreamConfirm] = useState(false);
  const [pendingPlayTrack, setPendingPlayTrack] = useState<PlayerTrack | null>(null);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  
  const trackRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasScrolledToTrack = useRef(false);
  // Track IDs for batch like fetching
  const trackIds = tracks.map(t => t.id);
  const { getLikeState, toggleLike, isTrackLoading } = useTrackLikesBatch(trackIds, fanId);
  const { chargeStream, hasBeenCharged, isProcessing: isCharging } = useStreamCharge(user?.email);
  const { credits, refetch: refetchCredits } = useCredits();

  // Generate public URL for storage path if needed
  const ensurePublicUrl = async (track: TrackData): Promise<TrackData> => {
    if (track.full_audio_url && track.full_audio_url.startsWith("http")) {
      return track;
    }

    const audioPath = `artists/${track.artist_id}/${track.id}.mp3`;
    const { data: audioData } = supabase.storage
      .from("track_audio")
      .getPublicUrl(audioPath);

    const newAudioUrl = audioData?.publicUrl || "";

    let newArtworkUrl = track.artwork_url;
    if (!track.artwork_url || !track.artwork_url.startsWith("http")) {
      const coverPath = `artists/${track.artist_id}/${track.id}.jpg`;
      const { data: coverData } = supabase.storage
        .from("track_covers")
        .getPublicUrl(coverPath);
      newArtworkUrl = coverData?.publicUrl || null;
    }

    if (newAudioUrl && newAudioUrl !== track.full_audio_url) {
      await supabase
        .from("tracks")
        .update({
          full_audio_url: newAudioUrl,
          artwork_url: newArtworkUrl,
        } as any)
        .eq("id", track.id);
    }

    return {
      ...track,
      full_audio_url: newAudioUrl,
      artwork_url: newArtworkUrl,
    };
  };

  // Load artist profile and tracks
  useEffect(() => {
    const fetchData = async () => {
      if (!artistId) {
        setError("Artist not found");
        setIsLoading(false);
        return;
      }

      try {
        // Use public view to avoid exposing sensitive fields (stripe_account_id, payout_status)
        const { data: profile, error: profileError } = await supabase
          .from("public_artist_profiles")
          .select("id, user_id, artist_name, genre, bio, avatar_url")
          .eq("id", artistId)
          .maybeSingle();

        if (profileError || !profile) {
          setError("Artist not found");
          setIsLoading(false);
          return;
        }

        setArtistProfile(profile);

        // Try to get artist email from applications first, then fall back to user lookup
        const { data: userData } = await supabase
          .from("artist_applications")
          .select("contact_email")
          .eq("artist_name", profile.artist_name)
          .maybeSingle();

        // If no application found, use artist profile id as fallback reference
        setArtistEmail(userData?.contact_email || `artist_${profile.id}@musicexclusive.com`);

        const { data: trackData } = await supabase
          .from("tracks")
          .select("*")
          .eq("artist_id", profile.id)
          .eq("status", "ready")
          .not("genre", "like", "[DELETED]%")
          .not("genre", "like", "[DISABLED]%")
          .order("created_at", { ascending: false });

        if (trackData && trackData.length > 0) {
          const tracksWithUrls = await Promise.all(
            trackData.map(t => ensurePublicUrl(t))
          );
          setTracks(tracksWithUrls);

          if (highlightTrackId) {
            const highlightedTrack = tracksWithUrls.find(t => t.id === highlightTrackId);
            if (highlightedTrack) {
              handleSelectTrack(highlightedTrack);
            }
          }
        } else {
          setTracks([]);
        }
      } catch (err) {
        console.error("Error fetching artist data:", err);
        setError("Something went wrong");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [artistId, highlightTrackId]);

  // Determine viewer context and vault access
  useEffect(() => {
    const checkAccess = async () => {
      if (!artistProfile) return;

      const isOwner = user?.id === artistProfile.user_id;

      if (role === "artist" && isOwner) {
        setViewerContext(isPreviewMode ? "artist-preview" : "artist-own");
        setHasVaultAccess(true);
        return;
      }

      setViewerContext("fan");

      if (!user?.email) {
        setHasVaultAccess(false);
        return;
      }

      const { data: vaultMember } = await supabase
        .from("vault_members")
        .select("id, vault_access_active")
        .eq("email", user.email)
        .maybeSingle();

      if (vaultMember?.vault_access_active) {
        setHasVaultAccess(true);
        setFanId(vaultMember.id);
      } else {
        setHasVaultAccess(false);
      }
    };

    checkAccess();
  }, [artistProfile, user, role, isPreviewMode]);

  // Scroll to highlighted track
  useEffect(() => {
    if (highlightTrackId && tracks.length > 0 && !hasScrolledToTrack.current) {
      const trackElement = trackRefs.current[highlightTrackId];
      if (trackElement) {
        setTimeout(() => {
          trackElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
        hasScrolledToTrack.current = true;
      }
    }
  }, [highlightTrackId, tracks]);

  const handleSelectTrack = (track: TrackData) => {
    setSelectedTrack({
      id: track.id,
      title: track.title,
      artist: artistProfile?.artist_name || "Unknown Artist",
      artworkUrl: track.artwork_url || artistProfile?.avatar_url || artist1,
      audioUrl: track.full_audio_url || "",
    });
  };

  const handlePlayAll = () => {
    if (tracks.length > 0 && !selectedTrack) {
      handleSelectTrack(tracks[0]);
    }
  };

  const handleShareTrack = (track: TrackData) => {
    if (!hasVaultAccess) {
      toast.error("Enter the Vault to share exclusive music.");
      return;
    }
    setTrackToShare(track);
    setShareModalOpen(true);
  };

  const handleShareArtist = () => {
    if (!hasVaultAccess) {
      toast.error("Enter the Vault to share artists.");
      return;
    }
    toast.info("Artist sharing coming soon!");
  };

  const handlePlayerLike = () => {
    if (!hasVaultAccess) {
      toast.error("Enter the Vault to like tracks.");
      return;
    }
    if (fanId && selectedTrack) {
      toggleLike(selectedTrack.id);
    }
  };

  const handlePlayerShare = () => {
    if (selectedTrack) {
      const track = tracks.find(t => t.id === selectedTrack.id);
      if (track) {
        handleShareTrack(track);
      }
    }
  };

  // Called when user clicks play on the player - shows confirmation modal
  const handlePlayRequest = useCallback(() => {
    if (!selectedTrack) return;
    
    // If already charged in this session, just play (no modal)
    if (hasBeenCharged(selectedTrack.id)) {
      return; // Let the player play without modal
    }
    
    // Show confirmation modal
    setPendingPlayTrack(selectedTrack);
    setShowStreamConfirm(true);
  }, [selectedTrack, hasBeenCharged]);

  // Called when user confirms the stream in the modal
  const handleStreamConfirm = useCallback(async () => {
    if (!pendingPlayTrack) return;

    // chargeStream now fetches artist_id from the track itself
    const result = await chargeStream(pendingPlayTrack.id);
    
    if (result.success) {
      // Refresh credits to show updated balance
      refetchCredits();
      // Trigger auto-play after modal closes
      setShouldAutoPlay(true);
    } else if (result.requiresCredits) {
      // Modal will handle this via the "Add Credits" button
      throw new Error("Insufficient credits");
    } else {
      throw new Error(result.error || "Failed to process stream");
    }
  }, [pendingPlayTrack, chargeStream, refetchCredits]);

  const handleAddCredits = useCallback(() => {
    navigate("/fan/add-credits");
  }, [navigate]);

  const handleBack = () => {
    if (viewerContext === "artist-own" || viewerContext === "artist-preview") {
      navigate("/artist/dashboard");
    } else {
      navigate("/discovery");
    }
  };

  const getBackLabel = () => {
    if (viewerContext === "artist-own" || viewerContext === "artist-preview") {
      return "Dashboard";
    }
    return "Discovery";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !artistProfile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <Music className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-center">{error || "Artist not found"}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/discovery")}>
          Back to Discovery
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Back navigation - Floating */}
      <header className="fixed top-0 left-0 right-0 z-30 px-4 py-4">
        <div className="w-full max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-background/80 backdrop-blur-md border border-border/50 text-foreground/80 hover:text-foreground hover:bg-background/90 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">{getBackLabel()}</span>
          </button>

          {/* Preview mode badge */}
          {viewerContext === "artist-preview" && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-400 text-xs font-display uppercase tracking-wider">
                Preview
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <ArtistProfileHero
        name={artistProfile.artist_name}
        genre={artistProfile.genre || "Music"}
        imageUrl={artistProfile.avatar_url || artist1}
        onPlayAll={handlePlayAll}
        onShareArtist={handleShareArtist}
        isPlaying={!!selectedTrack}
        hidePlayButton={viewerContext === "artist-preview"}
      />

      {/* About Section */}
      <ArtistAboutSection 
        bio={artistProfile.bio || `Exclusive artist on Music Exclusive™. Experience premium, unreleased music only available inside the Vault.`} 
      />

      {/* Vault Player - wrapped in error boundary */}
      <PlayerErrorBoundary onRetry={() => setSelectedTrack(null)}>
        <CompactVaultPlayer
          track={selectedTrack}
          hasVaultAccess={hasVaultAccess}
          isLiked={selectedTrack ? getLikeState(selectedTrack.id).isLiked : false}
          onAccessDenied={() => setShowAccessGate(true)}
          onPlay={handlePlayRequest}
          onLike={handlePlayerLike}
          onShare={handlePlayerShare}
          skipPlayConfirm={selectedTrack ? hasBeenCharged(selectedTrack.id) : false}
          autoPlay={shouldAutoPlay}
          onAutoPlayConsumed={() => setShouldAutoPlay(false)}
        />
      </PlayerErrorBoundary>

      {/* Track List Section */}
      <section className="px-5 pb-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Top Songs
          </h2>
          {/* Section badge with crown */}
          <div 
            className="relative px-2.5 py-1 rounded-full"
            style={{
              background: 'hsla(280, 80%, 50%, 0.12)',
            }}
          >
            <Crown 
              className="absolute -top-1.5 -left-0.5 w-3 h-3 rotate-[-12deg]"
              style={{
                color: 'hsl(45, 90%, 55%)',
                filter: 'drop-shadow(0 0 3px hsla(45, 90%, 55%, 0.8))'
              }}
              fill="hsl(45, 90%, 55%)"
            />
            <span 
              className="text-[10px] font-display uppercase tracking-wider pl-1"
              style={{ color: 'hsl(280, 80%, 70%)' }}
            >
              Exclusive
            </span>
          </div>
        </div>

        {tracks.length === 0 ? (
          <div className="rounded-xl bg-muted/20 p-8 text-center border border-border/30">
            <Music className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No exclusive tracks available yet.
            </p>
          </div>
        ) : (
          <TrackListErrorBoundary>
            <div className="space-y-1">
              {tracks.map((track, index) => {
                const likeState = getLikeState(track.id);
                return (
                  <AppleMusicTrackRow
                    key={track.id}
                    ref={(el) => { trackRefs.current[track.id] = el; }}
                    track={{
                      id: track.id,
                      title: track.title,
                      artworkUrl: track.artwork_url,
                      duration: track.duration,
                    }}
                    index={index}
                    fanId={fanId}
                    hasVaultAccess={hasVaultAccess}
                    isSelected={selectedTrack?.id === track.id}
                    isHighlighted={highlightTrackId === track.id}
                    likeCount={likeState.count}
                    isLiked={likeState.isLiked}
                    isLikeLoading={isTrackLoading(track.id)}
                    onToggleLike={() => toggleLike(track.id)}
                    onSelect={() => handleSelectTrack(track)}
                    onShare={() => handleShareTrack(track)}
                    fallbackImage={artistProfile.avatar_url || artist1}
                  />
                );
              })}
            </div>
          </TrackListErrorBoundary>
        )}
      </section>

      {/* Share Artist Section */}
      <ShareArtistSection
        artistName={artistProfile.artist_name}
        onShareToInbox={handleShareArtist}
      />

      {/* Discover More CTA */}
      <section className="px-5 pb-8">
        <Button
          variant="outline"
          className="w-full rounded-xl"
          onClick={() => navigate("/discovery")}
        >
          Discover More Artists
        </Button>
      </section>

      {/* Bottom spacing */}
      <div className="h-8" />

      {/* Vault Access Gate Modal */}
      {showAccessGate && (
        <VaultAccessGate onClose={() => setShowAccessGate(false)} />
      )}

      {/* Share Track Modal */}
      {shareModalOpen && trackToShare && artistProfile && (
        <ShareExclusiveTrackModal
          open={shareModalOpen}
          onOpenChange={(open) => {
            setShareModalOpen(open);
            if (!open) setTrackToShare(null);
          }}
          track={{
            id: trackToShare.id,
            title: trackToShare.title,
            artistName: artistProfile.artist_name,
            artworkUrl: trackToShare.artwork_url || artistProfile.avatar_url,
          }}
          artistId={artistProfile.id}
          currentUserEmail={user?.email || undefined}
        />
      )}

      {/* Stream Confirmation Modal */}
      <StreamConfirmModal
        open={showStreamConfirm}
        onOpenChange={setShowStreamConfirm}
        artistName={artistProfile.artist_name}
        trackTitle={pendingPlayTrack?.title || ""}
        userCredits={credits}
        onConfirm={handleStreamConfirm}
        onAddCredits={handleAddCredits}
      />
    </div>
  );
};

export default ArtistProfilePage;
