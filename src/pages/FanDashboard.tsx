import { useNavigate } from "react-router-dom";
import { GlowCard } from "@/components/ui/GlowCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { ArtistCard } from "@/components/ArtistCard";
import { ChevronLeft, Home, Plus, Sparkles } from "lucide-react";

import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";

const featuredArtists = [
  { name: "NOVA", genre: "Electronic", imageUrl: artist1 },
  { name: "AURA", genre: "R&B", imageUrl: artist2 },
  { name: "ECHO", genre: "Indie", imageUrl: artist3 },
  { name: "PULSE", genre: "Hip-Hop", imageUrl: artist1 },
  { name: "DRIFT", genre: "Ambient", imageUrl: artist2 },
];

const FanDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col px-4 py-6">
      {/* Navigation Header */}
      <header className="w-full max-w-md mx-auto mb-6 flex items-center justify-between">
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

      <div className="flex-1 w-full max-w-md mx-auto space-y-6">
        {/* Vault Status Header */}
        <section className="text-center animate-fade-in">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <h1 
              className="font-display text-xl md:text-2xl uppercase tracking-[0.1em] text-foreground"
              style={{
                textShadow: "0 0 20px rgba(0, 255, 255, 0.4), 0 0 40px rgba(0, 255, 255, 0.2)"
              }}
            >
              You're Inside the Vault
            </h1>
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <StatusBadge variant="vault" size="default">
            Vault Access Active
          </StatusBadge>
        </section>

        {/* Balance Card */}
        <section className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          <GlowCard glowColor="primary" hover={false}>
            <div className="p-6 text-center">
              <p className="text-muted-foreground font-display text-xs uppercase tracking-wider mb-2">
                Listening Balance
              </p>
              <p 
                className="font-display text-4xl md:text-5xl font-bold text-foreground mb-1"
                style={{
                  textShadow: "0 0 30px rgba(0, 255, 255, 0.3)"
                }}
              >
                $25.00
              </p>
              <p className="text-muted-foreground/70 text-xs mb-4">
                Credits available
              </p>
              <Button 
                variant="accent" 
                size="sm"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Credits
              </Button>
            </div>
          </GlowCard>
        </section>

        {/* Discovery Preview */}
        <section className="animate-fade-in" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 
              className="font-display text-sm uppercase tracking-wider text-foreground"
              style={{
                textShadow: "0 0 15px rgba(255, 255, 255, 0.2)"
              }}
            >
              Discover Exclusive Music
            </h2>
          </div>
          
          {/* Horizontal scroll container */}
          <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
            <div className="flex gap-4">
              {featuredArtists.map((artist, index) => (
                <ArtistCard
                  key={`${artist.name}-${index}`}
                  name={artist.name}
                  genre={artist.genre}
                  imageUrl={artist.imageUrl}
                />
              ))}
            </div>
          </div>

          {/* Explore CTA */}
          <div className="mt-4">
            <Button 
              variant="secondary" 
              size="lg" 
              className="w-full"
              onClick={() => navigate("/discovery")}
            >
              Explore All Music
            </Button>
          </div>
        </section>
      </div>

      {/* Bottom spacing for future mini-player */}
      <div className="h-20" />
    </div>
  );
};

export default FanDashboard;
