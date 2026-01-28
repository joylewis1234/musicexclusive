import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ExclusiveSongCard, ExclusiveSong } from "@/components/artist/ExclusiveSongCard";
import EarningsDashboard from "@/components/artist/EarningsDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  RefreshCw,
  User
} from "lucide-react";

type PayoutStatus = "not_connected" | "pending" | "connected";

const ArtistDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, signOut } = useAuth();
  const [artistName, setArtistName] = useState("Artist");
  const [songs, setSongs] = useState<ExclusiveSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus>("not_connected");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyConnectStatus = useCallback(async () => {
    if (!user) {
      toast.error("Please log in to check payout status.");
      navigate("/artist/login");
      return;
    }
    
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

      // Fetch songs - using email as artist_id
      const { data: songData } = await supabase
        .from("tracks")
        .select("id, title, artwork_url, full_audio_url, genre, created_at")
        .eq("artist_id", user.email)
        .order("created_at", { ascending: false });

      if (songData) {
        setSongs(songData);
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

  const handleSongDeleted = () => {
    // Refresh songs list
    fetchArtistData();
  };

  const handleConnectPayout = async () => {
    if (!user) {
      toast.error("Please log in to connect your payout account.");
      navigate("/artist/login");
      return;
    }

    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-connect-account", {
        body: { returnOrigin: window.location.origin }
      });
      
      if (error) {
        const msg = (error as any)?.message || "";
        if (msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("missing sub")) {
          toast.error("Your session expired. Please log in again.");
          navigate("/artist/login");
          return;
        }
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/20">
        <div className="container max-w-lg md:max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic2 className="w-5 h-5 text-primary" />
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
              Dashboard
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all duration-200"
              aria-label="Go home"
            >
              <Home className="w-5 h-5" />
            </button>
            <button
              onClick={handleSignOut}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all duration-200"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-lg md:max-w-3xl mx-auto space-y-6">
          
          {/* Tab Navigation */}
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="dashboard" className="gap-2">
                <Mic2 className="w-4 h-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="profile" className="gap-2" onClick={() => navigate("/artist/profile")}>
                <User className="w-4 h-4" />
                My Profile
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard" className="space-y-6">
          
          {/* Welcome Header - fade in */}
          <GlowCard variant="elevated" glowColor="gradient" className="p-6 text-center animate-fade-in">
            <h1 className="font-display text-xl md:text-2xl font-bold text-foreground mb-3">
              Welcome to Music Exclusive
            </h1>
            
            {/* Exclusive Artist Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Mic2 className="w-4 h-4 text-primary" />
              <span className="text-primary text-sm font-display uppercase tracking-wider">
                Exclusive Artist
              </span>
            </div>
            
            <p className="text-muted-foreground text-sm font-body leading-relaxed max-w-sm mx-auto">
              Release your music early to fans inside the Vault.
            </p>
          </GlowCard>

          {/* Payout Account Status Card */}
          <GlowCard 
            variant="flat" 
            glowColor={payoutStatus === "connected" ? "primary" : "subtle"} 
            className="p-5 animate-fade-in"
            style={{ animationDelay: '50ms' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  payoutStatus === "connected" 
                    ? "bg-green-500/10 text-green-400" 
                    : payoutStatus === "pending"
                    ? "bg-amber-500/10 text-amber-400"
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
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {payoutStatus === "connected" 
                      ? "Payout connected" 
                      : payoutStatus === "pending"
                      ? "Action required"
                      : "Connect payouts"
                    }
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {payoutStatus === "connected" 
                      ? "Ready to receive earnings"
                      : payoutStatus === "pending"
                      ? "Complete Stripe setup"
                      : "Receive your earnings"
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {payoutStatus !== "connected" && (
                  <Button
                    size="sm"
                    variant={payoutStatus === "pending" ? "destructive" : "secondary"}
                    onClick={handleConnectPayout}
                    disabled={isConnecting || isVerifying}
                    className="rounded-xl"
                  >
                    {isConnecting || isVerifying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : payoutStatus === "pending" ? (
                      "Fix"
                    ) : (
                      "Connect"
                    )}
                  </Button>
                )}
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    verifyConnectStatus();
                    toast.info("Checking payout status...");
                  }}
                  disabled={isVerifying}
                  className="rounded-xl w-9 h-9 p-0"
                  title="Refresh payout status"
                >
                  <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </GlowCard>

          {/* Primary Actions - 2 column grid on desktop */}
          <div 
            className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-fade-in"
            style={{ animationDelay: '100ms' }}
          >
            {/* Primary CTA - Upload */}
            <Button 
              size="lg"
              className="w-full h-14 rounded-2xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 group"
              onClick={() => navigate("/artist/upload")}
            >
              <Upload className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
              Upload New Track
            </Button>

            {/* Secondary CTA - Edit Profile */}
            <Button 
              size="lg"
              variant="outline"
              className="w-full h-14 rounded-2xl border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
              onClick={() => navigate("/artist/profile/edit")}
            >
              <Pencil className="w-5 h-5 mr-2" />
              Edit Artist Profile
            </Button>
          </div>

          {/* View Profile as Fan */}
          <div 
            className="animate-fade-in"
            style={{ animationDelay: '120ms' }}
          >
            <Button 
              size="lg"
              variant="secondary"
              className="w-full h-12 rounded-2xl"
              onClick={() => navigate(`/artist/view/${user?.id}?view=fan`)}
            >
              <User className="w-5 h-5 mr-2" />
              View My Profile (Fan View)
            </Button>
          </div>

          {/* Your Exclusive Songs Section */}
          <section 
            className="space-y-4 animate-fade-in"
            style={{ animationDelay: '150ms' }}
          >
            <SectionHeader title="Your Exclusive Songs" align="left" />

            {isLoading ? (
              <GlowCard variant="flat" className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
              </GlowCard>
            ) : songs.length === 0 ? (
              <GlowCard variant="flat" className="p-8 text-center">
                <Music className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-4">
                  You haven't uploaded any songs yet.
                </p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="rounded-xl"
                  onClick={() => navigate("/artist/upload")}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Your First Song
                </Button>
              </GlowCard>
            ) : (
              <div className="space-y-3">
                {songs.map((song, index) => (
                  <div 
                    key={song.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${200 + index * 50}ms` }}
                  >
                    <ExclusiveSongCard 
                      song={song}
                      artistId={user?.email || ""}
                      onDeleted={handleSongDeleted}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Earnings Dashboard */}
          <section 
            className="animate-fade-in"
            style={{ animationDelay: '250ms' }}
          >
            <EarningsDashboard />
          </section>
          
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default ArtistDashboard;
