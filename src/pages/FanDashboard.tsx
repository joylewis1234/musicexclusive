import { useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Home, Sparkles, Play } from "lucide-react";
import { usePlayer, tracksLibrary } from "@/contexts/PlayerContext";
import WalletBalanceCard from "@/components/WalletBalanceCard";

import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";

const featuredArtists = [
  { id: "1", name: "NOVA", genre: "Electronic", imageUrl: artist1 },
  { id: "2", name: "AURA", genre: "R&B", imageUrl: artist2 },
  { id: "3", name: "ECHO", genre: "Indie", imageUrl: artist3 },
  { id: "1", name: "PULSE", genre: "Hip-Hop", imageUrl: artist1 },
  { id: "2", name: "DRIFT", genre: "Ambient", imageUrl: artist2 },
];

const FanDashboard = () => {
  const navigate = useNavigate();
  const { playTrack } = usePlayer();

  const handlePlayArtist = (artistId: string) => {
    const track = tracksLibrary[artistId];
    if (track) {
      playTrack(track);
    }
  };

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

        {/* Wallet Balance Card */}
        <section className="animate-fade-in" style={{ animationDelay: "100ms" }}>
          <WalletBalanceCard />
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
                <button
                  key={`${artist.name}-${index}`}
                  onClick={() => handlePlayArtist(artist.id)}
                  className="relative flex-shrink-0 w-[200px] md:w-[240px] aspect-[3/4] rounded-2xl overflow-hidden group cursor-pointer text-left transition-transform active:scale-[0.98]"
                >
                  <img
                    src={artist.imageUrl}
                    alt={artist.name}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h4 className="font-display text-lg font-bold text-foreground tracking-wide">
                      {artist.name}
                    </h4>
                    <p className="text-primary text-xs font-display uppercase tracking-wider mt-0.5">
                      {artist.genre}
                    </p>
                  </div>
                  <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center text-primary-foreground group-hover:bg-primary group-hover:shadow-cyan-md transition-all duration-300">
                    <Play className="w-5 h-5 ml-0.5" />
                  </div>
                </button>
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
    </div>
  );
};

export default FanDashboard;
