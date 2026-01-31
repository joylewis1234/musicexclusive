import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Home, 
  LogOut, 
  Shield, 
  ArrowLeft,
  Download, 
  Loader2, 
  RefreshCw, 
  ExternalLink,
  CheckCircle,
  Users,
  DollarSign,
  Music
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
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

interface BatchArtistDetail {
  artist_id: string;
  artist_name: string;
  streams: number;
  amount_owed: number;
  amount_paid: number;
  status: string;
}

const AdminPayouts = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState<string | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState<string | null>(null);
  
  // Detail modal
  const [selectedBatch, setSelectedBatch] = useState<PayoutBatch | null>(null);
  const [batchArtists, setBatchArtists] = useState<BatchArtistDetail[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      const { data: batchData, error: batchError } = await supabase
        .from("payout_batches")
        .select("*")
        .order("week_start", { ascending: false })
        .limit(100);

      if (batchError) throw batchError;

      // Fetch artist names
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

  const openBatchDetail = async (batch: PayoutBatch) => {
    setSelectedBatch(batch);
    setIsDetailLoading(true);
    
    try {
      // Fetch all stream_ledger entries for this week
      const { data: streams, error } = await supabase
        .from("stream_ledger")
        .select("*")
        .gte("created_at", batch.week_start)
        .lte("created_at", batch.week_end);

      if (error) throw error;

      // Fetch artist profiles
      const artistIds = [...new Set((streams || []).map(s => s.artist_id))];
      const { data: artistProfiles } = await supabase
        .from("public_artist_profiles")
        .select("id, artist_name, user_id")
        .in("id", artistIds);

      const artistMap = new Map(
        (artistProfiles || []).map(p => [p.id, p.artist_name])
      );

      // Aggregate by artist
      const artistStats = new Map<string, BatchArtistDetail>();
      (streams || []).forEach(stream => {
        const existing = artistStats.get(stream.artist_id);
        const amountArtist = Number(stream.amount_artist);
        
        if (existing) {
          existing.streams += 1;
          existing.amount_owed += amountArtist;
        } else {
          artistStats.set(stream.artist_id, {
            artist_id: stream.artist_id,
            artist_name: artistMap.get(stream.artist_id) || "Unknown Artist",
            streams: 1,
            amount_owed: amountArtist,
            amount_paid: stream.payout_status === "paid" ? amountArtist : 0,
            status: stream.payout_status,
          });
        }
      });

      setBatchArtists(Array.from(artistStats.values()).sort((a, b) => b.amount_owed - a.amount_owed));
    } catch (error) {
      console.error("Error fetching batch details:", error);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const markAsPaid = async (batchId: string) => {
    setIsMarkingPaid(batchId);
    try {
      const { error } = await supabase
        .from("payout_batches")
        .update({ 
          status: "paid", 
          paid_at: new Date().toISOString() 
        })
        .eq("id", batchId);

      if (error) throw error;

      toast.success("Batch marked as paid!");
      fetchBatches();
      setSelectedBatch(null);
    } catch (error) {
      console.error("Error marking batch as paid:", error);
      toast.error("Failed to mark as paid");
    } finally {
      setIsMarkingPaid(null);
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
    const headers = ["Week", "Artist", "Streams", "USD", "Status", "Transfer ID", "Paid At"];
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

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
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
  const totalStreams = batches.reduce((sum, b) => sum + b.total_credits, 0);
  const failedCount = batches.filter(b => b.status === "failed").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
              Artist Payouts
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/admin")}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Home className="w-5 h-5" />
            </button>
            <button
              onClick={handleSignOut}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-7xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlowCard className="p-4 text-center">
              <Music className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{totalStreams}</p>
              <p className="text-xs text-muted-foreground">Total Streams</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <DollarSign className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold">${totalPending.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Pending Payouts</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">${totalPaid.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total Paid</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-red-500" />
              <p className="text-2xl font-bold">{failedCount}</p>
              <p className="text-xs text-muted-foreground">Failed Batches</p>
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

          {/* Batches Table */}
          <GlowCard className="overflow-hidden">
            <div className="p-4 border-b border-border">
              <SectionHeader title="Weekly Payout Batches" align="left" />
              <p className="text-sm text-muted-foreground mt-1">
                Click a batch to view artist breakdown
              </p>
            </div>
            
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
                      <TableHead className="text-right">Streams</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Artist Payout</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Transfer ID</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No payout batches found
                        </TableCell>
                      </TableRow>
                    ) : (
                      batches.map((batch) => (
                        <TableRow 
                          key={batch.id} 
                          className="cursor-pointer hover:bg-muted/20"
                          onClick={() => openBatchDetail(batch)}
                        >
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(batch.week_start), "MMM d")} - {format(new Date(batch.week_end), "MMM d")}
                          </TableCell>
                          <TableCell className="font-medium">{batch.artist_name}</TableCell>
                          <TableCell className="text-right font-mono">{batch.total_credits}</TableCell>
                          <TableCell className="text-right font-mono">${(batch.total_credits * 0.20).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-green-400">${Number(batch.total_usd).toFixed(2)}</TableCell>
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
                                onClick={(e) => e.stopPropagation()}
                              >
                                {batch.stripe_transfer_id.slice(0, 12)}...
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {batch.status === "pending" && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => markAsPaid(batch.id)}
                                  disabled={isMarkingPaid === batch.id}
                                >
                                  {isMarkingPaid === batch.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-3 h-3" />
                                  )}
                                </Button>
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
                              </div>
                            )}
                            {batch.status === "failed" && (
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
      </main>

      {/* Batch Detail Modal */}
      <Dialog open={!!selectedBatch} onOpenChange={() => setSelectedBatch(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Batch Details: {selectedBatch && format(new Date(selectedBatch.week_start), "MMM d")} - {selectedBatch && format(new Date(selectedBatch.week_end), "MMM d, yyyy")}
            </DialogTitle>
          </DialogHeader>

          {isDetailLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Batch Summary */}
              <div className="grid grid-cols-3 gap-4">
                <GlowCard className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Streams</p>
                  <p className="text-xl font-bold">{selectedBatch?.total_credits}</p>
                </GlowCard>
                <GlowCard className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Revenue</p>
                  <p className="text-xl font-bold">${((selectedBatch?.total_credits || 0) * 0.20).toFixed(2)}</p>
                </GlowCard>
                <GlowCard className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Artist Payout</p>
                  <p className="text-xl font-bold text-green-400">${Number(selectedBatch?.total_usd || 0).toFixed(2)}</p>
                </GlowCard>
              </div>

              {/* Artist Breakdown */}
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artist</TableHead>
                      <TableHead className="text-right">Streams</TableHead>
                      <TableHead className="text-right">Amount Owed</TableHead>
                      <TableHead>Payment Method</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {batchArtists.map((artist) => (
                      <TableRow key={artist.artist_id}>
                        <TableCell className="font-medium">{artist.artist_name}</TableCell>
                        <TableCell className="text-right">{artist.streams}</TableCell>
                        <TableCell className="text-right font-mono text-green-400">
                          ${artist.amount_owed.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {selectedBatch?.stripe_transfer_id ? "Stripe" : "Manual"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mark as Paid Button */}
              {selectedBatch?.status === "pending" && (
                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={() => markAsPaid(selectedBatch.id)}
                    disabled={isMarkingPaid === selectedBatch.id}
                    className="gap-2"
                  >
                    {isMarkingPaid === selectedBatch.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Mark as Paid
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayouts;
