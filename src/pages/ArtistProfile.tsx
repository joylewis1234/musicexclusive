import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { ChevronLeft, Home, Play, Share2, Mic2, Loader2, Music, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ShareTrackModal } from "@/components/ShareTrackModal";
import { usePlayer, Track } from "@/contexts/PlayerContext";
import { supabase } from "@/integrations/supabase/client";

import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";

// Fallback images for artists
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
  preview_audio_url: string | null;
  artwork_url: string | null;
  created_at: string;
}

interface ArtistData {
  id: string;
  name: string;
  genre: string;
  bio: string;
  imageUrl: string;
}

const ArtistProfile = () => {
  const navigate = useNavigate();
  const { artistId } = useParams<{ artistId: string }>();
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = usePlayer();
  
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [tracks, setTracks] = useState<DbTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedTrackForShare, setSelectedTrackForShare] = useState<Track | null>(null);

  useEffect(() => {
    const fetchArtistData = async () => {
      if (!artistId) return;

      setIsLoading(true);
      try {
        // Fetch artist application data
        const { data: application } = await supabase
          .from("artist_applications")
          .select("artist_name, genres, contact_email")
          .eq("contact_email", artistId)
          .maybeSingle();

        if (application) {
          setArtist({
            id: artistId,
            name: application.artist_name,
            genre: application.genres,
            bio: `Exclusive artist on Music Exclusive, bringing you premium ${application.genres} content before anyone else.`,
            imageUrl: artistImages.default,
          });

          // Fetch tracks for this artist
          const { data: trackData } = await supabase
            .from("tracks")
            .select("*")
            .eq("artist_id", artistId)
            .not("genre", "like", "[DISABLED]%")
            .order("created_at", { ascending: false });

          if (trackData) {
            setTracks(trackData);
          }
        } else {
          // Fallback for demo artists
          const demoArtists: Record<string, ArtistData> = {
            nova: { id: "nova", name: "NOVA", genre: "Electronic", bio: "Pioneering the future of electronic music.", imageUrl: artist1 },
            aura: { id: "aura", name: "AURA", genre: "R&B", bio: "Smooth vocals and ethereal production.", imageUrl: artist2 },
            echo: { id: "echo", name: "ECHO", genre: "Indie", bio: "Raw, authentic indie sound.", imageUrl: artist3 },
          };
          
          if (demoArtists[artistId]) {
            setArtist(demoArtists[artistId]);
          }
        }
      } catch (error) {
        console.error("Error fetching artist:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtistData();
  }, [artistId]);

  const convertToPlayerTrack = (track: DbTrack): Track => ({
    id: track.id,
    title: track.title,
    artist: artist?.name || "Unknown Artist",
    album: track.genre || "Exclusive Release",
    artwork: track.artwork_url || artist?.imageUrl || artistImages.default,
    duration: track.duration,
  });

  const handlePlayTrack = (track: DbTrack) => {
    const playerTrack = convertToPlayerTrack(track);
    
    if (currentTrack?.id === track.id) {
      togglePlayPause();
    } else {
      playTrack(playerTrack);
    }
  };

  const handleShare = (track: DbTrack) => {
    setSelectedTrackForShare(convertToPlayerTrack(track));
    setShareModalOpen(true);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
      {/* Hero Section */}
      <div className="relative h-[45vh] min-h-[320px]">
        <img
          src={artist.imageUrl}
          alt={artist.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        {/* Navigation Header */}
        <header className="absolute top-0 left-0 right-0 z-10 px-4 py-6">
          <div className="w-full max-w-md mx-auto flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wider">Back</span>
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wider">Home</span>
            </button>
          </div>
        </header>

        {/* Artist Info Overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-6">
          <div className="w-full max-w-md mx-auto">
            {/* Exclusive Artist Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/40 mb-3">
              <Mic2 className="w-3.5 h-3.5 text-primary" />
              <span className="text-primary text-xs font-display uppercase tracking-wider">
                Exclusive Artist
              </span>
            </div>
            
            <h1 
              className="font-display text-4xl md:text-5xl font-bold text-foreground tracking-wide mb-2"
              style={{ textShadow: "0 2px 20px rgba(0, 0, 0, 0.5)" }}
            >
              {artist.name}
            </h1>
            <p className="text-primary text-sm font-display uppercase tracking-wider">
              {artist.genre}
            </p>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 px-4 py-6">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Bio */}
          <section className="animate-fade-in">
            <p className="text-muted-foreground text-sm leading-relaxed">
              {artist.bio}
            </p>
          </section>

          {/* Tracks */}
          <section className="animate-fade-in" style={{ animationDelay: "100ms" }}>
            <h2 
              className="font-display text-sm uppercase tracking-wider text-foreground mb-4"
              style={{ textShadow: "0 0 15px rgba(255, 255, 255, 0.2)" }}
            >
              Exclusive Releases
            </h2>
            
            {tracks.length === 0 ? (
              <GlowCard className="p-6 text-center">
                <Music className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  No exclusive tracks available yet.
                </p>
              </GlowCard>
            ) : (
              <div className="space-y-3">
                {tracks.map((track) => {
                  const isCurrentTrack = currentTrack?.id === track.id;
                  const isTrackPlaying = isCurrentTrack && isPlaying;
                  
                  return (
                    <GlowCard key={track.id} glowColor="primary" hover>
                      <div className="p-4 flex items-center gap-4">
                        {/* Play Button */}
                        <button
                          onClick={() => handlePlayTrack(track)}
                          className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                            isCurrentTrack 
                              ? "bg-primary/30 border-2 border-primary" 
                              : "bg-primary/20 border border-primary/30 hover:bg-primary/30"
                          }`}
                          style={{
                            boxShadow: isCurrentTrack ? "0 0 20px hsl(var(--primary) / 0.5)" : undefined,
                          }}
                        >
                          {isTrackPlaying ? (
                            <Pause className="w-5 h-5 text-primary" />
                          ) : (
                            <Play className="w-5 h-5 ml-0.5 text-primary" />
                          )}
                        </button>

                        {/* Track Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-display text-sm font-semibold text-foreground truncate">
                              {track.title}
                            </p>
                            <StatusBadge variant="exclusive" size="sm">
                              Exclusive
                            </StatusBadge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDuration(track.duration)}
                          </p>
                        </div>

                        {/* Share Button */}
                        <button
                          onClick={() => handleShare(track)}
                          className="flex-shrink-0 w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center hover:bg-muted/50 transition-colors"
                          aria-label="Share track"
                        >
                          <Share2 className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </GlowCard>
                  );
                })}
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

      {/* Bottom spacing for nav */}
      <div className="h-20" />

      {/* Share Modal */}
      <ShareTrackModal
        open={shareModalOpen}
        onOpenChange={(open) => {
          setShareModalOpen(open);
          if (!open) setSelectedTrackForShare(null);
        }}
        track={selectedTrackForShare}
      />
    </div>
  );
};

export default ArtistProfile;
