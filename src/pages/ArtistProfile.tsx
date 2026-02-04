import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Loader2, Music, Crown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArtistProfileHero } from "@/components/profile/ArtistProfileHero";
import { ArtistAboutSection } from "@/components/profile/ArtistAboutSection";
import { AppleMusicTrackRow } from "@/components/profile/AppleMusicTrackRow";
import { CompactVaultPlayer } from "@/components/profile/CompactVaultPlayer";
import { ShareArtistSection } from "@/components/profile/ShareArtistSection";
import { VaultAccessGate } from "@/components/profile/VaultAccessGate";
import { ShareExclusiveTrackModal } from "@/components/profile/ShareExclusiveTrackModal";
import { useTrackLikesBatch } from "@/hooks/useTrackLikesBatch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

import artist1 from "@/assets/artist-1.jpg";

interface DbTrack {
  id: string;
  title: string;
  genre: string | null;
  duration: number;
  full_audio_url: string | null;
  artwork_url: string | null;
  created_at: string;
}

interface ArtistData {
  id: string;
  userId: string;
  name: string;
  genre: string;
  bio: string;
  imageUrl: string;
  socialLinks: {
    instagram?: string | null;
    tiktok?: string | null;
    twitter?: string | null;
    youtube?: string | null;
  };
}

interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string;
  audioUrl: string;
}

type ViewContext = "fan" | "artist-own" | "artist-other";

