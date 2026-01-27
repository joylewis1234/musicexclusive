import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Badge } from "@/components/ui/badge";
import { Loader2, DollarSign, Clock, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";

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

const EarningsDashboard = () => {
  const { user } = useAuth();
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totals, setTotals] = useState({ pending: 0, paid: 0 });

  useEffect(() => {
    const fetchBatches = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("payout_batches")
          .select("*")
          .eq("artist_user_id", user.id)
          .order("week_start", { ascending: false });

        if (error) {
          console.error("Error fetching payout batches:", error);
          return;
        }

        setBatches(data || []);

        // Calculate totals
        const pending = (data || [])
          .filter((b) => b.status === "pending" || b.status === "processing")
          .reduce((sum, b) => sum + Number(b.total_usd), 0);
        const paid = (data || [])
          .filter((b) => b.status === "paid")
          .reduce((sum, b) => sum + Number(b.total_usd), 0);

        setTotals({ pending, paid });
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBatches();
  }, [user]);

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

  if (isLoading) {
    return (
      <GlowCard className="p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
      </GlowCard>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader title="Your Earnings" align="left" />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <GlowCard className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Pending
            </span>
          </div>
          <p className="text-xl font-display font-bold text-foreground">
            ${totals.pending.toFixed(2)}
          </p>
        </GlowCard>

        <GlowCard className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-xs text-muted-foreground uppercase tracking-wider">
              Paid
            </span>
          </div>
          <p className="text-xl font-display font-bold text-foreground">
            ${totals.paid.toFixed(2)}
          </p>
        </GlowCard>
      </div>

      {/* Payout History */}
      <GlowCard className="p-4">
        <h3 className="text-sm font-display font-semibold text-foreground mb-4 uppercase tracking-wider">
          Payout History
        </h3>

        {batches.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            No earnings yet. Upload tracks and start earning!
          </p>
        ) : (
          <div className="space-y-3">
            {batches.map((batch) => (
              <div
                key={batch.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {format(new Date(batch.week_start), "MMM d")} -{" "}
                    {format(new Date(batch.week_end), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {batch.total_credits} credits
                  </p>
                </div>
                <div className="flex items-center gap-3">
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
