import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CalendarIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ArtistPayout {
  id: string;
  artist_name: string;
  user_id: string;
  stripe_account_id: string | null;
  payout_status: string | null;
  unpaid_credits: number;
  unpaid_usd: number;
  last_payout_date: string | null;
}

interface LedgerEntry {
  id: string;
  created_at: string;
  type: string;
  user_email: string;
  credits_delta: number;
  usd_delta: number;
  reference: string | null;
  payout_batch_id: string | null;
}

interface PayoutResult {
  artist_name: string;
  credits: number;
  usd: number;
  stripe_transfer_id: string | null;
  success: boolean;
  error?: string;
}

const TestPayouts = () => {
  const { toast } = useToast();
  
  // Section 1: Payout Readiness
  const [artists, setArtists] = useState<ArtistPayout[]>([]);
  const [loadingArtists, setLoadingArtists] = useState(true);
  
  // Section 2: Run Payout
  const [periodType, setPeriodType] = useState<"this-week" | "custom">("this-week");
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [isRunningPayout, setIsRunningPayout] = useState(false);
  const [payoutResults, setPayoutResults] = useState<PayoutResult[]>([]);
  
  // Section 3: Transaction Ledger
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(true);
  const [ledgerFilter, setLedgerFilter] = useState({
    type: "all",
    search: "",
  });

  const today = new Date();
  const thisWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(today, { weekStartsOn: 1 });

  useEffect(() => {
    fetchArtistsWithEarnings();
    fetchLedgerEntries();
  }, []);

  const fetchArtistsWithEarnings = async () => {
    setLoadingArtists(true);
    try {
      // Fetch all artists
      const { data: artistsData, error: artistsError } = await supabase
        .from("artist_profiles")
        .select("id, artist_name, user_id, stripe_account_id, payout_status");

      if (artistsError) throw artistsError;

      // Fetch unpaid earnings grouped by artist
      const { data: earningsData, error: earningsError } = await supabase
        .from("credit_ledger")
        .select("*")
        .eq("type", "ARTIST_EARNING")
        .is("payout_batch_id", null);

      if (earningsError) throw earningsError;

      // Fetch last payout for each artist
      const { data: payoutsData, error: payoutsError } = await supabase
        .from("payout_batches")
        .select("artist_user_id, paid_at")
        .eq("status", "paid")
        .order("paid_at", { ascending: false });

      if (payoutsError) throw payoutsError;

      // Build artist payout data
      const artistPayouts: ArtistPayout[] = (artistsData || []).map((artist) => {
        // Sum unpaid earnings for this artist (matching by artist_name in user_email for test data)
        const artistEarnings = (earningsData || []).filter(
          (e) => e.user_email === artist.artist_name
        );
        const unpaid_credits = artistEarnings.reduce((sum, e) => sum + e.credits_delta, 0);
        const unpaid_usd = artistEarnings.reduce((sum, e) => sum + Number(e.usd_delta), 0);

        // Find last payout
        const lastPayout = (payoutsData || []).find(
          (p) => p.artist_user_id === artist.user_id
        );

        return {
          id: artist.id,
          artist_name: artist.artist_name,
          user_id: artist.user_id,
          stripe_account_id: artist.stripe_account_id,
          payout_status: artist.payout_status || "not_connected",
          unpaid_credits,
          unpaid_usd,
          last_payout_date: lastPayout?.paid_at || null,
        };
      });

      setArtists(artistPayouts);
    } catch (error: any) {
      toast({
        title: "Error fetching artists",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingArtists(false);
    }
  };

  const fetchLedgerEntries = async () => {
    setLoadingLedger(true);
    try {
      const { data, error } = await supabase
        .from("credit_ledger")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLedgerEntries(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching ledger",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingLedger(false);
    }
  };

  const getDateRange = () => {
    if (periodType === "this-week") {
      return { start: thisWeekStart, end: thisWeekEnd };
    }
    return { start: customDateRange.from, end: customDateRange.to };
  };

  const getStripeStatusBadge = (status: string | null) => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="outline" className="border-green-500 text-green-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Connected
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-500">
            <AlertCircle className="w-3 h-3 mr-1" />
            Action Required
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
            <XCircle className="w-3 h-3 mr-1" />
            Not Connected
          </Badge>
        );
    }
  };

  const handleRunPayout = async () => {
    const dateRange = getDateRange();
    if (!dateRange.start || !dateRange.end) {
      toast({
        title: "Select date range",
        description: "Please select a valid date range.",
        variant: "destructive",
      });
      return;
    }

    setIsRunningPayout(true);
    setPayoutResults([]);

    try {
      const results: PayoutResult[] = [];

      // Get artists with connected Stripe and unpaid earnings
      const eligibleArtists = artists.filter(
        (a) => a.payout_status === "connected" && a.unpaid_credits > 0
      );

      for (const artist of eligibleArtists) {
        try {
          // Create payout batch
          const { data: batchData, error: batchError } = await supabase
            .from("payout_batches")
            .insert({
              artist_user_id: artist.user_id,
              week_start: dateRange.start.toISOString(),
              week_end: dateRange.end.toISOString(),
              total_credits: artist.unpaid_credits,
              total_usd: artist.unpaid_usd,
              status: "processing",
            })
            .select()
            .single();

          if (batchError) throw batchError;

          // In test mode, simulate Stripe transfer
          const mockTransferId = `tr_test_${Date.now()}_${artist.id.slice(0, 8)}`;

          // Update batch with transfer ID and mark as paid
          const { error: updateBatchError } = await supabase
            .from("payout_batches")
            .update({
              stripe_transfer_id: mockTransferId,
              status: "paid",
              paid_at: new Date().toISOString(),
            })
            .eq("id", batchData.id);

          if (updateBatchError) throw updateBatchError;

          // Link ledger entries to this batch
          const { error: linkError } = await supabase
            .from("credit_ledger")
            .update({ payout_batch_id: batchData.id })
            .eq("user_email", artist.artist_name)
            .eq("type", "ARTIST_EARNING")
            .is("payout_batch_id", null);

          if (linkError) throw linkError;

          results.push({
            artist_name: artist.artist_name,
            credits: artist.unpaid_credits,
            usd: artist.unpaid_usd,
            stripe_transfer_id: mockTransferId,
            success: true,
          });
        } catch (error: any) {
          results.push({
            artist_name: artist.artist_name,
            credits: artist.unpaid_credits,
            usd: artist.unpaid_usd,
            stripe_transfer_id: null,
            success: false,
            error: error.message,
          });
        }
      }

      setPayoutResults(results);
      
      // Refresh data
      await fetchArtistsWithEarnings();
      await fetchLedgerEntries();

      const successCount = results.filter((r) => r.success).length;
      toast({
        title: "Payout complete",
        description: `${successCount}/${results.length} payouts processed successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Payout failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRunningPayout(false);
    }
  };

  const handleRetryFailed = async () => {
    const failedArtists = payoutResults.filter((r) => !r.success);
    if (failedArtists.length === 0) return;
    
    // Re-run payout for failed artists
    await handleRunPayout();
  };

  const filteredLedgerEntries = ledgerEntries.filter((entry) => {
    if (ledgerFilter.type !== "all" && entry.type !== ledgerFilter.type) {
      return false;
    }
    if (
      ledgerFilter.search &&
      !entry.user_email.toLowerCase().includes(ledgerFilter.search.toLowerCase()) &&
      !entry.reference?.toLowerCase().includes(ledgerFilter.search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const exportToCSV = () => {
    const headers = ["Date", "Type", "User/Artist", "Credits", "USD", "Status", "Reference"];
    const rows = filteredLedgerEntries.map((entry) => [
      format(new Date(entry.created_at), "yyyy-MM-dd HH:mm"),
      entry.type,
      entry.user_email,
      entry.credits_delta,
      entry.usd_delta,
      entry.payout_batch_id ? "Paid" : "Unpaid",
      entry.reference || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-4xl mx-auto px-4 pt-20 pb-8 space-y-8">
        <h1 className="text-2xl font-display font-bold">Test Payouts & Reports</h1>

        {/* SECTION 1: Payout Readiness */}
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-display">Payout Readiness</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchArtistsWithEarnings}
              disabled={loadingArtists}
            >
              <RefreshCw className={cn("w-4 h-4", loadingArtists && "animate-spin")} />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingArtists ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : artists.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No artists found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artist</TableHead>
                      <TableHead>Stripe Status</TableHead>
                      <TableHead className="text-right">Unpaid Earnings</TableHead>
                      <TableHead>Last Payout</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {artists.map((artist) => (
                      <TableRow key={artist.id}>
                        <TableCell className="font-medium">{artist.artist_name}</TableCell>
                        <TableCell>{getStripeStatusBadge(artist.payout_status)}</TableCell>
                        <TableCell className="text-right">
                          {artist.unpaid_credits > 0 ? (
                            <span className="text-primary">
                              {artist.unpaid_credits} credits (${artist.unpaid_usd.toFixed(2)})
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {artist.last_payout_date
                            ? format(new Date(artist.last_payout_date), "MMM d, yyyy")
                            : "Never"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION 2: Run Weekly Payout */}
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-lg font-display">
              Run Weekly Payout Now (TEST MODE)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Period Selector */}
            <div className="space-y-2">
              <Label>Payout Period</Label>
              <Select
                value={periodType}
                onValueChange={(v) => setPeriodType(v as "this-week" | "custom")}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  <SelectItem value="this-week">
                    This Week ({format(thisWeekStart, "MMM d")} – {format(thisWeekEnd, "MMM d")})
                  </SelectItem>
                  <SelectItem value="custom">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>

              {periodType === "custom" && (
                <div className="flex gap-2 mt-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal bg-background",
                          !customDateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateRange.from
                          ? format(customDateRange.from, "MMM d, yyyy")
                          : "Start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateRange.from}
                        onSelect={(date) =>
                          setCustomDateRange((prev) => ({ ...prev, from: date }))
                        }
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "flex-1 justify-start text-left font-normal bg-background",
                          !customDateRange.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customDateRange.to
                          ? format(customDateRange.to, "MMM d, yyyy")
                          : "End date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
                      <Calendar
                        mode="single"
                        selected={customDateRange.to}
                        onSelect={(date) =>
                          setCustomDateRange((prev) => ({ ...prev, to: date }))
                        }
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>

            <Button
              onClick={handleRunPayout}
              disabled={isRunningPayout}
              className="w-full"
              size="lg"
            >
              {isRunningPayout ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing Payouts...
                </>
              ) : (
                "RUN PAYOUT NOW"
              )}
            </Button>

            {/* Results Panel */}
            {payoutResults.length > 0 && (
              <Card className="border-border/30 bg-muted/20 mt-4">
                <CardContent className="pt-4 space-y-4">
                  <h4 className="font-medium">Payout Results</h4>
                  
                  {/* Successful Payouts */}
                  {payoutResults.filter((r) => r.success).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-green-500 font-medium">
                        ✓ Successful Payouts
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Artist</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Transfer ID</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payoutResults
                            .filter((r) => r.success)
                            .map((result, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{result.artist_name}</TableCell>
                                <TableCell className="text-right">
                                  {result.credits} credits (${result.usd.toFixed(2)})
                                </TableCell>
                                <TableCell className="font-mono text-xs">
                                  {result.stripe_transfer_id}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Failed Payouts */}
                  {payoutResults.filter((r) => !r.success).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm text-red-500 font-medium">
                        ✗ Failed Payouts
                      </p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Artist</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Error</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payoutResults
                            .filter((r) => !r.success)
                            .map((result, idx) => (
                              <TableRow key={idx}>
                                <TableCell>{result.artist_name}</TableCell>
                                <TableCell className="text-right">
                                  {result.credits} credits (${result.usd.toFixed(2)})
                                </TableCell>
                                <TableCell className="text-red-400 text-sm">
                                  {result.error}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetryFailed}
                        disabled={isRunningPayout}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retry Failed
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>

        {/* SECTION 3: Transaction Ledger */}
        <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-display">
              Transaction Ledger (Preview)
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchLedgerEntries}
                disabled={loadingLedger}
              >
                <RefreshCw className={cn("w-4 h-4", loadingLedger && "animate-spin")} />
              </Button>
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search by user or reference..."
                  value={ledgerFilter.search}
                  onChange={(e) =>
                    setLedgerFilter((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="bg-background"
                />
              </div>
              <Select
                value={ledgerFilter.type}
                onValueChange={(v) => setLedgerFilter((prev) => ({ ...prev, type: v }))}
              >
                <SelectTrigger className="w-[180px] bg-background">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="ARTIST_EARNING">Artist Earning</SelectItem>
                  <SelectItem value="PLATFORM_EARNING">Platform Earning</SelectItem>
                  <SelectItem value="CREDITS_PURCHASE">Credits Purchase</SelectItem>
                  <SelectItem value="SUBSCRIPTION_CREDITS">Subscription Credits</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ledger Table */}
            {loadingLedger ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLedgerEntries.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No ledger entries found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>User/Artist</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                      <TableHead className="text-right">USD</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLedgerEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(entry.created_at), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {entry.type.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate">
                          {entry.user_email}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {entry.credits_delta > 0 ? "+" : ""}
                          {entry.credits_delta}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${Number(entry.usd_delta).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {entry.payout_batch_id ? (
                            <Badge
                              variant="outline"
                              className="border-green-500 text-green-500 text-xs"
                            >
                              Paid
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="border-yellow-500 text-yellow-500 text-xs"
                            >
                              Unpaid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {entry.reference || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default TestPayouts;
