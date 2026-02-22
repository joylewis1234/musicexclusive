import { useEffect, useState, useCallback } from "react";
import { SignedArtwork } from "@/components/ui/SignedArtwork";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfWeek } from "date-fns";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  TrendingUp,
  Music,
  ChevronLeft,
  LogOut,
  Crown,
  RefreshCw,
} from "lucide-react";
import WeeklyTransparencyReport from "@/components/artist/WeeklyTransparencyReport";
import PayoutSettings from "@/components/artist/PayoutSettings";
import PayoutHistorySection from "@/components/artist/PayoutHistorySection";
import { getAuthedUserOrFail, withTimeout } from "@/utils/authHelpers";
import { toast } from "sonner";

interface TrackEarning {
  track_id: string;
  title: string;
  artwork_url: string | null;
  total_streams: number;
  total_earned: number;
}

const ArtistEarnings = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [payoutStatus, setPayoutStatus] = useState<string>("not_connected");
  
  // Earnings data
  const [trackEarnings, setTrackEarnings] = useState<TrackEarning[]>([]);
  const [totals, setTotals] = useState({
    lifetime: 0,
    pending: 0,
    paid: 0,
    totalPayouts: 0,
  });
  const [lastPayoutDate, setLastPayoutDate] = useState<string | null>(null);

  const fetchEarningsData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setIsLoading(true);
    
    try {
      const authResult = await withTimeout(getAuthedUserOrFail(), 10000);
      if (!authResult.ok) {
        navigate("/artist/login");
        return;
      }
      
      const { user } = authResult;
      setUserId(user.id);
      
      const { data: profile } = await supabase
        .from("artist_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
        
      if (!profile) {
        setIsLoading(false);
        return;
      }
      
      setArtistId(profile.id);
      
      // Fetch stream_ledger entries for this artist (using artist_profiles.id)
      const { data: streamData } = await supabase
        .from("stream_ledger")
        .select("amount_artist, payout_status, created_at")
        .eq("artist_id", profile.id);
      
      // Calculate pending and paid from stream_ledger
      let pendingFromStreams = 0;
      let paidFromStreams = 0;
      
      (streamData || []).forEach((stream) => {
        const amount = Number(stream.amount_artist);
        if (stream.payout_status === "pending") {
          pendingFromStreams += amount;
        } else if (stream.payout_status === "paid") {
          paidFromStreams += amount;
        }
      });
      
      // Fetch payout_batches for history display
      const { data: batchData } = await supabase
        .from("payout_batches")
        .select("*")
        .eq("artist_user_id", user.id)
        .order("week_start", { ascending: false });
      
      const lastPaid = (batchData || []).find((b) => b.status === "paid" && b.paid_at);
      
      // Use stream_ledger as source of truth for current totals
      const lifetime = pendingFromStreams + paidFromStreams;
      
      setTotals({
        lifetime,
        pending: pendingFromStreams,
        paid: paidFromStreams,
        totalPayouts: (batchData || []).filter((b) => b.status === "paid").length,
      });
      setLastPayoutDate(lastPaid?.paid_at || null);
      
      const { data: ledgerData } = await supabase
        .from("credit_ledger")
        .select("reference, credits_delta, usd_delta")
        .eq("user_email", user.email || "")
        .eq("type", "ARTIST_EARNING");
        
      const trackMap = new Map<string, { streams: number; earned: number }>();
      (ledgerData || []).forEach((entry) => {
        const trackId = entry.reference?.replace("track:", "") || "";
        if (trackId) {
          const existing = trackMap.get(trackId) || { streams: 0, earned: 0 };
          trackMap.set(trackId, {
            streams: existing.streams + 1,
            earned: existing.earned + Math.abs(Number(entry.usd_delta)),
          });
        }
      });
      
      const trackIds = Array.from(trackMap.keys());
      if (trackIds.length > 0) {
        const { data: tracks } = await supabase
          .from("tracks")
          .select("id, title, artwork_url")
          .in("id", trackIds);
          
        const earnings: TrackEarning[] = (tracks || []).map((track) => {
          const stats = trackMap.get(track.id) || { streams: 0, earned: 0 };
          return {
            track_id: track.id,
            title: track.title,
            artwork_url: track.artwork_url,
            total_streams: stats.streams,
            total_earned: stats.earned,
          };
        }).sort((a, b) => b.total_earned - a.total_earned);
        
        setTrackEarnings(earnings);
      }
      
    } catch (error) {
      console.error("Error fetching earnings:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [navigate]);

  // Fetch on mount and when page becomes visible (tab switch)
  useEffect(() => {
    fetchEarningsData();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchEarningsData(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchEarningsData]);

  // Handle Stripe Connect return
  useEffect(() => {
    const connectStatus = searchParams.get("connect");
    if (connectStatus === "success") {
      toast.success("Stripe Connect setup completed! Verifying status...");
      setSearchParams({}, { replace: true });
    } else if (connectStatus === "refresh") {
      toast.info("Stripe Connect session expired. Please try again.");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleRefresh = () => {
    fetchEarningsData(true);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getNextPayoutDate = () => {
    const now = new Date();
    const nextMonday = startOfWeek(now, { weekStartsOn: 1 });
    if (nextMonday <= now) {
      return format(startOfWeek(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), { weekStartsOn: 1 }), "MMM d, yyyy");
    }
    return format(nextMonday, "MMM d, yyyy");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <header className="fixed top-0 left-0 right-0 z-30 px-4 py-4">
          <div className="w-full max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-background/80 backdrop-blur-md border border-border/50">
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Dashboard</span>
            </div>
          </div>
        </header>
        
        <main className="pt-24 pb-12 px-5">
          <div className="w-full max-w-lg mx-auto space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Floating Header */}
      <header className="fixed top-0 left-0 right-0 z-30 px-4 py-4">
        <div className="w-full max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/artist/dashboard")}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-background/80 backdrop-blur-md border border-border/50 text-foreground/80 hover:text-foreground hover:bg-background/90 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back</span>
          </button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="rounded-full bg-background/80 backdrop-blur-md border border-border/50 text-muted-foreground hover:text-foreground gap-1.5 px-3"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-full bg-background/80 backdrop-blur-md border border-border/50 text-muted-foreground hover:text-foreground w-9 h-9"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative pt-24 pb-6 px-5">
        <div className="w-full max-w-lg mx-auto">
          <h1
            className="font-display text-3xl font-bold text-foreground tracking-tight mb-2"
            style={{ textShadow: "0 2px 20px rgba(0, 0, 0, 0.5)" }}
          >
            Earnings
          </h1>

          {/* Earnings Badge */}
          <div className="relative inline-flex items-center gap-2">
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
                Revenue Dashboard
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-5 pb-12">
        <div className="w-full max-w-lg mx-auto space-y-6">
          
          {/* Earnings Summary Cards */}
          <div data-tutorial="earnings-cards" className="grid grid-cols-3 gap-3 animate-fade-in">
            {/* Lifetime */}
            <div 
              className="p-4 rounded-2xl text-center"
              style={{
                background: 'hsla(0, 0%, 100%, 0.02)',
                border: '1px solid hsla(280, 80%, 50%, 0.2)',
              }}
            >
              <div 
                className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
                style={{ background: 'hsla(280, 80%, 50%, 0.15)' }}
              >
                <TrendingUp className="w-5 h-5" style={{ color: 'hsl(280, 80%, 70%)' }} />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                Lifetime
              </span>
              <p className="text-lg font-display font-bold text-foreground">
                ${totals.lifetime.toFixed(2)}
              </p>
            </div>

            {/* Pending */}
            <div 
              className="p-4 rounded-2xl text-center"
              style={{
                background: 'hsla(0, 0%, 100%, 0.02)',
                border: '1px solid hsla(45, 90%, 50%, 0.2)',
              }}
            >
              <div 
                className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
                style={{ background: 'hsla(45, 90%, 50%, 0.15)' }}
              >
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                Pending
              </span>
              <p className="text-lg font-display font-bold text-foreground">
                ${totals.pending.toFixed(2)}
              </p>
            </div>

            {/* Paid */}
            <div 
              className="p-4 rounded-2xl text-center"
              style={{
                background: 'hsla(0, 0%, 100%, 0.02)',
                border: '1px solid hsla(142, 70%, 45%, 0.2)',
              }}
            >
              <div 
                className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
                style={{ background: 'hsla(142, 70%, 45%, 0.15)' }}
              >
                <CheckCircle2 className="w-5 h-5 text-green-400" />
              </div>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">
                Paid
              </span>
              <p className="text-lg font-display font-bold text-foreground">
                ${totals.paid.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Total Payouts Card */}
          <div 
            className="p-5 rounded-2xl animate-fade-in"
            style={{ 
              animationDelay: '50ms',
              background: 'hsla(0, 0%, 100%, 0.02)',
              border: '1px solid hsla(280, 80%, 50%, 0.15)',
            }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'hsla(280, 80%, 50%, 0.15)' }}
              >
                <DollarSign className="w-5 h-5" style={{ color: 'hsl(280, 80%, 70%)' }} />
              </div>
              <div>
                <h3 className="font-display font-semibold text-foreground">Total Payouts</h3>
                <p className="text-xs text-muted-foreground">{totals.totalPayouts} payouts completed</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Last Payout</span>
                <p className="text-sm font-medium text-foreground">
                  {lastPayoutDate ? format(new Date(lastPayoutDate), "MMM d, yyyy") : "No payouts yet"}
                </p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Next Scheduled</span>
                <p className="text-sm font-medium text-foreground">{getNextPayoutDate()}</p>
              </div>
            </div>
          </div>

          {/* Payout Settings */}
          <section className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <PayoutSettings onStatusChange={setPayoutStatus} />
          </section>

          {/* Weekly Transparency Report */}
          <section data-tutorial="weekly-report" className="animate-fade-in" style={{ animationDelay: '150ms' }}>
            <WeeklyTransparencyReport />
          </section>

          {/* Track Earnings Breakdown */}
          <section className="space-y-4 animate-fade-in" style={{ animationDelay: '150ms' }}>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Track Earnings
              </h2>
            </div>
            
            <div 
              className="p-4 rounded-2xl"
              style={{
                background: 'hsla(0, 0%, 100%, 0.02)',
                border: '1px solid hsla(280, 80%, 50%, 0.15)',
              }}
            >
              {trackEarnings.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No track earnings yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {trackEarnings.map((track) => (
                    <div
                      key={track.track_id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/20"
                    >
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        <SignedArtwork
                          trackId={track.track_id}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {track.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {track.total_streams} streams
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-display font-bold" style={{ color: 'hsl(280, 80%, 70%)' }}>
                          ${track.total_earned.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Payout History Section */}
          <section className="animate-fade-in" style={{ animationDelay: '200ms' }}>
            <PayoutHistorySection artistId={artistId} userId={userId} />
          </section>
        </div>
      </main>
    </div>
  );
};

export default ArtistEarnings;
