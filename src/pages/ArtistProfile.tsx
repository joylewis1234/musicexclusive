import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, Home, Loader2, Music, LayoutDashboard, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArtistHeader } from "@/components/profile/ArtistHeader";
import { TrackListItem } from "@/components/profile/TrackListItem";
import { VaultMusicPlayer } from "@/components/player/VaultMusicPlayer";
import { VaultAccessGate } from "@/components/profile/VaultAccessGate";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";

const artistImages: Record<string, string> = {
  default: artist1,
  artist1,
  artist2,
  artist3,
};

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
  
  // Refs for scroll-to-track behavior
  const trackRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const hasScrolledToTrack = useRef(false);

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
        // Fetch artist profile first - try by user_id first, then by profile id
        let profile = null;
        let artistUserId = artistId;
        
        // Try fetching by user_id
        const { data: profileByUserId } = await supabase
          .from("artist_profiles")
          .select("id, user_id, artist_name, genre, bio, avatar_url")
          .eq("user_id", artistId)
          .maybeSingle();
        
        if (profileByUserId) {
          profile = profileByUserId;
          artistUserId = profileByUserId.user_id;
        } else {
          // Try fetching by profile id
          const { data: profileById } = await supabase
            .from("artist_profiles")
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
            bio: profile.bio || `Exclusive artist on Music Exclusive.`,
            imageUrl: profile.avatar_url || artistImages.default,
          });
        } else {
          // Fallback to artist_applications
          const { data: application } = await supabase
            .from("artist_applications")
            .select("artist_name, genres, contact_email")
            .eq("contact_email", artistId)
            .maybeSingle();

          if (application) {
            setArtist({
              id: artistId,
              userId: "",
              name: application.artist_name,
              genre: application.genres,
              bio: `Exclusive artist on Music Exclusive, bringing you premium ${application.genres} content.`,
              imageUrl: artistImages.default,
            });
          } else {
            // Demo artists fallback
            const demoArtists: Record<string, ArtistData> = {
              nova: { id: "nova", userId: "", name: "NOVA", genre: "Electronic", bio: "Pioneering the future of electronic music.", imageUrl: artist1 },
              aura: { id: "aura", userId: "", name: "AURA", genre: "R&B", bio: "Smooth vocals and ethereal production.", imageUrl: artist2 },
              echo: { id: "echo", userId: "", name: "ECHO", genre: "Indie", bio: "Raw, authentic indie sound.", imageUrl: artist3 },
            };
            if (demoArtists[artistId]) {
              setArtist(demoArtists[artistId]);
            }
          }
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

  // Determine view context based on role and ownership
  useEffect(() => {
    if (!artist) return;
    
    if (role === "fan") {
      setViewContext("fan");
    } else if (role === "artist") {
      if (user?.id === artist.userId) {
        setViewContext("artist-own");
      } else {
        setViewContext("artist-other");
      }
    } else {
      setViewContext("fan"); // Default for unauthenticated
    }
  }, [role, user?.id, artist]);

  // Scroll to and highlight selected track from URL param
  useEffect(() => {
    if (selectedTrackId && tracks.length > 0 && !hasScrolledToTrack.current) {
      const trackElement = trackRefs.current[selectedTrackId];
      if (trackElement) {
        // Scroll with offset for header
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
      artworkUrl: track.artwork_url || artist?.imageUrl || artistImages.default,
      audioUrl: track.full_audio_url || "",
    });
  };

  // Navigation handlers based on context
  const handleBack = () => {
    if (fromRoute) {
      navigate(fromRoute);
    } else if (viewContext === "fan" || viewContext === "artist-other") {
      navigate("/discovery");
    } else {
      navigate("/artist/dashboard");
    }
  };

  const handleSecondaryNav = () => {
    if (viewContext === "fan") {
      navigate("/fan/dashboard");
    }
  };

  const getBackLabel = () => {
    if (viewContext === "artist-own") {
      return "Dashboard";
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
      {/* Navigation Header - Context Aware */}
      <header className="fixed top-0 left-0 right-0 z-20 px-4 py-4 bg-gradient-to-b from-background/90 to-transparent">
        <div className="w-full max-w-md mx-auto flex items-center justify-between">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider">{getBackLabel()}</span>
          </button>
          
          {/* Right side navigation - context dependent */}
          {viewContext === "fan" ? (
            <button
              onClick={handleSecondaryNav}
              className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors"
              aria-label="Go to Dashboard"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wider">Dashboard</span>
            </button>
          ) : viewContext === "artist-own" ? (
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors"
              aria-label="Go home"
            >
              <Home className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wider">Home</span>
            </button>
          ) : (
            <button
              onClick={() => navigate("/discovery")}
              className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors"
              aria-label="Discovery"
            >
              <Compass className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wider">Discover</span>
            </button>
          )}
        </div>
      </header>

      {/* Artist Header */}
      <ArtistHeader
        name={artist.name}
        genre={artist.genre}
        bio={artist.bio}
        imageUrl={artist.imageUrl}
      />

      {/* Content */}
      <div className="flex-1 px-4 py-6">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Music Player */}
          <section className="animate-fade-in">
            <VaultMusicPlayer
              track={selectedTrack}
              hasVaultAccess={hasVaultAccess}
              onAccessDenied={() => setShowAccessGate(true)}
            />
          </section>

          {/* Exclusive Music Section */}
          <section className="animate-fade-in" style={{ animationDelay: "100ms" }}>
            <h2
              className="font-display text-sm uppercase tracking-wider text-foreground mb-4"
              style={{ textShadow: "0 0 15px rgba(255, 255, 255, 0.2)" }}
            >
              Exclusive Music
            </h2>

            {tracks.length === 0 ? (
              <div className="rounded-xl bg-card/50 p-6 text-center border border-primary/10">
                <Music className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  No exclusive tracks available yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {tracks.map((track) => (
                  <TrackListItem
                    key={track.id}
                    ref={(el) => { trackRefs.current[track.id] = el; }}
                    track={{
                      id: track.id,
                      title: track.title,
                      artworkUrl: track.artwork_url,
                    }}
                    fanId={fanId}
                    hasVaultAccess={hasVaultAccess}
                    isSelected={selectedTrack?.id === track.id}
                    isHighlighted={selectedTrackId === track.id}
                    onSelect={() => handleSelectTrack(track)}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Discover More CTA */}
          <section className="pt-4 animate-fade-in" style={{ animationDelay: "200ms" }}>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/discovery")}
            >
              Discover More Music
            </Button>
          </section>
        </div>
      </div>

      {/* Bottom spacing */}
      <div className="h-20" />

      {/* Vault Access Gate Modal */}
      {showAccessGate && (
        <VaultAccessGate onClose={() => setShowAccessGate(false)} />
      )}
    </div>
  );
};

export default ArtistProfile;
