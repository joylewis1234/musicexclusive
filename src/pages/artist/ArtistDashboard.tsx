import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ExclusiveSongCard, ExclusiveSong } from "@/components/artist/ExclusiveSongCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAuthedUserOrFail, withTimeout } from "@/utils/authHelpers";
import { 
  Home, 
  Upload, 
  LogOut,
  Mic2,
  Music,
  Loader2,
  Wallet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus
} from "lucide-react";

type PayoutStatus = "not_connected" | "pending" | "connected";

const ArtistDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const abortRef = useRef<AbortController | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [artistName, setArtistName] = useState("Artist");
  const [artistProfileId, setArtistProfileId] = useState<string | null>(null);
  const [songs, setSongs] = useState<ExclusiveSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [songsLoading, setSongsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [songsError, setSongsError] = useState<string | null>(null);
  const [payoutStatus, setPayoutStatus] = useState<PayoutStatus>("not_connected");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const verifyConnectStatus = useCallback(async () => {
    if (!userId) {
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
  }, [userId, navigate]);

  const fetchArtistData = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setIsLoading(true);
    setSongsLoading(true);
    setLoadError(null);
    setSongsError(null);

    try {
      const authResult = await withTimeout(getAuthedUserOrFail(signal), 10000);

      if (authResult.ok === false) {
        setLoadError(authResult.error);
        toast.error(authResult.error);
        setIsLoading(false);
        setSongsLoading(false);
        return;
      }

      const { user } = authResult;
      setUserId(user.id);

      if (signal.aborted) return;

      const { data: profile, error: profileError } = await supabase
        .from("artist_profiles")
        .select("id, artist_name, payout_status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (signal.aborted) return;

      if (profileError) {
        console.error("[Dashboard] Error fetching profile:", profileError);
        setLoadError(profileError.message);
        toast.error("Could not load profile: " + profileError.message);
        setIsLoading(false);
        setSongsLoading(false);
        return;
      }

      if (!profile) {
        setLoadError("Artist profile not found. Please set up your profile first.");
        setIsLoading(false);
        setSongsLoading(false);
        return;
      }

      setArtistName(profile.artist_name);
      setArtistProfileId(profile.id);
      if (profile.payout_status) {
        setPayoutStatus(profile.payout_status as PayoutStatus);
      }

      setIsLoading(false);

      if (signal.aborted) return;

      const { data: songData, error: songsError } = await supabase
        .from("tracks")
        .select("id, title, artwork_url, full_audio_url, genre, created_at, preview_start_seconds, duration, status")
        .eq("artist_id", profile.id)
        .neq("status", "disabled")
        .order("created_at", { ascending: false });

      if (signal.aborted) return;

      if (songsError) {
        console.error("[Dashboard] Error fetching songs:", songsError);
        setSongsError(songsError.message);
        toast.error("Could not load songs: " + songsError.message);
      } else {
        setSongs(songData || []);
      }
    } catch (err: any) {
      if (err?.name === "AbortError" || signal?.aborted) return;
      console.error("[Dashboard] Fetch error:", err);
      const msg = err?.message || "Could not load dashboard data";
      setLoadError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
      setSongsLoading(false);
    }
  }, []);

  const hasFetchedRef = useRef(false);
  const isStripeReturnRef = useRef(false);

  useEffect(() => {
    const connectParam = searchParams.get("connect");
    if (connectParam === "success" || connectParam === "refresh") {
      isStripeReturnRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    fetchArtistData();

    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [fetchArtistData]);

  useEffect(() => {
    if (isLoading) return;
    
    const connectParam = searchParams.get("connect");
    if (connectParam === "success") {
      toast.success("Verifying payout account...");
      verifyConnectStatus().then(() => {
        toast.success("Payout account connected!");
      });
      setSearchParams({}, { replace: true });
    } else if (connectParam === "refresh") {
      toast.info("Please complete the payout setup.");
      setSearchParams({}, { replace: true });
    }
  }, [isLoading, searchParams, setSearchParams, verifyConnectStatus]);

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSongDeleted = () => {
    fetchArtistData();
  };

  const handleConnectPayout = async () => {
    if (!userId) {
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

  if (loadError && !isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 pb-24">
        <GlowCard className="p-8 max-w-sm w-full text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="font-display text-lg font-semibold mb-2">
            {loadError === "Please sign in again" ? "Session Expired" : "Load Error"}
          </h2>
          <p className="text-muted-foreground text-sm mb-6">{loadError}</p>

          {loadError === "Please sign in again" ? (
            <Button onClick={() => navigate("/artist/login")} className="w-full">
              Go to Login
            </Button>
          ) : (
            <Button onClick={fetchArtistData} className="w-full gap-2">
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          )}
        </GlowCard>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-24">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/20">
        <div className="container max-w-lg md:max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic2 className="w-5 h-5 text-primary" />
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
              Dashboard
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all duration-200"
              aria-label="Go home"
            >
              <Home className="w-5 h-5" />
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-lg md:max-w-3xl mx-auto space-y-6">
          
          {/* Welcome Header */}
          <GlowCard variant="elevated" glowColor="gradient" className="p-6 text-center animate-fade-in">
            <h1 className="font-display text-xl md:text-2xl font-bold text-foreground mb-3">
              Welcome, {artistName}
            </h1>
            
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
                      ? "Setup in progress"
                      : "Connect payouts"
                    }
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {payoutStatus === "connected" 
                      ? "Ready to receive earnings"
                      : payoutStatus === "pending"
                      ? "Finish bank & ID verification"
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
                      "Continue"
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

          {/* Your Exclusive Songs Section */}
          <section 
            className="space-y-4 animate-fade-in"
            style={{ animationDelay: '100ms' }}
          >
            <div className="flex items-center justify-between">
              <SectionHeader title="Your Exclusive Songs" align="left" />
              <Button
                size="sm"
                className="rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 shadow-lg shadow-primary/20"
                onClick={() => navigate("/artist/upload")}
              >
                <Plus className="w-4 h-4 mr-1" />
                Upload
              </Button>
            </div>

            {songsLoading ? (
              <GlowCard variant="flat" className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
              </GlowCard>
            ) : songsError ? (
              <GlowCard variant="flat" className="p-8 text-center">
                <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-4">{songsError}</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="rounded-xl gap-2"
                  onClick={fetchArtistData}
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </Button>
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
                    style={{ animationDelay: `${150 + index * 50}ms` }}
                  >
                    <ExclusiveSongCard 
                      song={song}
                      artistId={artistProfileId || ""}
                      onDeleted={handleSongDeleted}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Floating Upload Button (Mobile) */}
      <button
        onClick={() => navigate("/artist/upload")}
        className="fixed bottom-24 right-4 md:hidden w-14 h-14 rounded-full bg-gradient-to-r from-primary to-purple-600 shadow-lg shadow-primary/30 flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform duration-200 z-30"
        aria-label="Upload new track"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};

export default ArtistDashboard;
