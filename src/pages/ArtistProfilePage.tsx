import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";
import { VaultMusicPlayer } from "@/components/player/VaultMusicPlayer";
import { ExclusiveTrackCard } from "@/components/profile/ExclusiveTrackCard";
import { ShareExclusiveTrackModal } from "@/components/profile/ShareExclusiveTrackModal";
import { useAuth } from "@/contexts/AuthContext";
import { useStreamCharge } from "@/hooks/useStreamCharge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Crown,
  LayoutDashboard,
  Compass,
  Music,
  AlertTriangle,
  Eye,
} from "lucide-react";
import artist1 from "@/assets/artist-1.jpg";
import vaultPortal from "@/assets/vault-portal.png";

// Types
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

interface TrackLikeState {
  count: number;
  isLiked: boolean;
}

type ViewerContext = "fan" | "artist-own" | "artist-preview";

const ArtistProfilePage = () => {
  const navigate = useNavigate();
  const { artistId } = useParams<{ artistId: string }>();
  const [searchParams] = useSearchParams();
  const { user, role } = useAuth();
  
  // View mode from query param
  const isPreviewMode = searchParams.get("view") === "fan";
  const highlightTrackId = searchParams.get("track");

  // State
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerContext, setViewerContext] = useState<ViewerContext>("fan");
  const [hasVaultAccess, setHasVaultAccess] = useState(false);
  const [fanId, setFanId] = useState<string | null>(null);

  // Track selection and player
  const [selectedTrack, setSelectedTrack] = useState<TrackData | null>(null);
  const [trackLikes, setTrackLikes] = useState<Record<string, TrackLikeState>>({});

  // Share modal
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTrack, setShareTrack] = useState<TrackData | null>(null);

  // Stream charging
  const { chargeStream, hasBeenCharged } = useStreamCharge(user?.email);

  // Determine artist email for stream charges
  const [artistEmail, setArtistEmail] = useState<string>("");

  // Load artist profile and tracks
  useEffect(() => {
    const fetchData = async () => {
      if (!artistId) {
        setError("Artist not found");
        setIsLoading(false);
        return;
      }

      try {
        // Fetch artist profile by ID
        const { data: profile, error: profileError } = await supabase
          .from("artist_profiles")
          .select("id, user_id, artist_name, genre, bio, avatar_url")
          .eq("id", artistId)
          .maybeSingle();

        if (profileError || !profile) {
          setError("Artist not found");
          setIsLoading(false);
          return;
        }

        setArtistProfile(profile);

        // Get artist's email from their user_id for track fetching
        const { data: userData } = await supabase
          .from("artist_applications")
          .select("contact_email")
          .eq("artist_name", profile.artist_name)
          .maybeSingle();

        const email = userData?.contact_email || "";
        setArtistEmail(email);

        // Fetch tracks for this artist
        const { data: trackData } = await supabase
          .from("tracks")
          .select("*")
          .eq("artist_id", email)
          .not("genre", "like", "[DELETED]%")
          .not("genre", "like", "[DISABLED]%")
          .order("created_at", { ascending: false });

        if (trackData) {
          setTracks(trackData);

          // If highlight track is provided, select it
          if (highlightTrackId) {
            const highlightedTrack = trackData.find(t => t.id === highlightTrackId);
            if (highlightedTrack) {
              setSelectedTrack(highlightedTrack);
            }
          }

          // Fetch like counts for all tracks
          if (trackData.length > 0) {
            await fetchTrackLikes(trackData.map(t => t.id));
          }
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

      // Check if artist owns this profile
      const isOwner = user?.id === artistProfile.user_id;

      if (role === "artist" && isOwner) {
        if (isPreviewMode) {
          setViewerContext("artist-preview");
        } else {
          setViewerContext("artist-own");
        }
        setHasVaultAccess(true); // Artists can always access their own content
        return;
      }

      // Fan view - check vault access
      setViewerContext("fan");

      if (!user?.email) {
        setHasVaultAccess(false);
        return;
      }

      // Check vault membership
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

  // Fetch like counts for tracks
  const fetchTrackLikes = async (trackIds: string[]) => {
    const likeStates: Record<string, TrackLikeState> = {};

    for (const trackId of trackIds) {
      // Get total count
      const { count } = await supabase
        .from("track_likes")
        .select("*", { count: "exact", head: true })
        .eq("track_id", trackId);

      // Check if current fan has liked
      let isLiked = false;
      if (fanId) {
        const { data } = await supabase
          .from("track_likes")
          .select("id")
          .eq("track_id", trackId)
          .eq("fan_id", fanId)
          .maybeSingle();
        isLiked = !!data;
      }

      likeStates[trackId] = { count: count || 0, isLiked };
    }

    setTrackLikes(likeStates);
  };

  // Refresh likes when fanId changes
  useEffect(() => {
    if (tracks.length > 0 && fanId) {
      fetchTrackLikes(tracks.map(t => t.id));
    }
  }, [fanId, tracks.length]);

  // Handle like toggle
  const handleLikeToggle = async (trackId: string) => {
    if (!fanId || !hasVaultAccess) {
      toast.error("Enter the Vault to like and stream exclusive music.");
      return;
    }

    const currentState = trackLikes[trackId] || { count: 0, isLiked: false };

    if (currentState.isLiked) {
      // Unlike
      await supabase
        .from("track_likes")
        .delete()
        .eq("track_id", trackId)
        .eq("fan_id", fanId);

      setTrackLikes(prev => ({
        ...prev,
        [trackId]: { count: Math.max(0, prev[trackId].count - 1), isLiked: false }
      }));
    } else {
      // Like
      await supabase.from("track_likes").insert({
        track_id: trackId,
        fan_id: fanId,
      });

      setTrackLikes(prev => ({
        ...prev,
        [trackId]: { count: (prev[trackId]?.count || 0) + 1, isLiked: true }
      }));
    }
  };

  // Handle track selection
  const handleSelectTrack = (track: TrackData) => {
    setSelectedTrack(track);
  };

  // Handle share
  const handleShare = (track: TrackData) => {
    setShareTrack(track);
    setIsShareModalOpen(true);
  };

  // Handle play (for stream charging)
  const handlePlay = async () => {
    if (!selectedTrack || !artistEmail) return;

    // Check if already charged
    if (hasBeenCharged(selectedTrack.id)) return;

    // Charge the stream
    const result = await chargeStream(selectedTrack.id, artistEmail);
    if (!result.success && result.error === "Insufficient credits") {
      // Navigate to add credits
      navigate("/fan/payment");
    }
  };

  // Navigation handlers
  const handleBack = () => {
    if (viewerContext === "artist-own" || viewerContext === "artist-preview") {
      navigate("/artist/dashboard");
    } else {
      navigate("/discovery");
    }
  };

  const handleSecondaryNav = () => {
    navigate("/fan/dashboard");
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (error || !artistProfile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <AlertTriangle className="w-12 h-12 text-amber-400 mb-4" />
        <h1 className="font-display text-xl font-bold text-foreground mb-2">
          {error || "Artist not found"}
        </h1>
        <Button onClick={() => navigate("/discovery")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Discovery
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-lg md:max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium hidden sm:inline">
              {viewerContext === "fan" ? "Discovery" : "Dashboard"}
            </span>
          </button>

          {/* Title / Preview Badge */}
          <div className="flex items-center gap-2">
            {viewerContext === "artist-preview" && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/20 border border-amber-500/40">
                <Eye className="w-3 h-3 text-amber-400" />
                <span className="text-amber-400 text-xs font-display uppercase tracking-wider">
                  Preview Mode
                </span>
              </div>
            )}
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
              Artist Profile
            </span>
          </div>

          {/* Right Navigation */}
          {viewerContext === "fan" ? (
            <button
              onClick={handleSecondaryNav}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => navigate("/discovery")}
              className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Compass className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-lg md:max-w-xl mx-auto">
          
          {/* Artist Header Card */}
          <GlowCard className="p-0 overflow-hidden mb-6 relative">
            {/* Vault Portal Background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute inset-0 bg-secondary/30 blur-[60px] rounded-full scale-75 animate-pulse" />
              <div className="absolute inset-0 bg-accent/25 blur-[50px] rounded-full scale-90 animate-pulse [animation-delay:1s]" />
              <div className="absolute inset-0 bg-primary/25 blur-[55px] rounded-full scale-80 animate-pulse [animation-delay:0.5s]" />
              
              <img
                src={vaultPortal}
                alt=""
                className="w-[120%] h-[120%] object-contain vault-glow opacity-60"
              />
              
              <div className="absolute inset-[15%] rounded-full overflow-hidden mix-blend-screen">
                <div className="absolute inset-0 animate-vault-lightning-1 opacity-70" />
                <div className="absolute inset-0 animate-vault-lightning-2 opacity-60" />
                <div className="absolute inset-0 animate-vault-lightning-3 opacity-50" />
              </div>
            </div>
            
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/60 to-card/20 pointer-events-none" />
            
            {/* Content */}
            <div className="relative z-10 px-5 pt-8 pb-5">
              {/* Artist Image */}
              <div className="relative w-28 h-28 mb-4 mx-auto">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 blur-md opacity-60" />
                <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-card shadow-2xl">
                  <img
                    src={artistProfile.avatar_url || artist1}
                    alt={artistProfile.artist_name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              
              {/* Artist Info */}
              <div className="text-center">
                <h1 className="font-display text-2xl font-bold text-foreground mb-1">
                  {artistProfile.artist_name}
                </h1>
                
                {/* Genre Badge */}
                {artistProfile.genre && (
                  <p className="text-muted-foreground text-sm font-body mb-3">
                    {artistProfile.genre}
                  </p>
                )}
                
                {/* Exclusive Artist Badge with Crown */}
                <div className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/20 border border-primary/40">
                  <div className="absolute -top-3 -left-1.5">
                    <div className="absolute inset-0 w-6 h-6 bg-amber-400/40 rounded-full blur-md -translate-x-0.5 translate-y-0.5" />
                    <Crown 
                      className="relative w-5 h-5 text-amber-400 rotate-[-20deg]" 
                      style={{ 
                        filter: 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.8)) drop-shadow(0 0 15px rgba(251, 191, 36, 0.5))' 
                      }} 
                    />
                  </div>
                  <span 
                    className="text-primary text-xs font-display uppercase tracking-wider"
                    style={{ textShadow: '0 0 10px hsl(var(--primary) / 0.5)' }}
                  >
                    Exclusive Artist
                  </span>
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Bio Section */}
          {artistProfile.bio && (
            <GlowCard className="p-5 mb-6">
              <h3 className="font-display text-xs uppercase tracking-widest text-primary mb-3">
                About
              </h3>
              <p className="text-muted-foreground text-sm font-body leading-relaxed">
                {artistProfile.bio}
              </p>
            </GlowCard>
          )}

          {/* Exclusive Music Section */}
          <section className="mb-6">
            {/* Section Header with Crown */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <h2 
                  className="font-display text-lg uppercase tracking-wider font-semibold"
                  style={{ 
                    color: 'hsl(var(--primary))',
                    textShadow: '0 0 15px hsl(var(--primary) / 0.4)' 
                  }}
                >
                  Exclusive Music
                </h2>
                <div className="absolute -top-3 -left-3">
                  <div className="absolute inset-0 w-5 h-5 bg-amber-400/40 rounded-full blur-sm" />
                  <Crown 
                    className="relative w-4 h-4 text-amber-400 rotate-[-20deg]" 
                    style={{ 
                      filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.8))' 
                    }} 
                  />
                </div>
              </div>
            </div>

            {/* Track List */}
            {tracks.length === 0 ? (
              <GlowCard className="p-8 text-center">
                <Music className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm font-body">
                  No exclusive tracks yet.
                </p>
              </GlowCard>
            ) : (
              <div className="space-y-3">
                {tracks.map((track) => (
                  <ExclusiveTrackCard
                    key={track.id}
                    id={track.id}
                    title={track.title}
                    artworkUrl={track.artwork_url}
                    duration={track.duration}
                    likeCount={trackLikes[track.id]?.count || 0}
                    isLiked={trackLikes[track.id]?.isLiked || false}
                    isSelected={selectedTrack?.id === track.id}
                    canLike={hasVaultAccess && viewerContext === "fan"}
                    onSelect={() => handleSelectTrack(track)}
                    onLike={() => handleLikeToggle(track.id)}
                    onShare={() => handleShare(track)}
                    fallbackImage={artist1}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Vault Music Player */}
          <section className="mb-6">
            <VaultMusicPlayer
              track={selectedTrack ? {
                id: selectedTrack.id,
                title: selectedTrack.title,
                artist: artistProfile.artist_name,
                artworkUrl: selectedTrack.artwork_url || artist1,
                audioUrl: selectedTrack.full_audio_url || "",
              } : null}
              hasVaultAccess={hasVaultAccess}
              onAccessDenied={() => {
                toast.error("Enter the Vault to stream exclusive music.");
                navigate("/vault/enter");
              }}
              onPlay={handlePlay}
            />
          </section>
        </div>
      </main>

      {/* Share Modal */}
      <ShareExclusiveTrackModal
        open={isShareModalOpen}
        onOpenChange={setIsShareModalOpen}
        track={shareTrack ? {
          id: shareTrack.id,
          title: shareTrack.title,
          artistName: artistProfile.artist_name,
          artworkUrl: shareTrack.artwork_url,
        } : null}
        currentUserEmail={user?.email || undefined}
        artistId={artistId || ""}
      />
    </div>
  );
};

export default ArtistProfilePage;
