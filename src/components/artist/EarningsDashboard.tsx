import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useArtistProfile } from "@/hooks/useArtistProfile";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, Clock, CheckCircle2, XCircle, TrendingUp, Music } from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";


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

interface EarningsSummary {
  pendingAll: number;
  paidLifetime: number;
  totalPayouts: number;
  streamsAll: number;
  streamsThisWeek: number;
}

const EarningsDashboard = () => {
  const { user } = useAuth();
  const { artistProfileId, isLoading: profileLoading } = useArtistProfile();
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [summary, setSummary] = useState<EarningsSummary>({
    pendingAll: 0,
    paidLifetime: 0,
    totalPayouts: 0,
    streamsAll: 0,
    streamsThisWeek: 0,
  });

  useEffect(() => {
    const fetchEarningsData = async () => {
      // Wait for artist profile to be loaded
      if (!user || profileLoading || !artistProfileId) return;

      try {
        // Get current week boundaries (Monday to Sunday)
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

        // Fetch stream_ledger data using artist_profiles.id
        const { data: streams, error: streamsError } = await supabase
          .from("stream_ledger")
          .select("amount_artist, payout_status, created_at")
          .eq("artist_id", artistProfileId);

        if (streamsError) {
          console.error("Error fetching stream ledger:", streamsError);
        }

        // Calculate summary from stream_ledger
        let pendingAll = 0;
        let paidLifetime = 0;
        let streamsAll = 0;
        let streamsThisWeek = 0;

        if (streams) {
          for (const stream of streams) {
            const streamDate = new Date(stream.created_at);
            const isThisWeek = streamDate >= weekStart && streamDate <= weekEnd;

            if (stream.payout_status === "pending") {
              pendingAll += Number(stream.amount_artist);
            }

            if (stream.payout_status === "paid") {
              paidLifetime += Number(stream.amount_artist);
            }

            streamsAll++;
            if (isThisWeek) {
              streamsThisWeek++;
            }
          }
        }

        // Fetch payout_batches for total payouts (uses user.id for artist_user_id)
        const { data: payouts, error: payoutsError } = await supabase
          .from("payout_batches")
          .select("*")
          .eq("artist_user_id", user.id)
          .order("week_start", { ascending: false });

        if (payoutsError) {
          console.error("Error fetching payout batches:", payoutsError);
        }

        setBatches(payouts || []);

        // Calculate total payouts from paid batches
        const totalPayouts = (payouts || [])
          .filter((b) => b.status === "paid")
          .reduce((sum, b) => sum + Number(b.total_usd), 0);

        setSummary({
          pendingAll,
          paidLifetime,
          totalPayouts,
          streamsAll,
          streamsThisWeek,
        });
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEarningsData();
  }, [user, artistProfileId, profileLoading]);

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

  if (isLoading || profileLoading) {
    return (
      <GlowCard className="p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
      </GlowCard>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Your Earnings" align="left" />

      {/* Summary Cards - 2x2 grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Pending Earnings (This Week) */}
        <GlowCard variant="flat" glowColor="subtle" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Pending
            </span>
          </div>
          <p className="text-xl font-display font-bold text-foreground">
            ${summary.pendingAll.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">All pending</p>
        </GlowCard>

        {/* Paid Earnings (Lifetime) */}
        <GlowCard variant="flat" glowColor="subtle" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Paid
            </span>
          </div>
          <p className="text-xl font-display font-bold text-foreground">
            ${summary.paidLifetime.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Lifetime</p>
        </GlowCard>

        {/* Total Payouts (Lifetime) */}
        <GlowCard variant="flat" glowColor="subtle" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Payouts
            </span>
          </div>
          <p className="text-xl font-display font-bold text-foreground">
            ${summary.totalPayouts.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Total received</p>
        </GlowCard>

        {/* Streams This Week */}
        <GlowCard variant="flat" glowColor="subtle" className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center">
              <Music className="w-4 h-4 text-accent" />
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Streams
            </span>
          </div>
          <p className="text-xl font-display font-bold text-foreground">
            {summary.streamsAll}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">This week: {summary.streamsThisWeek}</p>
        </GlowCard>
      </div>

      {/* Payout History */}
      <GlowCard variant="flat" glowColor="subtle" className="p-5">
        <h3 className="text-sm font-display font-semibold text-foreground mb-4 uppercase tracking-wider">
          Payout History
        </h3>

        {batches.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No earnings yet. Upload tracks and start earning!
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
                    {format(new Date(batch.week_start), "MMM d")} -{" "}
                    {format(new Date(batch.week_end), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {batch.total_credits} credits
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <p className="text-sm font-semibold text-foreground">
                    ${Number(batch.total_usd).toFixed(2)}
                  </p>
                  {getStatusBadge(batch.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlowCard>

    </div>
  );
};

export default EarningsDashboard;
