import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface PayoutBatch {
  id: string;
  artist_user_id: string;
  week_start: string;
  week_end: string;
  total_credits: number;
  total_usd: number;
  status: string;
  stripe_transfer_id: string | null;
  created_at: string;
  paid_at: string | null;
  artist_name?: string;
}

export function PayoutBatches() {
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      // Fetch batches
      const { data: batchData, error: batchError } = await supabase
        .from("payout_batches")
        .select("*")
        .order("week_start", { ascending: false })
        .limit(100);

      if (batchError) throw batchError;

      // Fetch artist names for each batch
      const artistIds = [...new Set((batchData || []).map(b => b.artist_user_id))];
      const { data: artistProfiles } = await supabase
        .from("artist_profiles")
        .select("user_id, artist_name")
        .in("user_id", artistIds);

      const artistMap = new Map(
        (artistProfiles || []).map(p => [p.user_id, p.artist_name])
      );

      const enrichedBatches = (batchData || []).map(batch => ({
        ...batch,
        artist_name: artistMap.get(batch.artist_user_id) || "Unknown Artist",
      }));

      setBatches(enrichedBatches);
    } catch (error) {
      console.error("Error fetching payout batches:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const retryPayout = async (batchId: string) => {
    setIsRetrying(batchId);
    try {
      const { data, error } = await supabase.functions.invoke("process-payouts", {
        body: { batchId },
      });

      if (error) throw error;

      if (data?.results?.[0]?.status === "paid") {
        toast.success("Payout processed successfully!");
      } else if (data?.results?.[0]?.status === "skipped") {
        toast.info(data.results[0].error || "Payout skipped");
      } else {
        toast.error(data?.results?.[0]?.error || "Payout failed");
      }

      fetchBatches();
    } catch (error) {
      console.error("Error retrying payout:", error);
      toast.error("Failed to retry payout");
    } finally {
      setIsRetrying(null);
    }
  };

  const exportCSV = () => {
    const headers = ["Week", "Artist", "Credits", "USD", "Status", "Transfer ID", "Paid At"];
    const rows = batches.map(b => [
      `${format(new Date(b.week_start), "MMM d")} - ${format(new Date(b.week_end), "MMM d, yyyy")}`,
      b.artist_name || "",
      b.total_credits.toString(),
      b.total_usd.toString(),
      b.status,
      b.stripe_transfer_id || "",
      b.paid_at ? format(new Date(b.paid_at), "yyyy-MM-dd HH:mm") : "",
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payout-batches-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-400",
      processing: "bg-blue-500/20 text-blue-400",
      paid: "bg-green-500/20 text-green-400",
      failed: "bg-red-500/20 text-red-400",
    };
    return styles[status] || "bg-muted text-muted-foreground";
  };

  // Summary stats
  const totalPending = batches.filter(b => b.status === "pending").reduce((sum, b) => sum + Number(b.total_usd), 0);
  const totalPaid = batches.filter(b => b.status === "paid").reduce((sum, b) => sum + Number(b.total_usd), 0);
  const failedCount = batches.filter(b => b.status === "failed").length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlowCard className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending Payouts</p>
          <p className="text-2xl font-bold text-yellow-400">${totalPending.toFixed(2)}</p>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Paid</p>
          <p className="text-2xl font-bold text-green-400">${totalPaid.toFixed(2)}</p>
        </GlowCard>
        <GlowCard className="p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Failed Batches</p>
          <p className="text-2xl font-bold text-red-400">{failedCount}</p>
        </GlowCard>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Button variant="outline" size="sm" onClick={fetchBatches}>
          <RefreshCw className="w-4 h-4 mr-1" /> Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
      </div>

      {/* Table */}
      <GlowCard className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">USD</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transfer ID</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No payout batches found
                    </TableCell>
                  </TableRow>
                ) : (
                  batches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(batch.week_start), "MMM d")} - {format(new Date(batch.week_end), "MMM d")}
                      </TableCell>
                      <TableCell className="font-medium">{batch.artist_name}</TableCell>
                      <TableCell className="text-right font-mono">{batch.total_credits}</TableCell>
                      <TableCell className="text-right font-mono">${Number(batch.total_usd).toFixed(2)}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(batch.status)}`}>
                          {batch.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {batch.stripe_transfer_id ? (
                          <a
                            href={`https://dashboard.stripe.com/test/transfers/${batch.stripe_transfer_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            {batch.stripe_transfer_id.slice(0, 12)}...
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {(batch.status === "failed" || batch.status === "pending") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryPayout(batch.id)}
                            disabled={isRetrying === batch.id}
                          >
                            {isRetrying === batch.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </GlowCard>
    </div>
  );
}
