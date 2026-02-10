import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, LogOut, Music, Inbox as InboxIcon, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { InboxTrackCard } from "@/components/inbox/InboxTrackCard";
import { InboxArtistCard } from "@/components/inbox/InboxArtistCard";

interface SharedTrackItem {
  id: string;
  sender_id: string;
  sender_name: string;
  artist_id: string;
  track_id: string;
  track_title: string;
  track_artist_name: string;
  note: string | null;
  created_at: string;
  listened_at: string | null;
}

interface SharedArtistItem {
  id: string;
  sender_id: string;
  sender_name: string;
  artist_profile_id: string;
  artist_name: string;
  artist_avatar_url: string | null;
  artist_genre: string | null;
  note: string | null;
  created_at: string;
  viewed_at: string | null;
}

const FanInbox = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserEmail = user?.email;

  const [sharedTracks, setSharedTracks] = useState<SharedTrackItem[]>([]);
  const [sharedArtists, setSharedArtists] = useState<SharedArtistItem[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(true);
  const [isLoadingArtists, setIsLoadingArtists] = useState(true);

  useEffect(() => {
    if (currentUserEmail) {
      fetchSharedTracks();
      fetchSharedArtists();
    } else {
      setIsLoadingTracks(false);
      setIsLoadingArtists(false);
    }
  }, [currentUserEmail]);

  const fetchSharedTracks = async () => {
    setIsLoadingTracks(true);

    const { data: currentUser } = await supabase
      .from("vault_members")
      .select("id")
      .eq("email", currentUserEmail!)
      .maybeSingle();

    if (!currentUser) {
      setIsLoadingTracks(false);
      return;
    }

    const { data: tracks, error } = await supabase
      .from("shared_tracks")
      .select("id, sender_id, artist_id, track_id, note, created_at, listened_at")
      .eq("recipient_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching shared tracks:", error);
      setIsLoadingTracks(false);
      return;
    }

    // Get sender names
    const senderIds = [...new Set(tracks?.map((t) => t.sender_id) || [])];
    const { data: senders } = await supabase
      .from("vault_members")
      .select("id, display_name, email")
      .in("id", senderIds);
    const senderMap = new Map(senders?.map((s) => [s.id, { name: s.display_name, email: s.email }]) || []);

    // Get track metadata from DB
    const trackIds = [...new Set(tracks?.map((t) => t.track_id) || [])];
    const { data: trackMeta } = await supabase
      .from("tracks")
      .select("id, title, artist_id")
      .in("id", trackIds);
    const trackMap = new Map(trackMeta?.map((t) => [t.id, t]) || []);

    // Get artist names for tracks
    const artistIds = [...new Set(tracks?.map((t) => t.artist_id) || [])];
    const { data: artistMeta } = await supabase
      .from("public_artist_profiles")
      .select("id, artist_name")
      .in("id", artistIds);
    const artistMap = new Map(artistMeta?.map((a) => [a.id, a.artist_name]) || []);

    const enrichedTracks: SharedTrackItem[] = (tracks || []).map((track) => {
      const sender = senderMap.get(track.sender_id);
      const meta = trackMap.get(track.track_id);
      return {
        ...track,
        sender_name: sender?.name || sender?.email || "A fan",
        track_title: meta?.title || "Unknown Track",
        track_artist_name: artistMap.get(track.artist_id) || "Unknown Artist",
      };
    });

    setSharedTracks(enrichedTracks);
    setIsLoadingTracks(false);
  };

  const fetchSharedArtists = async () => {
    setIsLoadingArtists(true);

    const { data: currentUser } = await supabase
      .from("vault_members")
      .select("id")
      .eq("email", currentUserEmail!)
      .maybeSingle();

    if (!currentUser) {
      setIsLoadingArtists(false);
      return;
    }

    const { data: shares, error } = await supabase
      .from("shared_artist_profiles")
      .select("id, sender_id, artist_profile_id, note, created_at, viewed_at")
      .eq("recipient_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching shared artists:", error);
      setIsLoadingArtists(false);
      return;
    }

    // Get sender names
    const senderIds = [...new Set(shares?.map((s) => s.sender_id) || [])];
    const { data: senders } = await supabase
      .from("vault_members")
      .select("id, display_name, email")
      .in("id", senderIds);
    const senderMap = new Map(senders?.map((s) => [s.id, { name: s.display_name, email: s.email }]) || []);

    // Get artist profile details
    const artistIds = [...new Set(shares?.map((s) => s.artist_profile_id) || [])];
    const { data: artists } = await supabase
      .from("public_artist_profiles")
      .select("id, artist_name, avatar_url, genre")
      .in("id", artistIds);
    const artistMap = new Map(artists?.map((a) => [a.id, a]) || []);

    const enrichedArtists: SharedArtistItem[] = (shares || []).map((share) => {
      const artist = artistMap.get(share.artist_profile_id);
      const sender = senderMap.get(share.sender_id);
      return {
        ...share,
        sender_name: sender?.name || sender?.email || "A fan",
        artist_name: artist?.artist_name || "Unknown Artist",
        artist_avatar_url: artist?.avatar_url || null,
        artist_genre: artist?.genre || null,
      };
    });

    setSharedArtists(enrichedArtists);
    setIsLoadingArtists(false);
  };

  const handleListen = async (item: SharedTrackItem) => {
    if (!item.listened_at) {
      await supabase
        .from("shared_tracks")
        .update({ listened_at: new Date().toISOString() })
        .eq("id", item.id);

      setSharedTracks((prev) =>
        prev.map((t) =>
          t.id === item.id ? { ...t, listened_at: new Date().toISOString() } : t
        )
      );
    }
    // Navigation is handled by InboxTrackCard's handleListenOnProfile
  };

  const handleViewArtist = async (item: SharedArtistItem) => {
    if (!item.viewed_at) {
      await supabase
        .from("shared_artist_profiles")
        .update({ viewed_at: new Date().toISOString() })
        .eq("id", item.id);

      setSharedArtists((prev) =>
        prev.map((a) =>
          a.id === item.id ? { ...a, viewed_at: new Date().toISOString() } : a
        )
      );
    }
  };

  const unreadTracks = sharedTracks.filter((t) => !t.listened_at).length;
  const unreadArtists = sharedArtists.filter((a) => !a.viewed_at).length;

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
          onClick={async () => {
            try {
              await supabase.auth.signOut();
              toast.success("Logged out successfully");
              navigate("/login");
            } catch (error) {
              console.error("Logout error:", error);
              toast.error("Failed to log out");
            }
          }}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Log Out</span>
        </button>
      </header>

      <div className="flex-1 w-full max-w-md mx-auto">
        {/* Page Header */}
        <section className="text-center mb-6 animate-fade-in">
          <h1
            className="font-display text-2xl md:text-3xl font-bold uppercase tracking-wider text-foreground mb-3"
            style={{
              textShadow: "0 0 20px rgba(0, 255, 255, 0.3)",
            }}
          >
            Inbox
          </h1>
          <p className="text-muted-foreground text-sm">
            Music and artists shared with you inside the Vault.
          </p>
        </section>

        {/* Tabs */}
        <Tabs defaultValue="songs" className="w-full animate-fade-in">
          <TabsList className="w-full grid grid-cols-2 bg-muted/20 border border-border/50 rounded-xl h-11 mb-5">
            <TabsTrigger
              value="songs"
              className="font-display text-xs uppercase tracking-wider gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg"
            >
              <Music className="w-3.5 h-3.5" />
              Songs
              {unreadTracks > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-accent/20 border border-accent/40 text-[9px] text-accent font-bold">
                  {unreadTracks}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="artists"
              className="font-display text-xs uppercase tracking-wider gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary rounded-lg"
            >
              <User className="w-3.5 h-3.5" />
              Artists
              {unreadArtists > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-accent/20 border border-accent/40 text-[9px] text-accent font-bold">
                  {unreadArtists}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Songs Tab */}
          <TabsContent value="songs">
            {isLoadingTracks ? (
              <div className="py-16 text-center">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : sharedTracks.length === 0 ? (
              <EmptyState
                icon={<Music className="w-8 h-8 text-muted-foreground" />}
                message="No shared songs yet."
                sub="When Vault friends share tracks, they'll appear here."
              />
            ) : (
              <section className="space-y-3">
                {sharedTracks.map((item, index) => (
                    <InboxTrackCard
                      key={item.id}
                      id={item.id}
                      senderName={item.sender_name}
                      trackTitle={item.track_title}
                      trackArtist={item.track_artist_name}
                      trackId={item.track_id}
                      artistId={item.artist_id}
                      note={item.note}
                      createdAt={item.created_at}
                      listenedAt={item.listened_at}
                      index={index}
                      onListen={() => handleListen(item)}
                    />
                ))}
              </section>
            )}
          </TabsContent>

          {/* Artists Tab */}
          <TabsContent value="artists">
            {isLoadingArtists ? (
              <div className="py-16 text-center">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : sharedArtists.length === 0 ? (
              <EmptyState
                icon={<User className="w-8 h-8 text-muted-foreground" />}
                message="No shared artists yet."
                sub="When Vault friends share artist profiles, they'll appear here."
              />
            ) : (
              <section className="space-y-3">
                {sharedArtists.map((item, index) => (
                  <InboxArtistCard
                    key={item.id}
                    id={item.id}
                    senderName={item.sender_name}
                    artistProfileId={item.artist_profile_id}
                    artistName={item.artist_name}
                    artistAvatarUrl={item.artist_avatar_url}
                    artistGenre={item.artist_genre}
                    note={item.note}
                    createdAt={item.created_at}
                    viewedAt={item.viewed_at}
                    index={index}
                    onView={() => handleViewArtist(item)}
                  />
                ))}
              </section>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

/* Shared empty state component */
const EmptyState = ({
  icon,
  message,
  sub,
}: {
  icon: React.ReactNode;
  message: string;
  sub: string;
}) => (
  <section className="flex flex-col items-center justify-center py-16 animate-fade-in">
    <div className="w-16 h-16 rounded-full bg-muted/20 border border-border flex items-center justify-center mb-6">
      {icon}
    </div>
    <p className="text-muted-foreground text-center text-sm leading-relaxed max-w-[280px]">
      {message}
      <br />
      {sub}
    </p>
  </section>
);

export default FanInbox;
