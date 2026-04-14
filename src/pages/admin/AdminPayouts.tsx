import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Switch } from "@/components/ui/switch";
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
  Music,
  Play,
  Pause,
  Search,
  Eye,
  Clock
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { toast } from "sonner";

const PAYOUTS_TOOLTIP = "Weekly payout batches grouped by artist and week. Mark payouts as Paid after sending funds.";

interface PayoutBatch {
  id: string;
  artist_user_id: string;
  week_start: string;
  week_end: string;
  total_credits: number;
  total_usd: number;
  total_gross: number;
  total_platform_fee: number;
  total_artist_net: number;
  status: string;
  stripe_transfer_id: string | null;
  created_at: string;
  paid_at: string | null;
  artist_name?: string;
}

interface ArtistPayout {
  id: string;
  payout_batch_id: string;
  artist_id: string;
  gross_amount: number;
  platform_fee_amount: number;
  artist_net_amount: number;
  status: string;
  stripe_transfer_id: string | null;
  stripe_payout_id: string | null;
  failure_reason: string | null;
  created_at: string;
  artist_name?: string;
}

const AdminPayouts = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  
  const [batches, setBatches] = useState<PayoutBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [isAggregating, setIsAggregating] = useState(false);
  const [unbatchedCount, setUnbatchedCount] = useState(0);
  const [unbatchedTotal, setUnbatchedTotal] = useState(0);
  const [autoPayoutsEnabled, setAutoPayoutsEnabled] = useState(() => {
    return localStorage.getItem("me_auto_payouts") === "true";
  });

  // Detail modal
  const [selectedBatch, setSelectedBatch] = useState<PayoutBatch | null>(null);
  const [artistPayouts, setArtistPayouts] = useState<ArtistPayout[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

      // Fetch unbatched stream count
      const { data: unbatched, error: unbatchedError } = await supabase
        .from("stream_ledger")
        .select("amount_artist")
        .is("payout_batch_id", null);

      if (!unbatchedError && unbatched) {
        setUnbatchedCount(unbatched.length);
        setUnbatchedTotal(unbatched.reduce((sum, s) => sum + Number(s.amount_artist), 0));
      }
    } catch (error) {
      console.error("Error fetching payout batches:", error);
      toast.error("Failed to fetch batches");
    } finally {
      setIsLoading(false);
    }
  };

  const runAggregation = async () => {
    setIsAggregating(true);
    try {
      const { data, error } = await supabase.functions.invoke("aggregate-weekly-earnings");

      if (error) throw error;

      if (data?.batchesCreated > 0) {
        toast.success(`Created ${data.batchesCreated} payout batch(es) for week of ${data.weekStart?.split("T")[0]}`);
      } else {
        toast.info(data?.message || "No new batches to create");
      }

      fetchBatches();
    } catch (error) {
      console.error("Error running aggregation:", error);
      toast.error(error instanceof Error ? error.message : "Failed to aggregate earnings");
    } finally {
      setIsAggregating(false);
    }
  };

  const openBatchDetail = async (batch: PayoutBatch) => {
    setSelectedBatch(batch);
    setIsDetailLoading(true);
    setSearchQuery("");
    
    try {
      // Fetch artist_payouts for this batch
      const { data: payouts, error } = await supabase
        .from("artist_payouts")
        .select("*")
        .eq("payout_batch_id", batch.id)
        .order("artist_net_amount", { ascending: false });

      if (error) throw error;

      // Fetch artist names
      const artistIds = [...new Set((payouts || []).map(p => p.artist_id))];
      const { data: artistProfiles } = await supabase
        .from("public_artist_profiles")
        .select("id, artist_name")
        .in("id", artistIds);

      const artistMap = new Map(
        (artistProfiles || []).map(p => [p.id, p.artist_name])
      );

      const enrichedPayouts = (payouts || []).map(payout => ({
        ...payout,
        artist_name: artistMap.get(payout.artist_id) || "Unknown Artist",
      }));

      setArtistPayouts(enrichedPayouts);
    } catch (error) {
      console.error("Error fetching batch details:", error);
      toast.error("Failed to load batch details");
    } finally {
      setIsDetailLoading(false);
    }
  };

  const approveBatch = async (batchId: string) => {
    setIsProcessing(batchId);
    try {
      const { error } = await supabase
        .from("payout_batches")
        .update({ status: "approved" })
        .eq("id", batchId);

      if (error) throw error;

      // Also approve all pending artist_payouts in this batch
      await supabase
        .from("artist_payouts")
        .update({ status: "approved" })
        .eq("payout_batch_id", batchId)
        .eq("status", "pending");

      toast.success("Batch approved!");
      fetchBatches();
      if (selectedBatch?.id === batchId) {
        openBatchDetail({ ...selectedBatch, status: "approved" });
      }
    } catch (error) {
      console.error("Error approving batch:", error);
      toast.error("Failed to approve batch");
    } finally {
      setIsProcessing(null);
    }
  };

  const holdArtistPayout = async (payoutId: string) => {
    setIsProcessing(payoutId);
    try {
      const { error } = await supabase
        .from("artist_payouts")
        .update({ status: "held" })
        .eq("id", payoutId);

      if (error) throw error;

      toast.success("Artist payout held");
      // Refresh the detail view
      if (selectedBatch) {
        openBatchDetail(selectedBatch);
      }
    } catch (error) {
      console.error("Error holding payout:", error);
      toast.error("Failed to hold payout");
    } finally {
      setIsProcessing(null);
    }
  };

  const approveArtistPayout = async (payoutId: string) => {
    setIsProcessing(payoutId);
    try {
      const { error } = await supabase
        .from("artist_payouts")
        .update({ status: "approved" })
        .eq("id", payoutId);

      if (error) throw error;

      toast.success("Artist payout approved");
      if (selectedBatch) {
        openBatchDetail(selectedBatch);
      }
    } catch (error) {
      console.error("Error approving payout:", error);
      toast.error("Failed to approve payout");
    } finally {
      setIsProcessing(null);
    }
  };

  const runPayoutsNow = async (batchId: string) => {
    setIsProcessing(batchId);
    try {
      const { data, error } = await supabase.functions.invoke("process-payouts", {
        body: { batchId },
      });

      if (error) throw error;

      const results = data?.results || [];
      const paidCount = results.filter((r: { status: string }) => r.status === "paid").length;
      const failedCount = results.filter((r: { status: string }) => r.status === "failed").length;
      const skippedCount = results.filter((r: { status: string }) => r.status === "skipped").length;

      if (paidCount > 0) {
        toast.success(`${paidCount} payout(s) processed successfully!`);
      }
      if (failedCount > 0) {
        toast.error(`${failedCount} payout(s) failed`);
      }
      if (skippedCount > 0) {
        toast.info(`${skippedCount} payout(s) skipped`);
      }

      fetchBatches();
      if (selectedBatch) {
        openBatchDetail(selectedBatch);
      }
    } catch (error) {
      console.error("Error running payouts:", error);
      toast.error(error instanceof Error ? error.message : "Failed to run payouts");
    } finally {
      setIsProcessing(null);
    }
  };

  const retryFailedPayout = async (payoutId: string) => {
    setIsProcessing(payoutId);
    try {
      // Reset the failed payout to approved status
      const { error: resetError } = await supabase
        .from("artist_payouts")
        .update({ 
          status: "approved", 
          failure_reason: null,
          stripe_transfer_id: null 
        })
        .eq("id", payoutId);

      if (resetError) throw resetError;

      // Get the batch ID for this payout
      const payout = artistPayouts.find(p => p.id === payoutId);
      if (!payout) throw new Error("Payout not found");

      // Ensure batch is approved
      await supabase
        .from("payout_batches")
        .update({ status: "approved" })
        .eq("id", payout.payout_batch_id);

      // Run the payout
      const { data, error } = await supabase.functions.invoke("process-payouts", {
        body: { batchId: payout.payout_batch_id },
      });

      if (error) throw error;

      const results = data?.results || [];
      const result = results.find((r: { payoutId: string }) => r.payoutId === payoutId);
      
      if (result?.status === "paid") {
        toast.success("Payout processed successfully!");
      } else if (result?.status === "failed") {
        toast.error(result.error || "Payout failed again");
      } else {
        toast.info("Payout status updated");
      }

      fetchBatches();
      if (selectedBatch) {
        openBatchDetail(selectedBatch);
      }
    } catch (error) {
      console.error("Error retrying payout:", error);
      toast.error(error instanceof Error ? error.message : "Failed to retry payout");
    } finally {
      setIsProcessing(null);
    }
  };

  const exportCSV = () => {
    const headers = ["Week", "Artist", "Gross", "Platform Fee", "Artist Net", "Status", "Transfer ID", "Paid At"];
    const rows = batches.map(b => [
      `${format(new Date(b.week_start), "MMM d")} - ${format(new Date(b.week_end), "MMM d, yyyy")}`,
      b.artist_name || "",
      Number(b.total_gross).toFixed(2),
      Number(b.total_platform_fee).toFixed(2),
      Number(b.total_artist_net).toFixed(2),
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
      approved: "bg-blue-500/20 text-blue-400",
      processing: "bg-purple-500/20 text-purple-400",
      paid: "bg-green-500/20 text-green-400",
      failed: "bg-red-500/20 text-red-400",
      held: "bg-orange-500/20 text-orange-400",
    };
    return styles[status] || "bg-muted text-muted-foreground";
  };

  // Filter artist payouts by search
  const filteredPayouts = artistPayouts.filter(p => 
    p.artist_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Summary stats
  const totalPending = batches.filter(b => b.status === "pending" || b.status === "approved").reduce((sum, b) => sum + Number(b.total_artist_net), 0);
  const totalPaid = batches.filter(b => b.status === "paid").reduce((sum, b) => sum + Number(b.total_artist_net), 0);
  const totalStreams = batches.reduce((sum, b) => sum + b.total_credits, 0);
  const failedCount = batches.filter(b => b.status === "failed").length;

  // Check if batch can run payouts (must be approved)
  const canRunPayouts = selectedBatch?.status === "approved";
  const hasApprovedPayouts = artistPayouts.some(p => p.status === "approved");

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
            <InfoTooltip message={PAYOUTS_TOOLTIP} />
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
              <p className="text-xs text-muted-foreground">Pending/Approved</p>
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

          {/* Payout Automation Toggle */}
          <GlowCard className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Weekly Auto-Payouts</p>
                  <p className="text-xs text-muted-foreground">
                    {autoPayoutsEnabled
                      ? "Payouts will be processed automatically each week"
                      : "Payouts are manual only. Enable to auto-process approved batches weekly."}
                  </p>
                </div>
              </div>
              <Switch
                checked={autoPayoutsEnabled}
                onCheckedChange={(checked) => {
                  setAutoPayoutsEnabled(checked);
                  localStorage.setItem("me_auto_payouts", String(checked));
                  toast.info(checked ? "Auto-payouts enabled" : "Auto-payouts disabled");
                }}
              />
            </div>
          </GlowCard>

          {/* Unbatched earnings notice */}
          {unbatchedCount > 0 && (
            <GlowCard className="p-4 border-yellow-500/30">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-sm font-medium text-yellow-400">
                    {unbatchedCount} unbatched stream{unbatchedCount !== 1 ? "s" : ""} (${unbatchedTotal.toFixed(2)} artist earnings)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Run aggregation to create weekly payout batches from completed weeks
                  </p>
                </div>
                <Button
                  onClick={runAggregation}
                  disabled={isAggregating}
                  size="sm"
                  className="gap-2"
                >
                  {isAggregating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <DollarSign className="w-4 h-4" />
                  )}
                  Generate Weekly Batches
                </Button>
              </div>
            </GlowCard>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchBatches}>
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={runAggregation} disabled={isAggregating}>
                {isAggregating ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <DollarSign className="w-4 h-4 mr-1" />}
                Aggregate Earnings
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
          </div>

          {/* Batches Table */}
          <GlowCard className="overflow-hidden">
            <div className="p-4 border-b border-border">
              <SectionHeader title="Weekly Payout Batches" align="left" />
              <p className="text-sm text-muted-foreground mt-1">
                Click "View Details" to see artist breakdown and manage approvals
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
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Platform Fee</TableHead>
                      <TableHead className="text-right">Artist Net</TableHead>
                      <TableHead>Status</TableHead>
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
                        <TableRow key={batch.id}>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(batch.week_start), "MMM d")} - {format(new Date(batch.week_end), "MMM d")}
                          </TableCell>
                          <TableCell className="font-medium">{batch.artist_name}</TableCell>
                          <TableCell className="text-right font-mono">{batch.total_credits}</TableCell>
                          <TableCell className="text-right font-mono">${Number(batch.total_gross).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">${Number(batch.total_platform_fee).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-green-400">${Number(batch.total_artist_net).toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(batch.status)}`}>
                              {batch.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openBatchDetail(batch)}
                              className="gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              View Details
                            </Button>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
            <div className="space-y-6">
              {/* Batch Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <GlowCard className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Streams</p>
                  <p className="text-xl font-bold">{selectedBatch?.total_credits}</p>
                </GlowCard>
                <GlowCard className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Gross</p>
                  <p className="text-xl font-bold">${Number(selectedBatch?.total_gross || 0).toFixed(2)}</p>
                </GlowCard>
                <GlowCard className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Platform Fee</p>
                  <p className="text-xl font-bold text-muted-foreground">${Number(selectedBatch?.total_platform_fee || 0).toFixed(2)}</p>
                </GlowCard>
                <GlowCard className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Artist Net</p>
                  <p className="text-xl font-bold text-green-400">${Number(selectedBatch?.total_artist_net || 0).toFixed(2)}</p>
                </GlowCard>
              </div>

              {/* Status and Actions */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">Batch Status:</span>
                  <span className={`text-sm px-3 py-1 rounded-full ${getStatusBadge(selectedBatch?.status || "")}`}>
                    {selectedBatch?.status}
                  </span>
                  {selectedBatch?.stripe_transfer_id && (
                    <a
                      href={`https://dashboard.stripe.com/test/transfers/${selectedBatch.stripe_transfer_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View in Stripe <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedBatch?.status === "pending" && (
                    <Button
                      onClick={() => approveBatch(selectedBatch.id)}
                      disabled={isProcessing === selectedBatch.id}
                      className="gap-2"
                    >
                      {isProcessing === selectedBatch.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Approve Batch
                    </Button>
                  )}
                  {canRunPayouts && hasApprovedPayouts && (
                    <Button
                      onClick={() => runPayoutsNow(selectedBatch!.id)}
                      disabled={isProcessing === selectedBatch?.id}
                      variant="default"
                      className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                      {isProcessing === selectedBatch?.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      Run Payouts Now
                    </Button>
                  )}
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search artists..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Artist Payouts Table */}
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artist</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Platform Fee</TableHead>
                      <TableHead className="text-right">Net Payout</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Stripe</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayouts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No artist payouts found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayouts.map((payout) => (
                        <TableRow key={payout.id}>
                          <TableCell className="font-medium">{payout.artist_name}</TableCell>
                          <TableCell className="text-right font-mono">${Number(payout.gross_amount).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">${Number(payout.platform_fee_amount).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono text-green-400">${Number(payout.artist_net_amount).toFixed(2)}</TableCell>
                          <TableCell>
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(payout.status)}`}>
                              {payout.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-mono">
                            {payout.stripe_transfer_id ? (
                              <a
                                href={`https://dashboard.stripe.com/test/transfers/${payout.stripe_transfer_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1"
                              >
                                {payout.stripe_transfer_id.slice(0, 10)}...
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : payout.failure_reason ? (
                              <span className="text-red-400" title={payout.failure_reason}>
                                Failed
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {payout.status === "failed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => retryFailedPayout(payout.id)}
                                  disabled={isProcessing === payout.id}
                                  title="Retry failed payout"
                                  className="gap-1"
                                >
                                  {isProcessing === payout.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3 text-blue-500" />
                                  )}
                                  Retry
                                </Button>
                              )}
                              {(payout.status === "pending" || payout.status === "held") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => approveArtistPayout(payout.id)}
                                  disabled={isProcessing === payout.id}
                                  title="Approve payout"
                                >
                                  {isProcessing === payout.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                  )}
                                </Button>
                              )}
                              {(payout.status === "pending" || payout.status === "approved") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => holdArtistPayout(payout.id)}
                                  disabled={isProcessing === payout.id}
                                  title="Hold payout"
                                >
                                  {isProcessing === payout.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Pause className="w-3 h-3 text-orange-500" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPayouts;
