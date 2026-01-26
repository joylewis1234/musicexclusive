import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useRef } from "react";
import { ChevronLeft, Home, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { usePlayer, tracksLibrary } from "@/contexts/PlayerContext";

import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";

// Mock artist data
const artistsData: Record<string, {
  id: string;
  name: string;
  genre: string;
  bio: string;
  imageUrl: string;
  tracks: { id: string; title: string; duration: string }[];
}> = {
  nova: {
    id: "nova",
    name: "NOVA",
    genre: "Electronic",
    bio: "Pioneering the future of electronic music with immersive soundscapes and pulsing rhythms.",
    imageUrl: artist1,
    tracks: [
      { id: "1", title: "Midnight Protocol", duration: "3:54" },
      { id: "1", title: "Digital Dreams", duration: "4:12" },
      { id: "1", title: "Neon Pulse", duration: "3:28" },
    ],
  },
  aura: {
    id: "aura",
    name: "AURA",
    genre: "R&B",
    bio: "Smooth vocals and ethereal production create a signature sound that transcends genres.",
    imageUrl: artist2,
    tracks: [
      { id: "2", title: "Velvet Skies", duration: "3:18" },
      { id: "2", title: "Golden Hour", duration: "4:05" },
    ],
  },
  echo: {
    id: "echo",
    name: "ECHO",
    genre: "Indie",
    bio: "Raw, authentic indie sound with introspective lyrics and atmospheric guitar work.",
    imageUrl: artist3,
    tracks: [
      { id: "3", title: "Lost Frequency", duration: "4:27" },
      { id: "3", title: "Signal Fade", duration: "3:45" },
    ],
  },
  pulse: {
    id: "pulse",
    name: "PULSE",
    genre: "Hip-Hop",
    bio: "Hard-hitting beats and conscious lyrics define this rising hip-hop artist.",
    imageUrl: artist1,
    tracks: [
      { id: "1", title: "City Lights", duration: "3:32" },
    ],
  },
  drift: {
    id: "drift",
    name: "DRIFT",
    genre: "Ambient",
    bio: "Ambient textures and floating melodies designed for deep listening experiences.",
    imageUrl: artist2,
    tracks: [
      { id: "2", title: "Horizon", duration: "5:15" },
    ],
  },
  vega: {
    id: "vega",
    name: "VEGA",
    genre: "Pop",
    bio: "Fresh pop sensibility with an edge. Catchy hooks meet thoughtful production.",
    imageUrl: artist3,
    tracks: [
      { id: "3", title: "Starlight", duration: "3:22" },
    ],
  },
};

const ArtistProfile = () => {
  const navigate = useNavigate();
  const { artistId } = useParams<{ artistId: string }>();
  const [searchParams] = useSearchParams();
  const { playTrack } = usePlayer();
  const selectedTrackRef = useRef<HTMLDivElement>(null);

  const artist = artistId ? artistsData[artistId] : null;
  const selectedTrackId = searchParams.get("track");

  // Get sorted tracks with selected track first
  const sortedTracks = artist ? [...artist.tracks].sort((a, b) => {
    if (selectedTrackId) {
      if (a.id === selectedTrackId) return -1;
      if (b.id === selectedTrackId) return 1;
    }
    return 0;
  }) : [];

  const handlePlayTrack = (trackId: string) => {
    const track = tracksLibrary[trackId];
    if (track) {
      playTrack(track);
      navigate(`/player/${trackId}`);
    }
  };


  if (!artist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Artist not found</p>
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
            <StatusBadge variant="exclusive" size="sm" className="mb-3">
              Vault Exclusive
            </StatusBadge>
            <h1 
              className="font-display text-4xl md:text-5xl font-bold text-foreground tracking-wide mb-2"
              style={{
                textShadow: "0 2px 20px rgba(0, 0, 0, 0.5)"
              }}
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
              style={{
                textShadow: "0 0 15px rgba(255, 255, 255, 0.2)"
              }}
            >
              Exclusive Releases
            </h2>
            
            <div className="space-y-3">
              {sortedTracks.map((track, index) => {
                const isSelected = selectedTrackId === track.id;
                return (
                  <div 
                    key={`${track.title}-${index}`}
                    ref={isSelected ? selectedTrackRef : undefined}
                  >
                    <GlowCard 
                      glowColor={isSelected ? "accent" : "primary"} 
                      hover
                    >
                      <button
                        onClick={() => handlePlayTrack(track.id)}
                        className={`w-full p-4 flex items-center justify-between text-left transition-all duration-300 ${
                          isSelected ? "ring-2 ring-accent/60 rounded-xl" : ""
                        }`}
                        style={{
                          boxShadow: isSelected ? "0 0 25px hsl(var(--accent) / 0.25), inset 0 0 15px hsl(var(--accent) / 0.05)" : undefined,
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-display text-sm font-semibold text-foreground truncate">
                              {track.title}
                            </p>
                            {isSelected && (
                              <StatusBadge variant="exclusive" size="sm">
                                Selected
                              </StatusBadge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {track.duration}
                          </p>
                        </div>
                        <div 
                          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                            isSelected 
                              ? "bg-accent/30 border-2 border-accent/60" 
                              : "bg-primary/20 border border-primary/30"
                          }`}
                          style={{
                            boxShadow: isSelected ? "0 0 20px hsl(var(--accent) / 0.5)" : undefined,
                          }}
                        >
                          <Play className={`w-4 h-4 ml-0.5 ${isSelected ? "text-accent" : "text-primary"}`} />
                        </div>
                      </button>
                    </GlowCard>
                  </div>
                );
              })}
            </div>
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
    </div>
  );
};

export default ArtistProfile;
