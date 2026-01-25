import { useNavigate } from "react-router-dom";
import { ChevronLeft, Home } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";

import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";

const artists = [
  { id: "nova", name: "NOVA", genre: "Electronic", imageUrl: artist1, hasExclusive: true },
  { id: "aura", name: "AURA", genre: "R&B", imageUrl: artist2, hasExclusive: true },
  { id: "echo", name: "ECHO", genre: "Indie", imageUrl: artist3, hasExclusive: false },
  { id: "pulse", name: "PULSE", genre: "Hip-Hop", imageUrl: artist1, hasExclusive: true },
  { id: "drift", name: "DRIFT", genre: "Ambient", imageUrl: artist2, hasExclusive: false },
  { id: "vega", name: "VEGA", genre: "Pop", imageUrl: artist3, hasExclusive: true },
];

interface DiscoveryArtistCardProps {
  id: string;
  name: string;
  genre: string;
  imageUrl: string;
  hasExclusive: boolean;
  onClick: () => void;
}

const DiscoveryArtistCard = ({ 
  name, 
  genre, 
  imageUrl, 
  hasExclusive, 
  onClick 
}: DiscoveryArtistCardProps) => {
  return (
    <button
      onClick={onClick}
      className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden group text-left transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary/50"
    >
      {/* Background Image */}
      <img
        src={imageUrl}
        alt={name}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
      
      {/* Exclusive Badge */}
      {hasExclusive && (
        <div className="absolute top-3 left-3">
          <StatusBadge variant="exclusive" size="sm">
            Exclusive Release
          </StatusBadge>
        </div>
      )}
      
      {/* Content */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 
          className="font-display text-xl font-bold text-foreground tracking-wide mb-1"
          style={{
            textShadow: "0 2px 10px rgba(0, 0, 0, 0.5)"
          }}
        >
          {name}
        </h3>
        <p className="text-primary text-xs font-display uppercase tracking-wider">
          {genre}
        </p>
      </div>

      {/* Hover glow effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl ring-1 ring-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.2)]" />
    </button>
  );
};

const Discovery = () => {
  const navigate = useNavigate();

  const handleArtistClick = (artistId: string) => {
    navigate(`/artist/${artistId}`);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 py-6">
      {/* Navigation Header */}
      <header className="w-full max-w-2xl mx-auto mb-6 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Back</span>
        </button>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Home</span>
        </button>
      </header>

      <div className="flex-1 w-full max-w-2xl mx-auto">
        {/* Page Header */}
        <section className="text-center mb-8 animate-fade-in">
          <h1 
            className="font-display text-lg md:text-xl uppercase tracking-[0.12em] text-foreground"
            style={{
              textShadow: "0 0 30px rgba(0, 255, 255, 0.4), 0 0 60px rgba(0, 255, 255, 0.2)"
            }}
          >
            Exclusive Music — Before It Hits the World
          </h1>
        </section>

        {/* Artist Grid */}
        <section className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          <div className="grid grid-cols-2 gap-4">
            {artists.map((artist) => (
              <DiscoveryArtistCard
                key={artist.id}
                {...artist}
                onClick={() => handleArtistClick(artist.id)}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Bottom spacing for future mini-player */}
      <div className="h-20" />
    </div>
  );
};

export default Discovery;
