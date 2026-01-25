import { useNavigate } from "react-router-dom";
import { ChevronLeft, Home, Music, Inbox as InboxIcon } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { usePlayer, tracksLibrary } from "@/contexts/PlayerContext";

// Mock shared tracks data
const sharedTracks = [
  { 
    id: "1", 
    senderId: "user-1",
    senderName: "Maya", 
    artistName: "NOVA", 
    trackTitle: "Midnight Protocol",
    trackId: "1",
    note: "You have to hear this one!",
    sharedAt: "2h ago"
  },
  { 
    id: "2", 
    senderId: "user-2",
    senderName: "Jordan", 
    artistName: "AURA", 
    trackTitle: "Velvet Skies",
    trackId: "2",
    note: null,
    sharedAt: "1d ago"
  },
  { 
    id: "3", 
    senderId: "user-3",
    senderName: "Alex", 
    artistName: "ECHO", 
    trackTitle: "Lost Frequency",
    trackId: "3",
    note: "This reminded me of you",
    sharedAt: "3d ago"
  },
];

const FanInbox = () => {
  const navigate = useNavigate();
  const { playTrack } = usePlayer();

  const handleListen = (trackId: string) => {
    const track = tracksLibrary[trackId];
    if (track) {
      playTrack(track);
      navigate(`/player/${trackId}`);
    }
  };

  const isEmpty = sharedTracks.length === 0;

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

      <div className="flex-1 w-full max-w-md mx-auto">
        {/* Page Header */}
        <section className="text-center mb-8 animate-fade-in">
          <h1 
            className="font-display text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground mb-3"
            style={{
              textShadow: "0 0 20px rgba(0, 255, 255, 0.3)"
            }}
          >
            Inbox
          </h1>
          <p className="text-muted-foreground text-sm">
            Music shared with you by friends inside the Vault.
          </p>
        </section>

        {/* Inbox Content */}
        {isEmpty ? (
          /* Empty State */
          <section className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-muted/20 border border-border flex items-center justify-center mb-6">
              <InboxIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center text-sm leading-relaxed max-w-[280px]">
              No shared music yet.
              <br />
              When friends inside the Vault share tracks, they'll appear here.
            </p>
          </section>
        ) : (
          /* Inbox List */
          <section className="space-y-3 animate-fade-in" style={{ animationDelay: "100ms" }}>
            {sharedTracks.map((item, index) => (
              <GlowCard 
                key={item.id} 
                glowColor="accent" 
                hover
                className="animate-fade-in"
                style={{ animationDelay: `${(index + 1) * 50}ms` }}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-primary font-display uppercase tracking-wider">
                          From {item.senderName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {item.sharedAt}
                        </span>
                      </div>
                      
                      <h3 className="font-display text-sm font-semibold text-foreground truncate mb-0.5">
                        {item.trackTitle}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.artistName}
                      </p>
                      
                      {item.note && (
                        <p className="text-xs text-muted-foreground/70 italic mt-2 line-clamp-2">
                          "{item.note}"
                        </p>
                      )}
                    </div>
                    
                    {/* Listen Button */}
                    <Button
                      variant="accent"
                      size="sm"
                      className="flex-shrink-0 gap-1.5"
                      onClick={() => handleListen(item.trackId)}
                    >
                      <Music className="w-3.5 h-3.5" />
                      Listen
                    </Button>
                  </div>
                </div>
              </GlowCard>
            ))}
          </section>
        )}
      </div>
    </div>
  );
};

export default FanInbox;
