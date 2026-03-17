import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ExclusiveSongCard, ExclusiveSong } from "@/components/artist/ExclusiveSongCard";
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_URL, SUPABASE_ANON_KEY, EDGE_FUNCTIONS_URL } from "@/config/supabase";
import { toast } from "sonner";
import { getAuthedUserOrFail, withTimeout } from "@/utils/authHelpers";
import { ArtistTutorial } from "@/components/artist/tutorial/ArtistTutorial";
import ArtistInviteSection from "@/components/artist/ArtistInviteSection";
import AgreementStatusCard from "@/components/artist/AgreementStatusCard";
import { ChartsEligibilityCard } from "@/components/artist/ChartsEligibilityCard";
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

const MAX_RETRY_DURATION = 60_000;
const RETRY_INTERVAL = 2_000;

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

  // Retry state
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<number | null>(null);
  const retryStartRef = useRef<number>(0);
  const [retryExpired, setRetryExpired] = useState(false);
  const [showForceRefresh, setShowForceRefresh] = useState(false);
  const loadingStartRef = useRef<number | null>(null);

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

  // Poll for finalizing tracks (status !== "ready" or missing URLs)
  const pollIntervalRef = useRef<number | null>(null);
  const pollStartRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current !== null) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const startPollingForFinalizingTracks = useCallback((profileId: string, currentSongs: ExclusiveSong[]) => {
    const hasFinalizing = currentSongs.some(
      s => s.status === "processing" || s.status === "uploading" || (s.status !== "ready" && s.status !== "failed")
    );
    if (!hasFinalizing) return;

    stopPolling();
    pollStartRef.current = Date.now();

    pollIntervalRef.current = window.setInterval(async () => {
      if (Date.now() - pollStartRef.current > 120000) {
        stopPolling();
        return;
      }
      try {
        const anonKey = SUPABASE_ANON_KEY;
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 30000);
        const resp = await fetch(
          `${SUPABASE_URL}/rest/v1/tracks?artist_id=eq.${profileId}&status=neq.disabled&order=created_at.desc`,
          {
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${session.access_token}`,
              Accept: "application/json",
            },
            signal: controller.signal,
          }
        );
        clearTimeout(timer);
        if (!resp.ok) return;
        const rows = await resp.json();
        if (!Array.isArray(rows)) return;

        const filtered = rows.filter((r: any) => r.status !== "uploading");

        // For any "processing" tracks with keys, call verify-r2-objects and transition to ready
        for (const track of filtered) {
          if (track.status === "processing" && track.full_audio_key && track.artwork_key) {
            try {
              const verifyResp = await fetch(
                `${EDGE_FUNCTIONS_URL}/functions/v1/verify-r2-objects`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${session.access_token}`,
                    apikey: anonKey,
                  },
                  body: JSON.stringify({
                    fullKey: track.full_audio_key,
                    artworkKey: track.artwork_key,
                    previewKey: track.preview_audio_key || undefined,
                  }),
                }
              );
              const verifyData = await verifyResp.json();
              if (verifyData?.ok) {
                await fetch(`${SUPABASE_URL}/rest/v1/tracks?id=eq.${track.id}`, {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                    Prefer: "return=minimal",
                    apikey: anonKey,
                    Authorization: `Bearer ${session.access_token}`,
                  },
                  body: JSON.stringify({ status: "ready" }),
                });
                track.status = "ready";
                console.log("[Dashboard] ✅ Track verified & set to ready:", track.id.slice(0, 8));
              }
            } catch (verifyErr) {
              console.warn("[Dashboard] verify-r2-objects poll failed (retrying):", verifyErr);
            }
          }
        }

        setSongs(filtered);
        const stillFinalizing = filtered.some(
          (s: any) => s.status === "processing" || (s.status !== "ready" && s.status !== "failed")
        );
        if (!stillFinalizing) stopPolling();
      } catch { /* ignore poll errors */ }
    }, 3000);
  }, [stopPolling]);

  // Cleanup polling on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  const waitForSessionReady = useCallback(async () => {
    const start = Date.now();
    while (Date.now() - start < 6000) {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) return data.session;
      await new Promise((r) => setTimeout(r, 300));
    }
    return null;
  }, []);

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
      // Early session guard: if no session yet, set soft error so auto-retry keeps trying
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.access_token) {
        setLoadError("Connection slow — retrying…");
        setIsLoading(false);
        setSongsLoading(false);
        return;
      }

      // Auth check — no hard 10s timeout that blocks the page. 
      // Use 30s timeout; on failure show retry, don't block.
      let authResult: { ok: true; session: any; user: any } | { ok: false; error: string };
      try {
        authResult = await withTimeout(getAuthedUserOrFail(signal), 30000);
      } catch (timeoutErr: any) {
        setLoadError("Connection slow — retrying…");
        setIsLoading(false);
        setSongsLoading(false);
        return;
      }

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

      // Success — reset retry state
      retryCountRef.current = 0;
      setRetryExpired(false);

      setIsLoading(false);

      if (signal.aborted) return;

      // Fetch tracks via REST with AbortController for Android Chrome resilience
      try {
        const anonKey = SUPABASE_ANON_KEY;
        const token = authResult.ok ? authResult.session.access_token : "";
        const trackController = new AbortController();
        const trackTimer = setTimeout(() => trackController.abort(), 30000);

        const resp = await fetch(
          `${SUPABASE_URL}/rest/v1/tracks?artist_id=eq.${profile.id}&status=neq.disabled&order=created_at.desc`,
          {
            headers: {
              apikey: anonKey,
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            signal: trackController.signal,
          }
        );
        clearTimeout(trackTimer);

        if (!resp.ok) {
          throw new Error(`Tracks fetch failed (${resp.status})`);
        }

        const rows = await resp.json();
        // Filter out uploading status on client side
        const songData = (rows || []).filter((r: any) => r.status !== "uploading");
        setSongs(songData);
        setSongsLoading(false);

        // Start polling if any tracks are still finalizing
        startPollingForFinalizingTracks(profile.id, songData);
      } catch (trackErr: any) {
        if (trackErr?.name === "AbortError") {
          setSongsError("Track list request timed out. Tap Retry.");
        } else {
          console.error("[Dashboard] Error fetching songs:", trackErr);
          setSongsError(trackErr?.message || "Could not load songs");
        }
        setSongsLoading(false);
      }
    } catch (err: any) {
      const isAbortError = 
        err?.name === "AbortError" || 
        signal?.aborted ||
        err?.message?.toLowerCase().includes("abort") ||
        err?.message?.toLowerCase().includes("cancelled") ||
        err?.message?.toLowerCase().includes("canceled");
      
      if (isAbortError) {
        console.log("[Dashboard] Request aborted (navigation or unmount)");
        return;
      }
      
      console.error("[Dashboard] Fetch error:", err);
      const msg = err?.message || "Could not load dashboard data";
      setLoadError(msg);
    } finally {
      if (!abortRef.current?.signal.aborted) {
        setIsLoading(false);
        setSongsLoading(false);
      }
    }
  }, [startPollingForFinalizingTracks]);

  // Auto-retry effect: retries every 2s for up to 60s when loadError is set
  useEffect(() => {
    if (retryTimerRef.current) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    // Don't retry auth errors
    if (!loadError || loadError === "Please sign in again") return;

    // Set retry start time only on first retry
    if (retryCountRef.current === 0) {
      retryStartRef.current = Date.now();
      setRetryExpired(false);
    }

    const elapsed = Date.now() - retryStartRef.current;
    if (elapsed >= MAX_RETRY_DURATION) {
      setRetryExpired(true);
      return;
    }

    retryTimerRef.current = window.setTimeout(() => {
      retryCountRef.current += 1;
      fetchArtistData();
    }, RETRY_INTERVAL);

    return () => {
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [loadError, fetchArtistData]);

  // Cleanup retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, []);

  // Force-refresh banner: show after 10s of loading or when loadError/fromUpload
  useEffect(() => {
    if (isLoading && !loadingStartRef.current) {
      loadingStartRef.current = Date.now();
    }
    if (!isLoading) {
      loadingStartRef.current = null;
      setShowForceRefresh(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowForceRefresh(true);
    }, 10000);

    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (loadError || searchParams.get("fromUpload") === "1") {
      const timer = setTimeout(() => setShowForceRefresh(true), 10000);
      if (loadError) setShowForceRefresh(true);
      return () => clearTimeout(timer);
    }
  }, [loadError, searchParams]);

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

  // Clear fromUpload flag and force a fresh fetch after upload redirect
  useEffect(() => {
    if (searchParams.get("fromUpload") === "1") {
      let cancelled = false;

      (async () => {
        setIsLoading(true);
        const session = await waitForSessionReady();
        if (cancelled) return;

        if (!session) {
          setLoadError("Could not connect. Please check your network and refresh.");
          setIsLoading(false);
          return;
        }

        await fetchArtistData();
        if (!cancelled) {
          setSearchParams({}, { replace: true });
        }
      })();

      return () => { cancelled = true; };
    }
  }, [searchParams, setSearchParams, fetchArtistData, waitForSessionReady]);

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

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Non-blocking banners */}
      {loadError && loadError !== "Please sign in again" && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4">
          <div className="flex items-center gap-2 rounded-full bg-background/95 border border-border shadow px-4 py-2 text-sm">
            <span aria-hidden="true">⚠️</span>
            <span>
              {retryExpired
                ? "Could not connect. Please check your network and refresh."
                : "Connection slow — retrying…"}
            </span>
          </div>
        </div>
      )}

      {loadError === "Please sign in again" && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4">
          <div className="flex items-center gap-2 rounded-full bg-background/95 border border-border shadow px-4 py-2 text-sm">
            <span aria-hidden="true">⚠️</span>
            <span>Session expired —</span>
            <button
              type="button"
              onClick={() => navigate("/artist/login")}
              className="underline font-bold"
            >
              Log in again
            </button>
          </div>
        </div>
      )}

      {isLoading && !loadError && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 px-4">
          <div className="flex items-center gap-2 rounded-full bg-background/95 border border-border shadow px-4 py-2 text-sm">
            <span aria-hidden="true">⏳</span>
            <span>Connecting…</span>
          </div>
        </div>
      )}

      {showForceRefresh && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-card border border-border shadow-[0_0_30px_hsl(var(--primary)/0.15)] backdrop-blur-sm px-5 py-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary animate-spin" />
              <span className="text-muted-foreground text-sm">Upload complete?</span>
            </div>
            <button
              type="button"
              onClick={() => {
                window.location.href =
                  window.location.pathname + "?_t=" + Date.now();
              }}
              className="w-full py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-bold tracking-wide uppercase transition-all hover:shadow-[var(--shadow-cyan-md)] active:scale-[0.97]"
            >
              Refresh to see your upload
            </button>
          </div>
        </div>
      )}

      {/* Tutorial System */}
      <ArtistTutorial userId={userId} />
      
      {/* Floating Header */}
      <header className="fixed top-0 left-0 right-0 z-30 px-4 py-4">
        <div className="w-full max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-background/80 backdrop-blur-md border border-border/50 text-foreground/80 hover:text-foreground hover:bg-background/90 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
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

          {/* Agreement Status */}
          <AgreementStatusCard />

          {/* Charts Eligibility */}
          {artistProfileId && (
            <ChartsEligibilityCard artistProfileId={artistProfileId} />
          )}

          {/* Invite Fans Section */}
          {artistProfileId && (
            <ArtistInviteSection artistProfileId={artistProfileId} />
          )}

          {/* Your Exclusive Songs Section */}
          <section className="space-y-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Your Uploads
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
            ) : songs.length === 0 && !loadError ? (
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
                      artistName={artistName}
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
