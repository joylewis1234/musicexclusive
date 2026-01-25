import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Home, Music, Inbox as InboxIcon } from "lucide-react";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { usePlayer, tracksLibrary } from "@/contexts/PlayerContext";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface SharedTrackItem {
  id: string;
  sender_id: string;
  sender_name: string;
  artist_id: string;
  track_id: string;
  note: string | null;
  created_at: string;
  listened_at: string | null;
}

const FanInbox = () => {
  const navigate = useNavigate();
  const { playTrack } = usePlayer();
  const [sharedTracks, setSharedTracks] = useState<SharedTrackItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock current user email (in real app, this would come from auth)
  const currentUserEmail = "alex@example.com";

  useEffect(() => {
    fetchSharedTracks();
  }, []);

  const fetchSharedTracks = async () => {
    setIsLoading(true);

    // First, get the current user's vault member ID
    const { data: currentUser } = await supabase
      .from("vault_members")
      .select("id")
      .eq("email", currentUserEmail)
      .maybeSingle();

    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    // Fetch shared tracks for this recipient
    const { data: tracks, error } = await supabase
      .from("shared_tracks")
      .select(`
        id,
        sender_id,
        artist_id,
        track_id,
        note,
        created_at,
        listened_at
      `)
      .eq("recipient_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching shared tracks:", error);
      setIsLoading(false);
      return;
    }

    // Get sender names
    const senderIds = [...new Set(tracks?.map((t) => t.sender_id) || [])];
    const { data: senders } = await supabase
      .from("vault_members")
      .select("id, display_name")
      .in("id", senderIds);

    const senderMap = new Map(senders?.map((s) => [s.id, s.display_name]) || []);

    const enrichedTracks: SharedTrackItem[] = (tracks || []).map((track) => ({
      ...track,
      sender_name: senderMap.get(track.sender_id) || "Unknown",
    }));

    setSharedTracks(enrichedTracks);
    setIsLoading(false);
  };

  const handleListen = async (item: SharedTrackItem) => {
    const track = tracksLibrary[item.track_id];
    if (track) {
      // Mark as listened if not already
      if (!item.listened_at) {
        await supabase
          .from("shared_tracks")
          .update({ listened_at: new Date().toISOString() })
          .eq("id", item.id);
        
        // Update local state
        setSharedTracks((prev) =>
          prev.map((t) =>
            t.id === item.id ? { ...t, listened_at: new Date().toISOString() } : t
          )
        );
      }
      
      playTrack(track);
      navigate(`/player/${item.track_id}`);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: false }) + " ago";
    } catch {
      return "";
    }
  };

  const getTrackInfo = (trackId: string, artistId: string) => {
    const track = tracksLibrary[trackId];
    return {
      title: track?.title || "Unknown Track",
      artist: track?.artist || artistId,
    };
  };

  const isEmpty = sharedTracks.length === 0 && !isLoading;

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
        {isLoading ? (
          <div className="py-16 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : isEmpty ? (
          /* Empty State */
          <section className="flex flex-col items-center justify-center py-16 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-muted/20 border border-border flex items-center justify-center mb-6">
              <InboxIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center text-sm leading-relaxed max-w-[280px]">
              No shared music yet.
              <br />
              When Vault friends share tracks, they'll appear here.
            </p>
          </section>
        ) : (
          /* Inbox List */
          <section className="space-y-3 animate-fade-in" style={{ animationDelay: "100ms" }}>
            {sharedTracks.map((item, index) => {
              const trackInfo = getTrackInfo(item.track_id, item.artist_id);
              return (
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
                            From {item.sender_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatTimeAgo(item.created_at)}
                          </span>
                        </div>
                        
                        <h3 className="font-display text-sm font-semibold text-foreground truncate mb-0.5">
                          {trackInfo.title}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {trackInfo.artist}
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
                        onClick={() => handleListen(item)}
                      >
                        <Music className="w-3.5 h-3.5" />
                        Listen
                      </Button>
                    </div>
                  </div>
                </GlowCard>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
};

export default FanInbox;
