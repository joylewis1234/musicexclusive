import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TrackManagementCard, Track } from "@/components/artist/TrackManagementCard";
import EarningsDashboard from "@/components/artist/EarningsDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Home, 
  Upload, 
  Pencil,
  LogOut,
  Mic2,
  Music,
  Loader2,
  Wallet,
  CheckCircle2,
  AlertCircle,
  RefreshCw
} from "lucide-react";

type PayoutStatus = "not_connected" | "pending" | "connected";

const ArtistDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const [artistName, setArtistName] = useState("Artist");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus>("not_connected");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyConnectStatus = useCallback(async () => {
    if (!user) return;
    
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-connect-status");
      
      if (error) {
        console.error("Error verifying connect status:", error);
        return;
      }
      
      if (data?.status) {
        setPayoutStatus(data.status as PayoutStatus);
      }
    } catch (error) {
      console.error("Error verifying connect status:", error);
    } finally {
      setIsVerifying(false);
    }
  }, [user]);

  const fetchArtistData = useCallback(async () => {
    if (!user?.email) return;

    try {
      // Fetch artist application for name
      const { data: application } = await supabase
        .from("artist_applications")
        .select("artist_name")
        .eq("contact_email", user.email)
        .maybeSingle();

      if (application) {
        setArtistName(application.artist_name);
      }

      // Fetch artist profile for payout status
      const { data: profile } = await supabase
        .from("artist_profiles")
        .select("payout_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.payout_status) {
        setPayoutStatus(profile.payout_status as PayoutStatus);
      }

      // Fetch tracks - using email as artist_id
      const { data: trackData } = await supabase
        .from("tracks")
        .select("id, title, genre, created_at, preview_audio_url, full_audio_url")
        .eq("artist_id", user.email)
        .order("created_at", { ascending: false });

      if (trackData) {
        // Determine status based on dates and disabled flag
        const tracksWithStatus: Track[] = trackData.map((track) => {
          const isDisabled = track.genre?.startsWith("[DISABLED]");
          const genre = isDisabled ? track.genre?.replace("[DISABLED] ", "") : track.genre;
          
          return {
            ...track,
            genre,
            status: isDisabled ? "disabled" : "exclusive",
            exclusive_weeks: 3, // Default 3 weeks
          };
        });
        setTracks(tracksWithStatus);
      }
    } catch (error) {
      console.error("Error fetching artist data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Handle connect return from Stripe
  useEffect(() => {
    const connectParam = searchParams.get("connect");
    if (connectParam === "success") {
      toast.success("Verifying payout account...");
      verifyConnectStatus().then(() => {
        toast.success("Payout account connected!");
      });
      // Clear the URL parameter
      setSearchParams({});
    } else if (connectParam === "refresh") {
      toast.info("Please complete the payout setup.");
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, verifyConnectStatus]);

  useEffect(() => {
    fetchArtistData();
  }, [fetchArtistData]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleTrackUpdated = () => {
    // Refresh tracks list
    fetchArtistData();
  };

  const handleConnectPayout = async () => {
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-connect-account", {
        body: { returnOrigin: window.location.origin }
      });
      
      if (error) {
        toast.error("Failed to start payout setup. Please try again.");
        console.error("Connect error:", error);
        return;
      }
      
      if (data?.url) {
        // Redirect to Stripe Connect onboarding in new tab (better mobile support)
        window.open(data.url, "_blank");
        toast.info("Complete the setup in the new tab, then return here.");
      } else {
        toast.error("Failed to get onboarding link.");
      }
    } catch (error) {
      console.error("Error connecting payout:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-lg md:max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic2 className="w-5 h-5 text-accent" />
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
              Dashboard
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Go home"
            >
              <Home className="w-5 h-5" />
            </button>
            <button
              onClick={handleSignOut}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-lg md:max-w-xl mx-auto">
          
          {/* 1. Welcome Header */}
          <GlowCard className="p-6 mb-6 text-center">
            <h1 className="font-display text-xl md:text-2xl font-bold text-foreground mb-3">
              Welcome to Music Exclusive
            </h1>
            
            {/* Exclusive Artist Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 mb-4">
              <Mic2 className="w-4 h-4 text-primary" />
              <span className="text-primary text-sm font-display uppercase tracking-wider">
                Exclusive Artist
              </span>
            </div>
            
            <p className="text-muted-foreground text-sm font-body leading-relaxed max-w-xs mx-auto">
              Release your music early to fans inside the Vault.
            </p>
          </GlowCard>

          {/* Payout Account Status Card */}
          <GlowCard className="p-5 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  payoutStatus === "connected" 
                    ? "bg-green-500/20 text-green-400" 
                    : payoutStatus === "pending"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {payoutStatus === "connected" ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : payoutStatus === "pending" ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <Wallet className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {payoutStatus === "connected" 
                      ? "Payout account connected" 
                      : payoutStatus === "pending"
                      ? "Action required"
                      : "Payout account not connected"
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payoutStatus === "connected" 
                      ? "Ready to receive earnings"
                      : payoutStatus === "pending"
                      ? "Stripe requires additional information"
                      : "Connect to receive your earnings"
                    }
                  </p>
                </div>
              </div>
              
              {payoutStatus !== "connected" && (
                <Button
                  size="sm"
                  variant={payoutStatus === "pending" ? "destructive" : "default"}
                  onClick={handleConnectPayout}
                  disabled={isConnecting || isVerifying}
                >
                  {isConnecting || isVerifying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : payoutStatus === "pending" ? (
                    "Fix Now"
                  ) : (
                    "Connect Payout Account"
                  )}
                </Button>
              )}
              
              {/* Refresh status button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  verifyConnectStatus();
                  toast.info("Checking payout status...");
                }}
                disabled={isVerifying}
                className="ml-2"
                title="Refresh payout status"
              >
                <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </GlowCard>

          {/* 2. Primary Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            <Button 
              size="lg"
              className="w-full h-14"
              onClick={() => navigate("/artist/upload")}
            >
              <Upload className="w-5 h-5 mr-2" />
              Upload New Track
            </Button>

            <Button 
              size="lg"
              variant="secondary"
              className="w-full h-14"
              onClick={() => navigate("/artist/profile/edit")}
            >
              <Pencil className="w-5 h-5 mr-2" />
              Edit Artist Profile
            </Button>
          </div>

          {/* 3. Releases Overview */}
          <div className="mb-4">
            <SectionHeader title="Your Exclusive Releases" align="left" />
          </div>

          {isLoading ? (
            <GlowCard className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
            </GlowCard>
          ) : tracks.length === 0 ? (
            <GlowCard className="p-8 text-center">
              <Music className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm mb-4">
                You haven't uploaded any tracks yet.
              </p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/artist/upload")}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Your First Track
              </Button>
            </GlowCard>
          ) : (
            <div className="space-y-3">
              {tracks.map((track) => (
                <TrackManagementCard 
                  key={track.id} 
                  track={track} 
                  onTrackUpdated={handleTrackUpdated}
                />
              ))}
            </div>
          )}

          {/* Earnings Dashboard */}
          <div className="mt-8">
            <EarningsDashboard />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ArtistDashboard;
