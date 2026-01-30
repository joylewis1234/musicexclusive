import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import {
  DollarSign,
  Clock,
  CheckCircle2,
  TrendingUp,
  Music,
  Calendar,
  ChevronRight,
  Loader2,
  XCircle,
  Home,
  LogOut,
  Mic2,
  Eye,
} from "lucide-react";
import { getAuthedUserOrFail, withTimeout } from "@/utils/authHelpers";

interface PayoutBatch {
  id: string;
  week_start: string;
  week_end: string;
  total_credits: number;
  total_usd: number;
  status: string;
  paid_at: string | null;
  stripe_transfer_id: string | null;
}

interface TrackEarning {
  track_id: string;
  title: string;
  artwork_url: string | null;
  total_streams: number;
  total_earned: number;
}

interface LedgerEntry {
  id: string;
  created_at: string;
  credits_delta: number;
  usd_delta: number;
  type: string;
  reference: string | null;
}

const ArtistEarnings = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Earnings data
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [trackEarnings, setTrackEarnings] = useState<TrackEarning[]>([]);
  const [totals, setTotals] = useState({
    lifetime: 0,
    pending: 0,
    paid: 0,
    totalPayouts: 0,
  });
  const [lastPayoutDate, setLastPayoutDate] = useState<string | null>(null);
  
  // Modal state
  const [selectedBatch, setSelectedBatch] = useState<PayoutBatch | null>(null);
  const [batchLedgerEntries, setBatchLedgerEntries] = useState<LedgerEntry[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const fetchEarningsData = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const authResult = await withTimeout(getAuthedUserOrFail(), 10000);
      if (!authResult.ok) {
        navigate("/artist/login");
        return;
      }
      
      const { user } = authResult;
      setUserId(user.id);
      
      // Get artist profile
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
      
      // Fetch payout batches
      const { data: batchData } = await supabase
        .from("payout_batches")
        .select("*")
        .eq("artist_user_id", user.id)
        .order("week_start", { ascending: false });
        
      setBatches(batchData || []);
      
      // Calculate totals
      const pending = (batchData || [])
        .filter((b) => b.status === "pending" || b.status === "processing")
        .reduce((sum, b) => sum + Number(b.total_usd), 0);
      const paid = (batchData || [])
        .filter((b) => b.status === "paid")
        .reduce((sum, b) => sum + Number(b.total_usd), 0);
      const lifetime = pending + paid;
      
      // Get last payout date
      const lastPaid = (batchData || []).find((b) => b.status === "paid" && b.paid_at);
      
      setTotals({
        lifetime,
        pending,
        paid,
        totalPayouts: (batchData || []).filter((b) => b.status === "paid").length,
      });
      setLastPayoutDate(lastPaid?.paid_at || null);
      
      // Fetch track earnings from ledger
      const { data: ledgerData } = await supabase
        .from("credit_ledger")
        .select("reference, credits_delta, usd_delta")
        .eq("user_email", user.email || "")
        .eq("type", "ARTIST_EARNING");
        
      // Group by track
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
      
      // Fetch track details
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
    }
  }, [navigate]);

  useEffect(() => {
    fetchEarningsData();
  }, [fetchEarningsData]);

  const handleViewReport = async (batch: PayoutBatch) => {
    setSelectedBatch(batch);
    setIsLoadingDetails(true);
    
    try {
      // Fetch ledger entries for this batch
      const { data } = await supabase
        .from("credit_ledger")
        .select("*")
        .eq("payout_batch_id", batch.id)
        .order("created_at", { ascending: false });
        
      setBatchLedgerEntries(data || []);
    } catch (error) {
      console.error("Error fetching batch details:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/40">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/40">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate next payout date (next Monday)
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
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/20">
          <div className="container max-w-lg md:max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
                Earnings
              </span>
            </div>
          </div>
        </header>
        
        <main className="pt-20 pb-12 px-4">
          <div className="container max-w-lg md:max-w-3xl mx-auto space-y-4">
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
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/20">
        <div className="container max-w-lg md:max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
              Earnings
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
          
          {/* Earnings Summary Cards */}
          <div className="grid grid-cols-3 gap-3 animate-fade-in">
            <GlowCard variant="flat" glowColor="primary" className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  Lifetime
                </span>
                <p className="text-lg font-display font-bold text-foreground">
                  ${totals.lifetime.toFixed(2)}
                </p>
              </div>
            </GlowCard>

            <GlowCard variant="flat" glowColor="subtle" className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-2">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  Pending
                </span>
                <p className="text-lg font-display font-bold text-foreground">
                  ${totals.pending.toFixed(2)}
                </p>
              </div>
            </GlowCard>

            <GlowCard variant="flat" glowColor="subtle" className="p-4">
              <div className="flex flex-col items-center text-center">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                  Paid
                </span>
                <p className="text-lg font-display font-bold text-foreground">
                  ${totals.paid.toFixed(2)}
                </p>
              </div>
            </GlowCard>
          </div>

          {/* Total Payouts Card */}
          <GlowCard variant="elevated" glowColor="gradient" className="p-5 animate-fade-in" style={{ animationDelay: '50ms' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
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
          </GlowCard>

          {/* Weekly Transparency Report */}
          <section className="space-y-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <SectionHeader title="Weekly Transparency Report" align="left" />
            
            <GlowCard variant="flat" glowColor="subtle" className="p-5">
              {batches.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No earnings yet. Start uploading tracks to earn!
                </p>
              ) : (
                <div className="space-y-2">
                  {batches.map((batch) => (
                    <div
                      key={batch.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors duration-200"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {format(new Date(batch.week_start), "MMM d")} –{" "}
                          {format(new Date(batch.week_end), "MMM d, yyyy")}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{batch.total_credits} streams</span>
                          <span>•</span>
                          <span>${Number(batch.total_usd).toFixed(2)} earned</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {getStatusBadge(batch.status)}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-xl w-8 h-8 p-0"
                          onClick={() => handleViewReport(batch)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlowCard>
          </section>

          {/* Track Earnings Breakdown */}
          <section className="space-y-4 animate-fade-in" style={{ animationDelay: '150ms' }}>
            <SectionHeader title="Track Earnings" align="left" />
            
            <GlowCard variant="flat" glowColor="subtle" className="p-5">
              {trackEarnings.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No track earnings yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {trackEarnings.map((track) => (
                    <div
                      key={track.track_id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
                    >
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {track.artwork_url ? (
                          <img
                            src={track.artwork_url}
                            alt={track.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Music className="w-5 h-5 text-muted-foreground" />
                        )}
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
                        <p className="text-sm font-semibold text-green-400">
                          ${track.total_earned.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlowCard>
          </section>

          {/* Payout History */}
          <section className="space-y-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <SectionHeader title="Payout History" align="left" />
            
            <GlowCard variant="flat" glowColor="subtle" className="p-5">
              {batches.filter((b) => b.status === "paid").length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No payouts yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {batches
                    .filter((b) => b.status === "paid")
                    .map((batch) => (
                      <div
                        key={batch.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              ${Number(batch.total_usd).toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {batch.paid_at
                                ? format(new Date(batch.paid_at), "MMM d, yyyy")
                                : "Date unknown"}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/40">
                          Paid
                        </Badge>
                      </div>
                    ))}
                </div>
              )}
            </GlowCard>
          </section>
        </div>
      </main>

      {/* Weekly Report Modal */}
      <Dialog open={!!selectedBatch} onOpenChange={() => setSelectedBatch(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              Weekly Report
              {selectedBatch && (
                <span className="block text-sm font-normal text-muted-foreground mt-1">
                  {format(new Date(selectedBatch.week_start), "MMM d")} –{" "}
                  {format(new Date(selectedBatch.week_end), "MMM d, yyyy")}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedBatch && (
            <div className="space-y-4 pt-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/30">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    Total Streams
                  </span>
                  <p className="text-lg font-display font-bold text-foreground">
                    {selectedBatch.total_credits}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider">
                    Credits Collected
                  </span>
                  <p className="text-lg font-display font-bold text-foreground">
                    {selectedBatch.total_credits}
                  </p>
                </div>
              </div>
              
              {/* Revenue Split */}
              <div className="p-4 rounded-xl bg-muted/30 space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Revenue Split</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Revenue</span>
                    <span className="font-medium">${(Number(selectedBatch.total_usd) * 2).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Platform Share (50%)</span>
                    <span className="font-medium">${Number(selectedBatch.total_usd).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t border-border pt-2">
                    <span className="text-foreground font-medium">Your Earnings (50%)</span>
                    <span className="font-bold text-green-400">${Number(selectedBatch.total_usd).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {/* Status */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge(selectedBatch.status)}
              </div>
              
              {/* Ledger Entries */}
              {isLoadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : batchLedgerEntries.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground">Transaction Log</h4>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {batchLedgerEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/20 text-xs"
                      >
                        <div>
                          <span className="text-muted-foreground">
                            {format(new Date(entry.created_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                        <span className="font-medium text-green-400">
                          +${Math.abs(Number(entry.usd_delta)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ArtistEarnings;
