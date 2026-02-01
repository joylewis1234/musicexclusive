import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Search, Users, Music, DollarSign } from "lucide-react";
import { format } from "date-fns";

interface FanStreamSummary {
  fan_id: string;
  fan_email: string;
  total_streams: number;
  total_credits: number;
  total_spent: number;
  unique_artists: number;
  unique_tracks: number;
  first_stream: string;
  last_stream: string;
}

interface FanStreamDetail {
  stream_id: string;
  fan_id: string;
  fan_email: string;
  fan_display_name: string;
  artist_id: string;
  artist_name: string;
  track_id: string;
  track_title: string;
  credits_spent: number;
  amount_total: number;
  amount_artist: number;
  amount_platform: number;
  payout_status: string;
  created_at: string;
}

export const FanStreamReport = () => {
  const [summaryData, setSummaryData] = useState<FanStreamSummary[]>([]);
  const [detailData, setDetailData] = useState<FanStreamDetail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"summary" | "detail">("summary");
  const [selectedFanEmail, setSelectedFanEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchSummaryData();
  }, []);

  const fetchSummaryData = async () => {
    setIsLoading(true);
    try {
      // Use the unified admin_stream_report_view
      const { data: streams, error } = await supabase
        .from("admin_stream_report_view")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Aggregate by fan
      const fanMap = new Map<string, FanStreamSummary>();

      streams?.forEach((stream) => {
        const existing = fanMap.get(stream.fan_email);
        if (existing) {
          existing.total_streams += 1;
          existing.total_credits += stream.credits_spent;
          existing.total_spent += Number(stream.amount_total);
          if (stream.created_at < existing.first_stream) {
            existing.first_stream = stream.created_at;
          }
          if (stream.created_at > existing.last_stream) {
            existing.last_stream = stream.created_at;
          }
        } else {
          fanMap.set(stream.fan_email, {
            fan_id: stream.fan_id,
            fan_email: stream.fan_email,
            total_streams: 1,
            total_credits: stream.credits_spent,
            total_spent: Number(stream.amount_total),
            unique_artists: 0,
            unique_tracks: 0,
            first_stream: stream.created_at,
            last_stream: stream.created_at,
          });
        }
      });

      // Calculate unique artists/tracks per fan
      fanMap.forEach((summary, email) => {
        const fanStreams = streams?.filter((s) => s.fan_email === email) || [];
        summary.unique_artists = new Set(fanStreams.map((s) => s.artist_id)).size;
        summary.unique_tracks = new Set(fanStreams.map((s) => s.track_id)).size;
      });

      setSummaryData(Array.from(fanMap.values()));
    } catch (error) {
      console.error("Error fetching fan stream data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFanDetails = async (fanEmail: string) => {
    setSelectedFanEmail(fanEmail);
    setViewMode("detail");
    setIsLoading(true);

    try {
      // Use the unified view for details too
      const { data, error } = await supabase
        .from("admin_stream_report_view")
        .select("*")
        .eq("fan_email", fanEmail)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDetailData(data || []);
    } catch (error) {
      console.error("Error fetching fan details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    const data = viewMode === "summary" ? summaryData : detailData;
    const headers = viewMode === "summary"
      ? ["Fan Email", "Total Streams", "Credits Spent", "Amount Spent ($)", "Unique Artists", "Unique Tracks", "First Stream", "Last Stream"]
      : ["Fan Email", "Artist", "Track", "Credits", "Amount ($)", "Date", "Payout Status"];

    const rows = viewMode === "summary"
      ? summaryData.map(row => [
          row.fan_email,
          row.total_streams,
          row.total_credits,
          row.total_spent.toFixed(2),
          row.unique_artists,
          row.unique_tracks,
          format(new Date(row.first_stream), "yyyy-MM-dd HH:mm"),
          format(new Date(row.last_stream), "yyyy-MM-dd HH:mm"),
        ])
      : detailData.map(row => [
          row.fan_email,
          row.artist_name,
          row.track_title,
          row.credits_spent,
          Number(row.amount_total).toFixed(2),
          format(new Date(row.created_at), "yyyy-MM-dd HH:mm"),
          row.payout_status,
        ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fan-streams-${viewMode}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const filteredSummary = summaryData.filter(row =>
    row.fan_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate totals
  const totals = {
    totalStreams: summaryData.reduce((sum, r) => sum + r.total_streams, 0),
    totalCredits: summaryData.reduce((sum, r) => sum + r.total_credits, 0),
    totalSpent: summaryData.reduce((sum, r) => sum + r.total_spent, 0),
    uniqueFans: summaryData.length,
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlowCard className="p-4 text-center">
          <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold">{totals.uniqueFans}</p>
          <p className="text-xs text-muted-foreground">Total Fans</p>
        </GlowCard>
        <GlowCard className="p-4 text-center">
          <Music className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold">{totals.totalStreams}</p>
          <p className="text-xs text-muted-foreground">Total Streams</p>
        </GlowCard>
        <GlowCard className="p-4 text-center">
          <DollarSign className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="text-2xl font-bold">{totals.totalCredits}</p>
          <p className="text-xs text-muted-foreground">Credits Used</p>
        </GlowCard>
        <GlowCard className="p-4 text-center">
          <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-500" />
          <p className="text-2xl font-bold">${totals.totalSpent.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Revenue</p>
        </GlowCard>
      </div>

      <GlowCard className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <SectionHeader 
            title={viewMode === "summary" ? "Fan Stream Summary" : `Streams by ${selectedFanEmail}`} 
            align="left" 
          />
          <div className="flex items-center gap-2">
            {viewMode === "detail" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("summary")}
              >
                Back to Summary
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {viewMode === "summary" && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : viewMode === "summary" ? (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Fan Email</TableHead>
                  <TableHead className="text-right">Streams</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                  <TableHead className="text-right">Artists</TableHead>
                  <TableHead className="text-right">Tracks</TableHead>
                  <TableHead>Last Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No stream data found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSummary.map((row) => (
                    <TableRow 
                      key={row.fan_id} 
                      className="cursor-pointer hover:bg-muted/20"
                      onClick={() => fetchFanDetails(row.fan_email)}
                    >
                      <TableCell className="font-medium">{row.fan_email}</TableCell>
                      <TableCell className="text-right">{row.total_streams}</TableCell>
                      <TableCell className="text-right">{row.total_credits}</TableCell>
                      <TableCell className="text-right">${row.total_spent.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{row.unique_artists}</TableCell>
                      <TableCell className="text-right">{row.unique_tracks}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(row.last_stream), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Date</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailData.map((row) => (
                  <TableRow key={row.stream_id}>
                    <TableCell className="text-sm">
                      {format(new Date(row.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm">{row.artist_name}</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{row.track_title}</TableCell>
                    <TableCell className="text-right">{row.credits_spent}</TableCell>
                    <TableCell className="text-right">${Number(row.amount_total).toFixed(2)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        row.payout_status === "paid" 
                          ? "bg-green-500/20 text-green-400" 
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {row.payout_status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </GlowCard>
    </div>
  );
};
