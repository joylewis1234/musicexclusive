import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { 
  ArrowLeft, 
  Home, 
  Play, 
  Pause, 
  Music, 
  Edit2,
  Share2,
  Heart,
  Crown,
  Headphones,
  Compass
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLikeCount } from "@/hooks/useLikeCount";
import artist1 from "@/assets/artist-1.jpg";
import vaultPortal from "@/assets/vault-portal.png";

interface TrackData {
  id: string;
  title: string;
  genre: string | null;
  artwork_url: string | null;
  full_audio_url: string | null;
  duration: number;
  created_at: string;
}

interface ArtistProfile {
  artist_name: string;
  genre: string | null;
  bio: string | null;
  avatar_url: string | null;
}

// Demo/fallback data
const demoProfile: ArtistProfile = {
  artist_name: "Maranda B.",
  genre: "Hip Hop / R&B",
  bio: "Atlanta-based artist blending soulful R&B with modern hip-hop production. Known for emotionally charged lyrics and innovative sound design. Featured on major playlists and collaborating with top producers.",
  avatar_url: null,
};

const demoTracks: TrackData[] = [
  {
    id: "demo-1",
    title: "Midnight Memories",
    genre: "R&B",
    artwork_url: null,
    full_audio_url: null,
    duration: 204,
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-2",
    title: "Golden Hour",
    genre: "Hip Hop",
    artwork_url: null,
    full_audio_url: null,
    duration: 242,
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-3",
    title: "Echoes",
    genre: "R&B",
    artwork_url: null,
    full_audio_url: null,
    duration: 225,
    created_at: new Date().toISOString(),
  },
];

// Component to show like count for each track
const TrackLikeCount = ({ trackId }: { trackId: string }) => {
  const likeCount = useLikeCount(trackId);
  // Show demo likes for demo tracks
  const displayCount = trackId.startsWith("demo-") 
    ? (trackId === "demo-1" ? 142 : trackId === "demo-2" ? 89 : 56)
    : likeCount;
  return (
    <span className="flex items-center gap-1 text-purple-400">
      <Heart className="w-3.5 h-3.5 fill-purple-400" />
      <span className="text-xs font-medium">{displayCount}</span>
    </span>
  );
};

const ArtistProfilePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [tracks, setTracks] = useState<TrackData[]>([]);
  const [artistProfile, setArtistProfile] = useState<ArtistProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalLikes, setTotalLikes] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) {
        // No user logged in - show demo data
        setArtistProfile(demoProfile);
        setTracks(demoTracks);
        setTotalLikes(287);
        setIsLoading(false);
        return;
      }

      try {
        // Fetch artist profile
        const { data: profile } = await supabase
          .from("artist_profiles")
          .select("artist_name, genre, bio, avatar_url")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          setArtistProfile(profile);
        } else {
          // Fallback to application
          const { data: application } = await supabase
            .from("artist_applications")
            .select("artist_name, genres")
            .eq("contact_email", user.email)
            .maybeSingle();

          if (application) {
            setArtistProfile({
              artist_name: application.artist_name,
              genre: application.genres,
              bio: null,
              avatar_url: null,
            });
          }
        }

        // Fetch tracks
        const { data: trackData } = await supabase
          .from("tracks")
          .select("id, title, genre, artwork_url, full_audio_url, duration, created_at")
          .eq("artist_id", user.email)
          .not("genre", "like", "[DELETED]%")
          .not("genre", "like", "[DISABLED]%")
          .order("created_at", { ascending: false });

        if (trackData && trackData.length > 0) {
          setTracks(trackData);

          // Fetch total likes for all tracks
          const trackIds = trackData.map(t => t.id);
          if (trackIds.length > 0) {
            const { count } = await supabase
              .from("track_likes")
              .select("*", { count: "exact", head: true })
              .in("track_id", trackIds);
            
            setTotalLikes(count || 0);
          }
        } else {
          // Use demo data if no real tracks
          setTracks(demoTracks);
          setTotalLikes(287); // Demo total likes
        }

        // Use demo profile if no real profile
        if (!profile && !artistProfile) {
          setArtistProfile(demoProfile);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        // Fallback to demo data on error
        setArtistProfile(demoProfile);
        setTracks(demoTracks);
        setTotalLikes(287);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = "";
      }
    };
  }, [audioElement]);

  const handlePlayPause = (track: TrackData) => {
    if (!track.full_audio_url) return;

    if (playingTrackId === track.id) {
      // Pause current track
      audioElement?.pause();
      setPlayingTrackId(null);
    } else {
      // Stop previous track
      if (audioElement) {
        audioElement.pause();
      }
      
      // Play new track
      const audio = new Audio(track.full_audio_url);
      audio.play();
      audio.onended = () => setPlayingTrackId(null);
      setAudioElement(audio);
      setPlayingTrackId(track.id);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-lg md:max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/artist/dashboard")}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
            Artist Profile
          </span>

          <button
            onClick={() => navigate("/")}
            className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Go home"
          >
            <Home className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-lg md:max-w-xl mx-auto">
          
          {/* Artist Header Card - With Vault Portal Background */}
          <GlowCard className="p-0 overflow-hidden mb-6 relative">
            {/* Vault Portal Background */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Animated glow orbs behind */}
              <div className="absolute inset-0 bg-secondary/20 blur-[60px] rounded-full scale-75 animate-pulse" />
              <div className="absolute inset-0 bg-accent/15 blur-[50px] rounded-full scale-90 animate-pulse [animation-delay:1s]" />
              <div className="absolute inset-0 bg-primary/15 blur-[55px] rounded-full scale-80 animate-pulse [animation-delay:0.5s]" />
              
              {/* Vault portal image with breathing glow */}
              <img
                src={vaultPortal}
                alt=""
                className="w-[120%] h-[120%] object-contain vault-glow opacity-40"
              />
              
              {/* Inner energy lightning effect */}
              <div className="absolute inset-[15%] rounded-full overflow-hidden mix-blend-screen">
                <div className="absolute inset-0 animate-vault-lightning-1 opacity-50" />
                <div className="absolute inset-0 animate-vault-lightning-2 opacity-40" />
                <div className="absolute inset-0 animate-vault-lightning-3 opacity-30" />
              </div>
            </div>
            
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/80 to-card/40 pointer-events-none" />
            
            {/* Profile Content - positioned above vault */}
            <div className="relative z-10 px-5 pt-8 pb-5">
            
              {/* Artist Image - Larger and More Prominent */}
              <div className="relative w-28 h-28 mb-4 mx-auto">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 blur-md opacity-60" />
                <div className="relative w-28 h-28 rounded-full overflow-hidden border-4 border-card shadow-2xl">
                  <img
                    src={artistProfile?.avatar_url || artist1}
                    alt={artistProfile?.artist_name || "Artist"}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Headphones Badge */}
                <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center shadow-lg">
                  <Headphones className="w-4 h-4 text-white" />
                </div>
              </div>
              {/* Artist Info */}
              <div className="flex items-start justify-between mt-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-foreground mb-1">
                    {artistProfile?.artist_name || "Artist"}
                  </h1>
                  <p className="text-muted-foreground text-sm font-body mb-3">
                    {artistProfile?.genre || "Music"}
                  </p>
                  {/* Exclusive Badge with Crown */}
                  <div className="relative inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/40">
                    <div className="absolute -top-2.5 -left-1">
                      <div className="absolute inset-0 w-5 h-5 bg-amber-400/40 rounded-full blur-md -translate-x-0.5 translate-y-0.5" />
                      <Crown className="relative w-4 h-4 text-amber-400 rotate-[-20deg]" style={{ filter: 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.8)) drop-shadow(0 0 12px rgba(251, 191, 36, 0.5))' }} />
                    </div>
                    <span className="text-primary text-xs font-display uppercase tracking-wider">
                      Exclusive Artist
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1"
                  onClick={() => navigate("/artist/profile/edit")}
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              </div>
            </div>
          </GlowCard>

          {/* Bio Section */}
          {artistProfile?.bio && (
            <GlowCard className="p-5 mb-6">
              <h3 className="font-display text-xs uppercase tracking-widest text-primary mb-3">
                About
              </h3>
              <p className="text-muted-foreground text-sm font-body leading-relaxed">
                {artistProfile.bio}
              </p>
            </GlowCard>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <GlowCard className="p-4 text-center">
              <p className="font-display text-2xl font-bold text-foreground">
                {tracks.length}
              </p>
              <p className="text-muted-foreground text-xs font-body">Tracks</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <div className="flex items-center justify-center gap-1">
                <Heart className="w-5 h-5 text-purple-400 fill-purple-400" style={{ filter: 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.6))' }} />
                <p className="font-display text-2xl font-bold text-purple-400" style={{ textShadow: '0 0 10px rgba(168, 85, 247, 0.5)' }}>
                  {totalLikes}
                </p>
              </div>
              <p className="text-muted-foreground text-xs font-body">Likes</p>
            </GlowCard>
          </div>

          {/* Back to Discovery Button */}
          <Button
            variant="outline"
            className="w-full mb-6"
            onClick={() => navigate("/discovery")}
          >
            <Compass className="w-4 h-4 mr-2" />
            Back to Discovery
          </Button>

          {/* Music Section - Full Tracks Only, No Upload Button */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader title="Exclusive Music" align="left" />
            </div>

            <div className="space-y-3">
              {tracks.map((track) => (
                <GlowCard key={track.id} className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Cover Art */}
                    <div className="relative flex-shrink-0">
                      <img
                        src={track.artwork_url || artist1}
                        alt={track.title}
                        className="w-14 h-14 rounded-lg object-cover"
                      />
                    </div>

                    {/* Play Button */}
                    <button
                      onClick={() => handlePlayPause(track)}
                      disabled={!track.full_audio_url}
                      className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors flex-shrink-0 disabled:opacity-50"
                    >
                      {playingTrackId === track.id ? (
                        <Pause className="w-5 h-5 text-primary" />
                      ) : (
                        <Play className="w-5 h-5 text-primary ml-0.5" />
                      )}
                    </button>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-display text-sm font-semibold text-foreground truncate">
                          {track.title}
                        </h4>
                        {/* Exclusive Badge with Crown */}
                        <div className="relative px-2 py-0.5 rounded-full bg-primary/10 flex-shrink-0">
                          <div className="absolute -top-2 -left-0.5">
                            <div className="absolute inset-0 w-4 h-4 bg-amber-400/40 rounded-full blur-sm -translate-x-0.5 translate-y-0.5" />
                            <Crown className="relative w-3 h-3 text-amber-400 rotate-[-20deg]" style={{ filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.8)) drop-shadow(0 0 8px rgba(251, 191, 36, 0.5))' }} />
                          </div>
                          <span className="text-primary text-[10px] font-display uppercase tracking-wider">
                            Exclusive
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDuration(track.duration)}</span>
                        <span>•</span>
                        <TrackLikeCount trackId={track.id} />
                      </div>
                    </div>

                    {/* Share Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center">
                        <Share2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </GlowCard>
              ))}

              {tracks.length === 0 && (
                <GlowCard className="p-8 text-center">
                  <Music className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm font-body mb-4">
                    No tracks uploaded yet
                  </p>
                  <Button
                    size="sm"
                    onClick={() => navigate("/artist/dashboard")}
                  >
                    Go to Dashboard to Upload
                  </Button>
                </GlowCard>
              )}
            </div>
          </div>

          {/* Shareable Status Info */}
          <div className="bg-muted/20 border border-border/30 rounded-xl p-4 text-center">
            <Share2 className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-muted-foreground text-xs font-body">
              Your tracks can be shared by fans inside the Vault, helping you reach more listeners.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ArtistProfilePage;
