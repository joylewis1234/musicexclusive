import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ExclusiveSongCard, ExclusiveSong } from "@/components/artist/ExclusiveSongCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getAuthedUserOrFail, withTimeout } from "@/utils/authHelpers";
import { ArtistTutorial } from "@/components/artist/tutorial/ArtistTutorial";
import { 
  Upload, 
  LogOut,
  Music,
  Loader2,
  Wallet,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Crown,
  ChevronLeft,
} from "lucide-react";

type PayoutStatus = "not_connected" | "pending" | "connected";

const ArtistDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const abortRef = useRef<AbortController | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [artistName, setArtistName] = useState("Artist");
  const [artistProfileId, setArtistProfileId] = useState<string | null>(null);
  const [artistAvatarUrl, setArtistAvatarUrl] = useState<string | null>(null);
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
        .select("id, artist_name, payout_status, avatar_url")
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
      setArtistAvatarUrl(profile.avatar_url);
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

  // Reset fetch ref on mount to ensure fresh data on each login
  useEffect(() => {
    hasFetchedRef.current = false;
  }, []);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    // Small delay to let auth state settle after login redirect
    const timer = setTimeout(() => {
      fetchArtistData();
    }, 50);

    return () => {
      clearTimeout(timer);
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
        <div className="p-8 max-w-sm w-full text-center rounded-2xl bg-card/50 border border-border/30">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="font-display text-lg font-semibold mb-2">
            {loadError === "Please sign in again" ? "Session Expired" : "Load Error"}
          </h2>
          <p className="text-muted-foreground text-sm mb-6">{loadError}</p>

          {loadError === "Please sign in again" ? (
            <Button onClick={() => navigate("/artist/login")} className="w-full rounded-full">
              Go to Login
            </Button>
          ) : (
            <Button onClick={fetchArtistData} className="w-full gap-2 rounded-full">
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pb-24">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'hsl(280, 80%, 70%)' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Tutorial System */}
      <ArtistTutorial userId={userId} />
      
      {/* Floating Header */}
      <header className="fixed top-0 left-0 right-0 z-30 px-4 py-4">
        <div className="w-full max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-background/80 backdrop-blur-md border border-border/50 text-foreground/80 hover:text-foreground hover:bg-background/90 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Home</span>
          </button>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="rounded-full bg-background/80 backdrop-blur-md border border-border/50 text-muted-foreground hover:text-foreground gap-1.5 px-3"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative pt-20 pb-6 px-5">
        <div className="w-full max-w-lg mx-auto">
          {/* Artist Avatar */}
          <div className="relative w-24 h-24 mb-4">
            <div 
              className="absolute -inset-1 rounded-full blur-sm"
              style={{ 
                background: 'linear-gradient(135deg, hsl(280, 80%, 50%), hsl(45, 90%, 55%))' 
              }}
            />
            {artistAvatarUrl ? (
              <img
                src={artistAvatarUrl}
                alt={artistName}
                className="relative w-full h-full rounded-full object-cover border-2 border-background"
              />
            ) : (
              <div className="relative w-full h-full rounded-full bg-muted flex items-center justify-center border-2 border-background">
                <Music className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Welcome text */}
          <h1
            className="font-display text-3xl font-bold text-foreground tracking-tight mb-2"
            style={{ textShadow: "0 2px 20px rgba(0, 0, 0, 0.5)" }}
          >
            Welcome, {artistName}
          </h1>

          {/* Exclusive Artist Badge */}
          <div className="relative inline-flex items-center gap-2 mb-5">
            <div 
              className="relative px-3 py-1.5 rounded-full"
              style={{
                background: 'hsla(280, 80%, 50%, 0.2)',
                boxShadow: '0 0 12px hsla(280, 80%, 50%, 0.3), inset 0 0 8px hsla(280, 80%, 50%, 0.1)'
              }}
            >
              <Crown 
                className="absolute -top-2 -left-1 w-4 h-4 rotate-[-15deg]"
                style={{
                  color: 'hsl(45, 90%, 55%)',
                  filter: 'drop-shadow(0 0 4px hsla(45, 90%, 55%, 0.8)) drop-shadow(0 0 8px hsla(45, 90%, 50%, 0.4))'
                }}
                fill="hsl(45, 90%, 55%)"
              />
              <span 
                className="text-xs font-display uppercase tracking-widest pl-2"
                style={{ color: 'hsl(280, 80%, 70%)' }}
              >
                Exclusive Artist
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-5 pb-12">
        <div className="w-full max-w-lg mx-auto space-y-6">
          
          {/* Payout Account Status */}
          <div 
            className="p-4 rounded-2xl border animate-fade-in"
            style={{
              background: 'hsla(0, 0%, 100%, 0.02)',
              borderColor: payoutStatus === "connected" 
                ? 'hsla(142, 70%, 45%, 0.3)' 
                : payoutStatus === "pending" 
                ? 'hsla(45, 90%, 50%, 0.3)' 
                : 'hsla(280, 80%, 50%, 0.2)',
            }}
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
                    onClick={handleConnectPayout}
                    disabled={isConnecting || isVerifying}
                    className="rounded-full"
                    style={{
                      background: payoutStatus === "pending" 
                        ? 'hsla(45, 90%, 50%, 0.9)' 
                        : 'hsl(280, 80%, 50%)',
                      color: payoutStatus === "pending" ? 'hsl(0, 0%, 0%)' : 'white',
                    }}
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
                  className="rounded-full w-9 h-9 p-0"
                  title="Refresh payout status"
                >
                  <RefreshCw className={`w-4 h-4 ${isVerifying ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>

          {/* Your Exclusive Songs Section */}
          <section className="space-y-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Your Songs
                </h2>
                {/* Exclusive badge */}
                <div 
                  className="relative px-2.5 py-1 rounded-full"
                  style={{
                    background: 'hsla(280, 80%, 50%, 0.12)',
                  }}
                >
                  <Crown 
                    className="absolute -top-1.5 -left-0.5 w-3 h-3 rotate-[-12deg]"
                    style={{
                      color: 'hsl(45, 90%, 55%)',
                      filter: 'drop-shadow(0 0 3px hsla(45, 90%, 55%, 0.8))'
                    }}
                    fill="hsl(45, 90%, 55%)"
                  />
                  <span 
                    className="text-[10px] font-display uppercase tracking-wider pl-1"
                    style={{ color: 'hsl(280, 80%, 70%)' }}
                  >
                    Exclusive
                  </span>
                </div>
              </div>
              <Button
                data-tutorial="upload-button"
                size="sm"
                className="rounded-full gap-1.5 px-4"
                style={{
                  background: 'hsl(280, 80%, 50%)',
                  boxShadow: '0 0 15px hsla(280, 80%, 50%, 0.3)',
                }}
                onClick={() => navigate("/artist/upload")}
              >
                <Plus className="w-4 h-4" />
                Upload
              </Button>
            </div>

            {songsLoading ? (
              <div className="p-8 text-center rounded-xl bg-muted/20 border border-border/30">
                <Loader2 className="w-6 h-6 animate-spin mx-auto" style={{ color: 'hsl(280, 80%, 70%)' }} />
              </div>
            ) : songsError ? (
              <div className="p-8 text-center rounded-xl bg-muted/20 border border-border/30">
                <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-4">{songsError}</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="rounded-full gap-2"
                  onClick={fetchArtistData}
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </Button>
              </div>
            ) : songs.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-muted/20 border border-border/30">
                <Music className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm mb-4">
                  You haven't uploaded any songs yet.
                </p>
                <Button 
                  size="sm"
                  className="rounded-full"
                  style={{
                    background: 'hsl(280, 80%, 50%)',
                  }}
                  onClick={() => navigate("/artist/upload")}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Your First Song
                </Button>
              </div>
            ) : (
              <div data-tutorial="songs-list" className="space-y-2">
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
        className="fixed bottom-24 right-4 md:hidden w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:scale-105 active:scale-95 transition-transform duration-200 z-30"
        style={{
          background: 'linear-gradient(135deg, hsl(280, 80%, 50%), hsl(265, 90%, 60%))',
          boxShadow: '0 0 20px hsla(280, 80%, 50%, 0.5)',
        }}
        aria-label="Upload new track"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};

export default ArtistDashboard;