const ArtistProfile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { artistId } = useParams<{ artistId: string }>();
  const [searchParams] = useSearchParams();
  const selectedTrackId = searchParams.get("track");
  const forceFanView = searchParams.get("view") === "fan";
  const { user, role } = useAuth();

  // Get the origin route from navigation state
  const fromRoute = (location.state as { fromRoute?: string } | null)?.fromRoute;

  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [tracks, setTracks] = useState<DbTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTrack, setSelectedTrack] = useState<PlayerTrack | null>(null);
  const [fanId, setFanId] = useState<string | null>(null);
  const [hasVaultAccess, setHasVaultAccess] = useState(false);
  const [showAccessGate, setShowAccessGate] = useState(false);
  const [viewContext, setViewContext] = useState<ViewContext>("fan");
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [trackToShare, setTrackToShare] = useState<DbTrack | null>(null);
  
  // Refs for scroll-to-track behavior
  const trackRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasScrolledToTrack = useRef(false);

  // Track IDs for batch like fetching
  const trackIds = tracks.map(t => t.id);
  const { getLikeState, toggleLike, isTrackLoading } = useTrackLikesBatch(trackIds, fanId);

  // Fetch fan's vault membership
  useEffect(() => {
    const fetchFanData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data: member } = await supabase
          .from("vault_members")
          .select("id, vault_access_active")
          .eq("email", user.email)
          .maybeSingle();

        if (member) {
          setFanId(member.id);
          setHasVaultAccess(member.vault_access_active);
        }
      }
    };
    fetchFanData();
  }, []);

  // Fetch artist and tracks
  useEffect(() => {
    const fetchArtistData = async () => {
      if (!artistId) return;

      setIsLoading(true);
      try {
        // Fetch artist profile - try by user_id first, then by profile id
        let profile = null;
        let artistUserId = artistId;
        
        // Use public view to avoid exposing sensitive fields (stripe_account_id, payout_status)
        const { data: profileByUserId } = await supabase
          .from("public_artist_profiles")
          .select("id, user_id, artist_name, genre, bio, avatar_url")
          .eq("user_id", artistId)
          .maybeSingle();
        
        if (profileByUserId) {
          profile = profileByUserId;
          artistUserId = profileByUserId.user_id;
        } else {
          const { data: profileById } = await supabase
            .from("public_artist_profiles")
            .select("id, user_id, artist_name, genre, bio, avatar_url")
            .eq("id", artistId)
            .maybeSingle();
          
          if (profileById) {
            profile = profileById;
            artistUserId = profileById.user_id;
          }
        }

        if (profile) {
          setArtist({
            id: profile.id,
            userId: profile.user_id,
            name: profile.artist_name,
            genre: profile.genre || "Music",
            bio: profile.bio || `Exclusive artist on Music Exclusive™. Experience premium, unreleased music only available inside the Vault.`,
            imageUrl: profile.avatar_url || artist1,
            socialLinks: {
              instagram: profile.instagram_url,
              tiktok: profile.tiktok_url,
              twitter: profile.twitter_url,
              youtube: profile.youtube_url,
            },
          });
        } else {
          // Fallback to demo artist
          setArtist({
            id: artistId,
            userId: "",
            name: "Artist",
            genre: "Music",
            bio: "Exclusive artist on Music Exclusive™.",
            imageUrl: artist1,
            socialLinks: {},
          });
        }

        // Fetch tracks
        const { data: trackData } = await supabase
          .from("tracks")
          .select("id, title, genre, duration, full_audio_url, artwork_url, created_at")
          .eq("artist_id", artistId)
          .not("genre", "like", "[DELETED]%")
          .not("genre", "like", "[DISABLED]%")
          .order("created_at", { ascending: false });

        if (trackData) {
          setTracks(trackData);
        }
      } catch (error) {
        console.error("Error fetching artist:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtistData();
  }, [artistId]);

  // Determine view context
  useEffect(() => {
    if (!artist) return;
    
    if (forceFanView) {
      setViewContext("fan");
      return;
    }
    
    if (role === "fan") {
      setViewContext("fan");
    } else if (role === "artist") {
      if (user?.id === artist.userId) {
        setViewContext("artist-own");
      } else {
        setViewContext("artist-other");
      }
    } else {
      setViewContext("fan");
    }
  }, [role, user?.id, artist, forceFanView]);

  // Scroll to selected track from URL
  useEffect(() => {
    if (selectedTrackId && tracks.length > 0 && !hasScrolledToTrack.current) {
      const trackElement = trackRefs.current[selectedTrackId];
      if (trackElement) {
        setTimeout(() => {
          trackElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
        hasScrolledToTrack.current = true;
      }
    }
  }, [selectedTrackId, tracks]);

  const handleSelectTrack = (track: DbTrack) => {
    setSelectedTrack({
      id: track.id,
      title: track.title,
      artist: artist?.name || "Unknown Artist",
      artworkUrl: track.artwork_url || artist?.imageUrl || artist1,
      audioUrl: track.full_audio_url || "",
    });
  };

  const handlePlayAll = () => {
    if (tracks.length > 0) {
      if (selectedTrack) {
        // Already have a track selected, this could toggle play
        return;
      }
      handleSelectTrack(tracks[0]);
    }
  };

  const handleShareTrack = (track: DbTrack) => {
    if (!hasVaultAccess) {
      toast({
        title: "Vault Access Required",
        description: "Enter the Vault to share exclusive music.",
        variant: "destructive",
      });
      return;
    }
    setTrackToShare(track);
    setShareModalOpen(true);
  };

  const handleShareArtist = () => {
    if (!hasVaultAccess) {
      toast({
        title: "Vault Access Required",
        description: "Enter the Vault to share artists.",
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Share Artist",
      description: "Artist sharing coming soon!",
    });
  };

  const handlePlayerLike = () => {
    if (!hasVaultAccess) {
      toast({
        title: "Vault Access Required",
        description: "Enter the Vault to like tracks.",
        variant: "destructive",
      });
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

  // Navigation handlers
  const handleBack = () => {
    if (forceFanView && viewContext === "fan") {
      // Artist viewing their own profile as fan preview
      navigate("/artist/dashboard");
    } else if (fromRoute) {
      navigate(fromRoute);
    } else {
      navigate("/discovery");
    }
  };

  const getBackLabel = () => {
    if (forceFanView) {
      return "Artist Dashboard";
    }
    if (fromRoute === "/discovery" || !fromRoute) {
      return "Discovery";
    }
    return "Back";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <Music className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-center">Artist not found</p>
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
        <div className="w-full max-w-lg mx-auto">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-background/80 backdrop-blur-md border border-border/50 text-foreground/80 hover:text-foreground hover:bg-background/90 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">{getBackLabel()}</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <ArtistProfileHero
        name={artist.name}
        genre={artist.genre}
        imageUrl={artist.imageUrl}
        onPlayAll={handlePlayAll}
        onShareArtist={handleShareArtist}
        isPlaying={!!selectedTrack}
      />

      {/* About Section */}
      <ArtistAboutSection bio={artist.bio} socialLinks={artist.socialLinks} />

      {/* Vault Player */}
      <CompactVaultPlayer
        track={selectedTrack}
        hasVaultAccess={hasVaultAccess}
        isLiked={selectedTrack ? getLikeState(selectedTrack.id).isLiked : false}
        onAccessDenied={() => setShowAccessGate(true)}
        onLike={handlePlayerLike}
        onShare={handlePlayerShare}
      />

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
                  isHighlighted={selectedTrackId === track.id}
                  likeCount={likeState.count}
                  isLiked={likeState.isLiked}
                  isLikeLoading={isTrackLoading(track.id)}
                  onToggleLike={() => toggleLike(track.id)}
                  onSelect={() => handleSelectTrack(track)}
                  onShare={() => handleShareTrack(track)}
                  fallbackImage={artist.imageUrl}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Share Artist Section */}
      <ShareArtistSection
        artistName={artist.name}
        onShareToInbox={handleShareArtist}
      />

      {/* Fan Dashboard Link - Only show for fans */}
      {viewContext === "fan" && (
        <section className="px-5 pb-4">
          <Button
            variant="outline"
            className="w-full gap-2 rounded-xl border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-foreground/50"
            onClick={() => navigate("/fan/profile")}
          >
            <User className="w-4 h-4" />
            Go to My Fan Profile
          </Button>
        </section>
      )}

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
      {shareModalOpen && trackToShare && artist && fanId && (
        <ShareExclusiveTrackModal
          open={shareModalOpen}
          onOpenChange={(open) => {
            setShareModalOpen(open);
            if (!open) setTrackToShare(null);
          }}
          track={{
            id: trackToShare.id,
            title: trackToShare.title,
            artistName: artist.name,
            artworkUrl: trackToShare.artwork_url || artist.imageUrl,
          }}
          artistId={artist.id}
          currentUserEmail={user?.email || undefined}
        />
      )}
    </div>
  );
};

export default ArtistProfile;
