import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, startOfWeek, addDays } from "date-fns";
import {
  Clock,
  CheckCircle2,
  Loader2,
  XCircle,
  ChevronRight,
  Music,
  Calendar,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface ArtistPayout {
  id: string;
  artist_id: string;
  gross_amount: number;
  platform_fee_amount: number;
  artist_net_amount: number;
  status: string;
  stripe_transfer_id: string | null;
  failure_reason: string | null;
  payout_batch_id: string;
}

interface PayoutBatch {
  id: string;
  week_start: string;
  week_end: string;
  total_credits: number;
  total_usd: number;
  total_gross: number;
  total_platform_fee: number;
  total_artist_net: number;
  status: string;
  paid_at: string | null;
  stripe_transfer_id: string | null;
}

interface TrackBreakdown {
  track_id: string;
  title: string;
  artwork_url: string | null;
  streams: number;
  gross: number;
  artist_net: number;
}

interface PayoutHistorySectionProps {
  artistId: string | null;
  userId: string | null;
}

const PayoutHistorySection = ({ artistId, userId }: PayoutHistorySectionProps) => {
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [artistPayouts, setArtistPayouts] = useState<ArtistPayout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<PayoutBatch | null>(null);
  const [trackBreakdown, setTrackBreakdown] = useState<TrackBreakdown[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  
  // Current week estimates
  const [currentWeekEstimate, setCurrentWeekEstimate] = useState({
    streams: 0,
    gross: 0,
    artistNet: 0,
  });

  useEffect(() => {
    if (!artistId || !userId) return;
    fetchPayoutData();
  }, [artistId, userId]);

  const fetchPayoutData = async () => {
    if (!artistId || !userId) return;
    setIsLoading(true);

    try {
      // Fetch payout batches for this artist
      const { data: batchData } = await supabase
        .from("payout_batches")
        .select("*")
        .eq("artist_user_id", userId)
        .order("week_start", { ascending: false });

      setBatches(batchData || []);

      // Fetch artist_payouts for detailed info
      const { data: payoutData } = await supabase
        .from("artist_payouts")
        .select("*")
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false });

      setArtistPayouts(payoutData || []);

      // Calculate current week estimate from unbatched streams
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      
      const { data: currentStreams } = await supabase
        .from("stream_ledger")
        .select("amount_artist, amount_total")
        .eq("artist_id", artistId)
        .eq("payout_status", "pending")
        .gte("created_at", weekStart.toISOString());

      const estimate = (currentStreams || []).reduce(
        (acc, stream) => ({
          streams: acc.streams + 1,
          gross: acc.gross + Number(stream.amount_total),
          artistNet: acc.artistNet + Number(stream.amount_artist),
        }),
        { streams: 0, gross: 0, artistNet: 0 }
      );

      setCurrentWeekEstimate(estimate);
    } catch (error) {
      console.error("Error fetching payout data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = async (batch: PayoutBatch) => {
    setSelectedBatch(batch);
    setIsLoadingDetails(true);
    setSearchQuery("");

    try {
      // Fetch track-level breakdown from stream_ledger for this batch
      const { data: streams } = await supabase
        .from("stream_ledger")
        .select("track_id, amount_artist, amount_total")
        .eq("artist_id", artistId)
        .eq("payout_batch_id", batch.id);

      // Aggregate by track
      const trackMap = new Map<string, { streams: number; gross: number; artistNet: number }>();
      (streams || []).forEach((stream) => {
        const existing = trackMap.get(stream.track_id) || { streams: 0, gross: 0, artistNet: 0 };
        trackMap.set(stream.track_id, {
          streams: existing.streams + 1,
          gross: existing.gross + Number(stream.amount_total),
          artistNet: existing.artistNet + Number(stream.amount_artist),
        });
      });

      // Fetch track details
      const trackIds = Array.from(trackMap.keys());
      if (trackIds.length > 0) {
        const { data: tracks } = await supabase
          .from("tracks")
          .select("id, title, artwork_url")
          .in("id", trackIds);

        const breakdown: TrackBreakdown[] = (tracks || [])
          .map((track) => {
            const stats = trackMap.get(track.id) || { streams: 0, gross: 0, artistNet: 0 };
            return {
              track_id: track.id,
              title: track.title,
              artwork_url: track.artwork_url,
              streams: stats.streams,
              gross: stats.gross,
              artist_net: stats.artistNet,
            };
          })
          .sort((a, b) => b.artist_net - a.artist_net);

        setTrackBreakdown(breakdown);
      } else {
        setTrackBreakdown([]);
      }
    } catch (error) {
      console.error("Error fetching batch details:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const getNextPayoutDate = () => {
    const now = new Date();
    let nextMonday = startOfWeek(now, { weekStartsOn: 1 });
    if (nextMonday <= now) {
      nextMonday = addDays(nextMonday, 7);
    }
    // Payouts run at 8:00 AM UTC on Mondays
    return format(nextMonday, "MMM d, yyyy 'at' 8:00 AM 'UTC'");
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
      case "approved":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case "processing":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Processing
          </Badge>
        );
      case "held":
        return (
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/40">
            <Clock className="w-3 h-3 mr-1" />
            Held
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

  const filteredTracks = trackBreakdown.filter((track) =>
    track.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getArtistPayoutForBatch = (batchId: string) => {
    return artistPayouts.find((p) => p.payout_batch_id === batchId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 w-32 bg-muted rounded" />
        <div className="h-24 bg-muted/20 rounded-2xl" />
        <div className="h-48 bg-muted/20 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Next Payout Estimate Card */}
      <div
        className="p-5 rounded-2xl"
        style={{
          background: "linear-gradient(135deg, hsla(280, 80%, 50%, 0.15), hsla(45, 90%, 50%, 0.1))",
          border: "1px solid hsla(280, 80%, 50%, 0.3)",
        }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "hsla(280, 80%, 50%, 0.2)" }}
          >
            <Calendar className="w-5 h-5" style={{ color: "hsl(280, 80%, 70%)" }} />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Next Scheduled Payout</h3>
            <p className="text-xs text-muted-foreground">{getNextPayoutDate()}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-xl bg-background/30">
            <TrendingUp className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Streams</p>
            <p className="text-lg font-display font-bold text-foreground">
              {currentWeekEstimate.streams}
            </p>
          </div>
          <div className="text-center p-3 rounded-xl bg-background/30">
            <DollarSign className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gross</p>
            <p className="text-lg font-display font-bold text-foreground">
              ${currentWeekEstimate.gross.toFixed(2)}
            </p>
          </div>
          <div className="text-center p-3 rounded-xl bg-background/30">
            <CheckCircle2 className="w-4 h-4 mx-auto mb-1" style={{ color: "hsl(280, 80%, 70%)" }} />
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Est. Net</p>
            <p className="text-lg font-display font-bold" style={{ color: "hsl(280, 80%, 70%)" }}>
              ${currentWeekEstimate.artistNet.toFixed(2)}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-3">
          Based on streams so far this week (Mon–Sun UTC)
        </p>
      </div>

      {/* Payout History */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-semibold text-foreground">Payout History</h2>
          <Badge variant="outline" className="text-xs">
            {batches.length} weeks
          </Badge>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "hsla(0, 0%, 100%, 0.02)",
            border: "1px solid hsla(280, 80%, 50%, 0.15)",
          }}
        >
          {batches.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No payout history yet. Payouts are processed weekly on Mondays.
            </p>
          ) : (
            <div className="divide-y divide-border/20">
              {batches.map((batch) => {
                const artistPayout = getArtistPayoutForBatch(batch.id);
                const gross = artistPayout?.gross_amount ?? batch.total_gross;
                const platformFee = artistPayout?.platform_fee_amount ?? batch.total_platform_fee;
                const netPaid = artistPayout?.artist_net_amount ?? batch.total_artist_net;

                return (
                  <button
                    key={batch.id}
                    onClick={() => handleViewDetails(batch)}
                    className="w-full p-4 flex items-center gap-4 hover:bg-muted/10 transition-colors text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(batch.week_start), "MMM d")} –{" "}
                        {format(new Date(batch.week_end), "MMM d, yyyy")}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Gross: ${Number(gross).toFixed(2)}</span>
                        <span>Fee: ${Number(platformFee).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p
                          className="text-sm font-display font-bold"
                          style={{ color: batch.status === "paid" ? "hsl(142, 70%, 50%)" : "hsl(280, 80%, 70%)" }}
                        >
                          ${Number(netPaid).toFixed(2)}
                        </p>
                      </div>
                      {getStatusBadge(artistPayout?.status || batch.status)}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Batch Detail Modal */}
      <Dialog open={!!selectedBatch} onOpenChange={() => setSelectedBatch(null)}>
        <DialogContent
          className="max-w-md max-h-[85vh] overflow-y-auto rounded-2xl"
          style={{
            background: "hsl(0, 0%, 5%)",
            border: "1px solid hsla(280, 80%, 50%, 0.3)",
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display">Weekly Payout Details</DialogTitle>
          </DialogHeader>

          {selectedBatch && (
            <div className="space-y-4">
              {/* Week range */}
              <div
                className="p-4 rounded-xl"
                style={{
                  background: "hsla(0, 0%, 100%, 0.03)",
                  border: "1px solid hsla(280, 80%, 50%, 0.15)",
                }}
              >
                <p className="text-sm text-muted-foreground mb-1">Week</p>
                <p className="font-medium text-foreground">
                  {format(new Date(selectedBatch.week_start), "MMM d")} –{" "}
                  {format(new Date(selectedBatch.week_end), "MMM d, yyyy")}
                </p>
              </div>

              {/* Financial breakdown */}
              <div
                className="p-4 rounded-xl space-y-3"
                style={{
                  background: "hsla(0, 0%, 100%, 0.03)",
                  border: "1px solid hsla(280, 80%, 50%, 0.15)",
                }}
              >
                <p
                  className="text-sm font-display uppercase tracking-wider"
                  style={{ color: "hsl(280, 80%, 70%)" }}
                >
                  Financial Breakdown
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Streams</span>
                    <span className="font-medium text-foreground">{selectedBatch.total_credits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gross Revenue</span>
                    <span className="font-medium text-foreground">
                      ${Number(selectedBatch.total_gross || selectedBatch.total_credits * 0.2).toFixed(2)}
                    </span>
                  </div>
                  <hr className="border-border/30" />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform Fee (50%)</span>
                    <span className="font-medium text-foreground">
                      -${Number(selectedBatch.total_platform_fee || selectedBatch.total_credits * 0.1).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Net Payout</span>
                    <span className="font-bold" style={{ color: "hsl(280, 80%, 70%)" }}>
                      ${Number(selectedBatch.total_artist_net || selectedBatch.total_usd).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                {getStatusBadge(selectedBatch.status)}
              </div>

              {selectedBatch.stripe_transfer_id && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Stripe Transfer</span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {selectedBatch.stripe_transfer_id}
                  </span>
                </div>
              )}

              {/* Track Breakdown */}
              <div
                className="p-4 rounded-xl"
                style={{
                  background: "hsla(0, 0%, 100%, 0.03)",
                  border: "1px solid hsla(280, 80%, 50%, 0.15)",
                }}
              >
                <p
                  className="text-sm font-display uppercase tracking-wider mb-3"
                  style={{ color: "hsl(280, 80%, 70%)" }}
                >
                  Track Breakdown
                </p>

                {trackBreakdown.length > 3 && (
                  <Input
                    placeholder="Search tracks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mb-3 bg-background/50 border-border/30"
                  />
                )}

                {isLoadingDetails ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: "hsl(280, 80%, 70%)" }} />
                  </div>
                ) : filteredTracks.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No track data for this period.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {filteredTracks.map((track) => (
                      <div
                        key={track.track_id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-background/30"
                      >
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                          {track.artwork_url ? (
                            <img
                              src={track.artwork_url}
                              alt={track.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Music className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{track.title}</p>
                          <p className="text-xs text-muted-foreground">{track.streams} streams</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold" style={{ color: "hsl(280, 80%, 70%)" }}>
                            ${track.artist_net.toFixed(2)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            gross: ${track.gross.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={() => setSelectedBatch(null)}
                variant="outline"
                className="w-full rounded-xl"
              >
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayoutHistorySection;
