import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, Search } from "lucide-react";
import { format } from "date-fns";

interface ArtistProfile {
  user_id: string;
  artist_name: string;
}

interface EarningEntry {
  id: string;
  credits_spent: number;
  amount_artist: number;
  amount_platform: number;
  amount_total: number;
  track_id: string;
  track_title?: string;
  fan_email: string;
  created_at: string;
  payout_batch_id: string | null;
  payout_status: string;
}

interface PayoutBatch {
  id: string;
  status: string;
  paid_at: string | null;
  total_usd: number;
  total_credits: number;
  total_gross: number;
  total_artist_net: number;
  total_platform_fee: number;
  week_start: string;
  week_end: string;
}

export function ArtistEarningsStatements() {
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [selectedArtist, setSelectedArtist] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [earnings, setEarnings] = useState<EarningEntry[]>([]);
  const [payouts, setPayouts] = useState<PayoutBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    const { data } = await supabase
      .from("artist_profiles")
      .select("user_id, artist_name")
      .order("artist_name");
    setArtists(data || []);
  };

  const fetchStatement = async () => {
    if (!selectedArtist) return;
    
    setIsLoading(true);
    try {
      // Get the artist profile to find the profile ID (used in stream_ledger.artist_id)
      const { data: artistProfile } = await supabase
        .from("artist_profiles")
        .select("id, user_id")
        .eq("user_id", selectedArtist)
        .maybeSingle();

      if (!artistProfile) {
        console.error("Artist profile not found for user_id:", selectedArtist);
        setEarnings([]);
        setPayouts([]);
        setIsLoading(false);
        return;
      }

      // Fetch earnings from stream_ledger using the admin view for track titles
      let earningsQuery = supabase
        .from("admin_stream_report_view")
        .select("stream_id, credits_spent, amount_artist, amount_platform, amount_total, track_id, track_title, fan_email, created_at, payout_batch_id, payout_status")
        .eq("artist_id", artistProfile.id)
        .order("created_at", { ascending: false });

      if (dateFrom) {
        earningsQuery = earningsQuery.gte("created_at", dateFrom);
      }
      if (dateTo) {
        earningsQuery = earningsQuery.lte("created_at", dateTo + "T23:59:59");
      }

      const { data: earningsData, error: earningsError } = await earningsQuery;
      
      if (earningsError) {
        console.error("Error fetching earnings:", earningsError);
      }
      
      // Map the view data to our expected format
      const mappedEarnings: EarningEntry[] = (earningsData || []).map((e: any) => ({
        id: e.stream_id,
        credits_spent: e.credits_spent,
        amount_artist: e.amount_artist,
        amount_platform: e.amount_platform,
        amount_total: e.amount_total,
        track_id: e.track_id,
        track_title: e.track_title,
        fan_email: e.fan_email,
        created_at: e.created_at,
        payout_batch_id: e.payout_batch_id,
        payout_status: e.payout_status,
      }));
      
      setEarnings(mappedEarnings);

      // Fetch payout batches using the artist's user_id
      let payoutsQuery = supabase
        .from("payout_batches")
        .select("*")
        .eq("artist_user_id", selectedArtist)
        .order("week_start", { ascending: false });

      if (dateFrom) {
        payoutsQuery = payoutsQuery.gte("week_start", dateFrom);
      }
      if (dateTo) {
        payoutsQuery = payoutsQuery.lte("week_end", dateTo + "T23:59:59");
      }

      const { data: payoutsData } = await payoutsQuery;
      setPayouts(payoutsData || []);
    } catch (error) {
      console.error("Error fetching statement:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = () => {
    const artistName = artists.find(a => a.user_id === selectedArtist)?.artist_name || "Unknown";
    
    const headers = ["Date", "Track", "Fan Email", "Credits", "Artist Share", "Platform Share", "Total", "Status"];
    const rows = earnings.map(e => {
      return [
        format(new Date(e.created_at), "yyyy-MM-dd HH:mm"),
        e.track_title || e.track_id,
        e.fan_email,
        e.credits_spent.toString(),
        Number(e.amount_artist).toFixed(2),
        Number(e.amount_platform).toFixed(2),
        Number(e.amount_total).toFixed(2),
        e.payout_status,
      ];
    });

    // Add payout summary rows
    for (const payout of payouts) {
      rows.push([
        payout.paid_at ? format(new Date(payout.paid_at), "yyyy-MM-dd HH:mm") : format(new Date(payout.week_end), "yyyy-MM-dd"),
        "--- PAYOUT BATCH ---",
        "",
        payout.total_credits.toString(),
        Number(payout.total_artist_net).toFixed(2),
        Number(payout.total_platform_fee).toFixed(2),
        Number(payout.total_gross).toFixed(2),
        payout.status,
      ]);
    }

    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artistName}-statement-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate totals from stream earnings (artist share)
  const totalEarned = earnings.reduce((sum, e) => sum + Number(e.amount_artist), 0);
  const totalPaid = payouts.filter(p => p.status === "paid").reduce((sum, p) => sum + Number(p.total_artist_net), 0);
  const totalPending = payouts.filter(p => p.status === "pending").reduce((sum, p) => sum + Number(p.total_artist_net), 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <GlowCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Select value={selectedArtist} onValueChange={setSelectedArtist}>
            <SelectTrigger className="bg-background/50">
              <SelectValue placeholder="Select Artist" />
            </SelectTrigger>
            <SelectContent>
              {artists.map((artist) => (
                <SelectItem key={artist.user_id} value={artist.user_id}>
                  {artist.artist_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            placeholder="From Date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-background/50"
          />
          <Input
            type="date"
            placeholder="To Date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-background/50"
          />
          <Button onClick={fetchStatement} disabled={!selectedArtist}>
            <Search className="w-4 h-4 mr-1" /> Generate Statement
          </Button>
        </div>
      </GlowCard>

      {selectedArtist && earnings.length > 0 && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlowCard className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Earned</p>
              <p className="text-2xl font-bold text-primary">${totalEarned.toFixed(2)}</p>
            </GlowCard>
            <GlowCard className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Paid Out</p>
              <p className="text-2xl font-bold text-green-400">${totalPaid.toFixed(2)}</p>
            </GlowCard>
            <GlowCard className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending Payout</p>
              <p className="text-2xl font-bold text-yellow-400">${totalPending.toFixed(2)}</p>
            </GlowCard>
          </div>

          {/* Export */}
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-1" /> Export Statement
            </Button>
          </div>

          {/* Earnings Table */}
          <GlowCard className="overflow-hidden">
            <div className="p-3 border-b border-border">
              <h3 className="font-semibold text-sm">Earnings Details</h3>
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
                      <TableHead>Date</TableHead>
                      <TableHead>Track</TableHead>
                      <TableHead className="text-right">Artist Share</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earnings.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(entry.created_at), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell className="text-sm max-w-[150px] truncate">
                          {entry.track_title || "Unknown Track"}
                        </TableCell>
                        <TableCell className="text-right font-mono text-green-400">
                          +${Number(entry.amount_artist).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            entry.payout_status === "paid" ? "bg-green-500/20 text-green-400" :
                            entry.payout_status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {entry.payout_status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </GlowCard>

          {/* Payouts Table */}
          <GlowCard className="overflow-hidden">
            <div className="p-3 border-b border-border">
              <h3 className="font-semibold text-sm">Payout History</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Paid At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payouts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-4">
                        No payouts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    payouts.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(new Date(payout.week_start), "MMM d")} - {format(new Date(payout.week_end), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${Number(payout.total_usd).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            payout.status === "paid" ? "bg-green-500/20 text-green-400" :
                            payout.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                            payout.status === "failed" ? "bg-red-500/20 text-red-400" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {payout.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {payout.paid_at ? format(new Date(payout.paid_at), "MMM d, yyyy HH:mm") : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </GlowCard>
        </>
      )}

      {selectedArtist && !isLoading && earnings.length === 0 && (
        <GlowCard className="p-8 text-center">
          <p className="text-muted-foreground">No earnings found for this artist in the selected period.</p>
        </GlowCard>
      )}
    </div>
  );
}
