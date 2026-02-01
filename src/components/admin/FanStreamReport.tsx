import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Download, Search, Users, Music, DollarSign, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface FanStreamSummary {
  fan_id: string;
  fan_email: string;
  fan_display_name: string;
  membership_type: string;
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

interface VaultMemberInfo {
  id: string;
  email: string;
  display_name: string;
  vault_access_active: boolean;
  credits: number;
}

export const FanStreamReport = () => {
  const [summaryData, setSummaryData] = useState<FanStreamSummary[]>([]);
  const [detailData, setDetailData] = useState<FanStreamDetail[]>([]);
  const [vaultMembers, setVaultMembers] = useState<Map<string, VaultMemberInfo>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [membershipFilter, setMembershipFilter] = useState("all_memberships");
  const [viewMode, setViewMode] = useState<"summary" | "detail">("summary");
  const [selectedFan, setSelectedFan] = useState<FanStreamSummary | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch vault members for membership info
      const { data: members, error: membersError } = await supabase
        .from("vault_members")
        .select("id, email, display_name, vault_access_active, credits");

      if (membersError) throw membersError;

      const memberMap = new Map<string, VaultMemberInfo>();
      members?.forEach((m) => {
        memberMap.set(m.email.toLowerCase(), m);
      });
      setVaultMembers(memberMap);

      // Fetch all streams from admin view
      const { data: streams, error: streamsError } = await supabase
        .from("admin_stream_report_view")
        .select("*")
        .order("created_at", { ascending: false });

      if (streamsError) throw streamsError;

      // Aggregate by fan
      const fanMap = new Map<string, FanStreamSummary>();
      const fanArtists = new Map<string, Set<string>>();
      const fanTracks = new Map<string, Set<string>>();

      streams?.forEach((stream) => {
        const fanEmail = stream.fan_email?.toLowerCase() || "";
        const memberInfo = memberMap.get(fanEmail);
        
        const existing = fanMap.get(fanEmail);
        if (existing) {
          existing.total_streams += 1;
          existing.total_credits += stream.credits_spent || 0;
          existing.total_spent += Number(stream.amount_total) || 0;
          if (stream.created_at < existing.first_stream) {
            existing.first_stream = stream.created_at;
          }
          if (stream.created_at > existing.last_stream) {
            existing.last_stream = stream.created_at;
          }
          // Track unique artists/tracks
          if (stream.artist_id) fanArtists.get(fanEmail)?.add(stream.artist_id);
          if (stream.track_id) fanTracks.get(fanEmail)?.add(stream.track_id);
        } else {
          fanMap.set(fanEmail, {
            fan_id: stream.fan_id || "",
            fan_email: stream.fan_email || "",
            fan_display_name: stream.fan_display_name || memberInfo?.display_name || stream.fan_email || "Unknown",
            membership_type: memberInfo?.vault_access_active ? "Active Member" : "Inactive",
            total_streams: 1,
            total_credits: stream.credits_spent || 0,
            total_spent: Number(stream.amount_total) || 0,
            unique_artists: 0,
            unique_tracks: 0,
            first_stream: stream.created_at,
            last_stream: stream.created_at,
          });
          fanArtists.set(fanEmail, new Set(stream.artist_id ? [stream.artist_id] : []));
          fanTracks.set(fanEmail, new Set(stream.track_id ? [stream.track_id] : []));
        }
      });

      // Calculate unique counts
      fanMap.forEach((summary, email) => {
        summary.unique_artists = fanArtists.get(email)?.size || 0;
        summary.unique_tracks = fanTracks.get(email)?.size || 0;
      });

      setSummaryData(Array.from(fanMap.values()));
    } catch (error) {
      console.error("Error fetching fan stream data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFanDetails = async (fan: FanStreamSummary) => {
    setSelectedFan(fan);
    setViewMode("detail");
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("admin_stream_report_view")
        .select("*")
        .eq("fan_email", fan.fan_email)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const details: FanStreamDetail[] = (data || []).map((row) => ({
        stream_id: row.stream_id || "",
        fan_id: row.fan_id || "",
        fan_email: row.fan_email || "",
        fan_display_name: row.fan_display_name || fan.fan_display_name,
        artist_id: row.artist_id || "",
        artist_name: row.artist_name || "Unknown Artist",
        track_id: row.track_id || "",
        track_title: row.track_title || "Unknown Track",
        credits_spent: row.credits_spent || 0,
        amount_total: Number(row.amount_total) || 0,
        amount_artist: Number(row.amount_artist) || 0,
        amount_platform: Number(row.amount_platform) || 0,
        payout_status: row.payout_status || "pending",
        created_at: row.created_at || "",
      }));

      setDetailData(details);
    } catch (error) {
      console.error("Error fetching fan details:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    if (viewMode === "summary") {
      const headers = ["Fan Name", "Fan Email", "Membership", "Total Streams", "Credits Spent", "Amount Spent ($)", "Unique Artists", "Unique Tracks", "First Stream", "Last Stream"];
      const rows = filteredSummary.map(row => [
        row.fan_display_name,
        row.fan_email,
        row.membership_type,
        row.total_streams,
        row.total_credits,
        row.total_spent.toFixed(2),
        row.unique_artists,
        row.unique_tracks,
        format(new Date(row.first_stream), "yyyy-MM-dd HH:mm"),
        format(new Date(row.last_stream), "yyyy-MM-dd HH:mm"),
      ]);
      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      downloadCSV(csvContent, `fan-activity-summary-${format(new Date(), "yyyy-MM-dd")}.csv`);
    } else {
      const headers = ["Date/Time", "Artist", "Track", "Credits", "Total ($)", "Artist ($)", "Platform ($)", "Status"];
      const rows = detailData.map(row => [
        format(new Date(row.created_at), "yyyy-MM-dd HH:mm"),
        row.artist_name,
        row.track_title,
        row.credits_spent,
        row.amount_total.toFixed(2),
        row.amount_artist.toFixed(2),
        row.amount_platform.toFixed(2),
        row.payout_status,
      ]);
      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      downloadCSV(csvContent, `fan-streams-${selectedFan?.fan_email || "detail"}-${format(new Date(), "yyyy-MM-dd")}.csv`);
    }
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter summary data
  const filteredSummary = summaryData.filter(row => {
    const matchesSearch = 
      row.fan_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.fan_display_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMembership = 
      membershipFilter === "all_memberships" ||
      (membershipFilter === "active" && row.membership_type === "Active Member") ||
      (membershipFilter === "inactive" && row.membership_type === "Inactive");
    
    return matchesSearch && matchesMembership;
  });

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
          <div className="flex items-center gap-2">
            {viewMode === "detail" && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setViewMode("summary");
                  setSelectedFan(null);
                }}
                className="mr-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <SectionHeader 
              title={viewMode === "summary" ? "Fan Activity" : `Streams: ${selectedFan?.fan_display_name || selectedFan?.fan_email}`} 
              align="left" 
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {viewMode === "summary" && (
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={membershipFilter} onValueChange={setMembershipFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by membership" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_memberships">All Members</SelectItem>
                <SelectItem value="active">Active Members</SelectItem>
                <SelectItem value="inactive">Inactive Members</SelectItem>
              </SelectContent>
            </Select>
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
                  <TableHead>Fan Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Membership</TableHead>
                  <TableHead className="text-right">Streams</TableHead>
                  <TableHead className="text-right">Spent</TableHead>
                  <TableHead className="hidden md:table-cell">Last Stream</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSummary.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No fan activity found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSummary.map((row) => (
                    <TableRow 
                      key={row.fan_id || row.fan_email} 
                      className="cursor-pointer hover:bg-muted/20"
                      onClick={() => fetchFanDetails(row)}
                    >
                      <TableCell className="font-medium">{row.fan_display_name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {row.fan_email}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          row.membership_type === "Active Member"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          {row.membership_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{row.total_streams}</TableCell>
                      <TableCell className="text-right">${row.total_spent.toFixed(2)}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
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
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Total $</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Artist $</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No stream history found
                    </TableCell>
                  </TableRow>
                ) : (
                  detailData.map((row) => (
                    <TableRow key={row.stream_id}>
                      <TableCell className="text-sm">
                        {format(new Date(row.created_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">{row.artist_name}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{row.track_title}</TableCell>
                      <TableCell className="text-right">{row.credits_spent}</TableCell>
                      <TableCell className="text-right">${row.amount_total.toFixed(2)}</TableCell>
                      <TableCell className="text-right hidden sm:table-cell">${row.amount_artist.toFixed(2)}</TableCell>
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
};
