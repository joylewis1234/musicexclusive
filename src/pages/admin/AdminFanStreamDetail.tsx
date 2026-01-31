import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  Search,
  Download,
  Users,
  Music,
  DollarSign,
  ArrowLeft,
  X,
  Wallet,
  Crown,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays, isAfter, startOfWeek, isWithinInterval } from "date-fns";

interface FanSummary {
  fan_id: string;
  fan_email: string;
  display_name: string;
  vault_status: "won" | "lost" | "pending" | "none";
  membership_type: "superfan" | "payg" | "unknown";
  credits_balance: number;
  total_streams: number;
  streams_this_week: number;
  total_spent: number;
  spent_this_week: number;
  last_stream_date: string | null;
  joined_at: string;
}

interface StreamEntry {
  id: string;
  artist_id: string;
  artist_name?: string;
  track_id: string;
  track_title?: string;
  credits_spent: number;
  amount_total: number;
  amount_artist: number;
  amount_platform: number;
  payout_status: string;
  created_at: string;
}

interface TopArtist {
  artist_id: string;
  artist_name: string;
  stream_count: number;
}

const AdminFanStreamDetail = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [membershipFilter, setMembershipFilter] = useState<string>("all");
  const [vaultStatusFilter, setVaultStatusFilter] = useState<string>("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<string>("all");

  // Data states
  const [fans, setFans] = useState<FanSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Detail modal states
  const [selectedFan, setSelectedFan] = useState<FanSummary | null>(null);
  const [fanStreams, setFanStreams] = useState<StreamEntry[]>([]);
  const [topArtists, setTopArtists] = useState<TopArtist[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  useEffect(() => {
    fetchFans();
  }, []);

  const fetchFans = async () => {
    setIsLoading(true);
    try {
      // Get all vault members
      const { data: members, error: membersError } = await supabase
        .from("vault_members")
        .select("*")
        .order("joined_at", { ascending: false });

      if (membersError) throw membersError;

      // Get vault codes for status
      const { data: vaultCodes, error: codesError } = await supabase
        .from("vault_codes")
        .select("email, status")
        .order("issued_at", { ascending: false });

      if (codesError) throw codesError;

      // Get stream aggregates
      const { data: streams, error: streamsError } = await supabase
        .from("stream_ledger")
        .select("fan_email, credits_spent, amount_total, created_at");

      if (streamsError) throw streamsError;

      // Build fan summaries
      const fanMap = new Map<string, FanSummary>();

      members?.forEach((member) => {
        // Find vault status
        const vaultCode = vaultCodes?.find((vc) => vc.email === member.email);
        const vaultStatus = vaultCode?.status as FanSummary["vault_status"] || "none";

        // Determine membership type based on credits and access
        let membershipType: FanSummary["membership_type"] = "unknown";
        if (member.vault_access_active) {
          membershipType = member.credits >= 25 ? "superfan" : "payg";
        }

        // Calculate stream stats
        const memberStreams = streams?.filter((s) => s.fan_email === member.email) || [];
        const totalStreams = memberStreams.length;
        const totalSpent = memberStreams.reduce((sum, s) => sum + Number(s.amount_total), 0);
        
        // Calculate this week stats
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
        const weekEnd = new Date();
        const thisWeekStreams = memberStreams.filter(s => {
          const streamDate = new Date(s.created_at);
          return isWithinInterval(streamDate, { start: weekStart, end: weekEnd });
        });
        const streamsThisWeek = thisWeekStreams.length;
        const spentThisWeek = thisWeekStreams.reduce((sum, s) => sum + Number(s.amount_total), 0);
        
        const lastStream = memberStreams.length > 0
          ? memberStreams.sort((a, b) => 
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0].created_at
          : null;

        fanMap.set(member.email, {
          fan_id: member.id,
          fan_email: member.email,
          display_name: member.display_name || member.email.split("@")[0],
          vault_status: vaultStatus,
          membership_type: membershipType,
          credits_balance: member.credits,
          total_streams: totalStreams,
          streams_this_week: streamsThisWeek,
          total_spent: totalSpent,
          spent_this_week: spentThisWeek,
          last_stream_date: lastStream,
          joined_at: member.joined_at,
        });
      });

      setFans(Array.from(fanMap.values()));
    } catch (error) {
      console.error("Error fetching fans:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFanDetails = async (fan: FanSummary) => {
    setSelectedFan(fan);
    setIsDetailLoading(true);

    try {
      // Fetch stream history
      const { data: streams, error: streamsError } = await supabase
        .from("stream_ledger")
        .select("*")
        .eq("fan_email", fan.fan_email)
        .order("created_at", { ascending: false });

      if (streamsError) throw streamsError;

      // Fetch track and artist names
      const trackIds = [...new Set(streams?.map((s) => s.track_id) || [])];
      const { data: tracks } = await supabase
        .from("tracks")
        .select("id, title, artist_id")
        .in("id", trackIds);

      const artistIds = [...new Set(streams?.map((s) => s.artist_id) || [])];
      const { data: artists } = await supabase
        .from("public_artist_profiles")
        .select("user_id, artist_name")
        .in("user_id", artistIds);

      // Enrich stream data
      const enrichedStreams: StreamEntry[] = (streams || []).map((s) => {
        const track = tracks?.find((t) => t.id === s.track_id);
        const artist = artists?.find((a) => a.user_id === s.artist_id);
        return {
          ...s,
          artist_name: artist?.artist_name || s.artist_id.slice(0, 8) + "...",
          track_title: track?.title || "Unknown Track",
          amount_artist: Number(s.amount_artist),
          amount_platform: Number(s.amount_platform),
          amount_total: Number(s.amount_total),
        };
      });

      setFanStreams(enrichedStreams);

      // Calculate top 5 artists
      const artistCounts = new Map<string, { name: string; count: number }>();
      enrichedStreams.forEach((s) => {
        const existing = artistCounts.get(s.artist_id);
        if (existing) {
          existing.count += 1;
        } else {
          artistCounts.set(s.artist_id, {
            name: s.artist_name || "Unknown",
            count: 1,
          });
        }
      });

      const sortedArtists = Array.from(artistCounts.entries())
        .map(([id, data]) => ({
          artist_id: id,
          artist_name: data.name,
          stream_count: data.count,
        }))
        .sort((a, b) => b.stream_count - a.stream_count)
        .slice(0, 5);

      setTopArtists(sortedArtists);
    } catch (error) {
      console.error("Error fetching fan details:", error);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // Filter fans
  const filteredFans = useMemo(() => {
    return fans.filter((fan) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        fan.display_name.toLowerCase().includes(searchLower) ||
        fan.fan_email.toLowerCase().includes(searchLower);

      // Membership filter
      const matchesMembership =
        membershipFilter === "all" || fan.membership_type === membershipFilter;

      // Vault status filter
      const matchesVaultStatus =
        vaultStatusFilter === "all" || fan.vault_status === vaultStatusFilter;

      // Date range filter
      let matchesDateRange = true;
      if (dateRangeFilter !== "all" && fan.last_stream_date) {
        const streamDate = new Date(fan.last_stream_date);
        const cutoff =
          dateRangeFilter === "7days"
            ? subDays(new Date(), 7)
            : subDays(new Date(), 30);
        matchesDateRange = isAfter(streamDate, cutoff);
      } else if (dateRangeFilter !== "all" && !fan.last_stream_date) {
        matchesDateRange = false;
      }

      return matchesSearch && matchesMembership && matchesVaultStatus && matchesDateRange;
    });
  }, [fans, searchTerm, membershipFilter, vaultStatusFilter, dateRangeFilter]);

  // Aggregate stats
  const stats = useMemo(() => ({
    totalFans: fans.length,
    activeFans: fans.filter((f) => f.total_streams > 0).length,
    totalStreams: fans.reduce((sum, f) => sum + f.total_streams, 0),
    totalRevenue: fans.reduce((sum, f) => sum + f.total_spent, 0),
  }), [fans]);

  const exportCSV = () => {
    const headers = [
      "Date/Time",
      "Artist Name",
      "Track Title",
      "Credits Used",
      "Cost ($)",
      "Artist Share ($)",
      "Platform Share ($)",
      "Status",
    ];
    const rows = fanStreams.map((s) => [
      format(new Date(s.created_at), "yyyy-MM-dd HH:mm"),
      s.artist_name,
      s.track_title,
      s.credits_spent,
      s.amount_total.toFixed(2),
      s.amount_artist.toFixed(2),
      s.amount_platform.toFixed(2),
      s.payout_status,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fan-streams-${selectedFan?.fan_email}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getMembershipBadge = (type: string) => {
    switch (type) {
      case "superfan":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
            <Crown className="w-3 h-3" /> Superfan
          </span>
        );
      case "payg":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-500/20 text-blue-400">
            <CreditCard className="w-3 h-3" /> PAYG
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
            Unknown
          </span>
        );
    }
  };

  const getVaultStatusBadge = (status: string) => {
    switch (status) {
      case "won":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
            Won
          </span>
        );
      case "lost":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
            Lost
          </span>
        );
      case "pending":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
            Pending
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
            None
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
              Fan Stream Detail (Admin)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/admin/reports")}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Go to reports"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate("/")}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Go home"
            >
              <Home className="w-5 h-5" />
            </button>
            <button
              onClick={handleSignOut}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-7xl mx-auto space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlowCard className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalFans}</p>
              <p className="text-xs text-muted-foreground">Total Fans</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">{stats.activeFans}</p>
              <p className="text-xs text-muted-foreground">Active Fans</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <Music className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalStreams}</p>
              <p className="text-xs text-muted-foreground">Total Streams</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
            </GlowCard>
          </div>

          {/* Filters */}
          <GlowCard className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={membershipFilter} onValueChange={setMembershipFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Membership Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Memberships</SelectItem>
                  <SelectItem value="superfan">Superfan</SelectItem>
                  <SelectItem value="payg">Pay-As-You-Go</SelectItem>
                </SelectContent>
              </Select>

              <Select value={vaultStatusFilter} onValueChange={setVaultStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Vault Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </GlowCard>

          {/* Fan List Table */}
          <GlowCard className="p-6">
            <SectionHeader title="Fan List" align="left" />
            <p className="text-sm text-muted-foreground mb-4">
              Click a row to view detailed stream history
            </p>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border/50 overflow-hidden overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Fan Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Membership</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                      <TableHead className="text-right">Lifetime Streams</TableHead>
                      <TableHead className="text-right">This Week</TableHead>
                      <TableHead className="text-right">Total Spent</TableHead>
                      <TableHead>Last Stream</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No fans found matching filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFans.map((fan) => (
                        <TableRow
                          key={fan.fan_id}
                          className="cursor-pointer hover:bg-muted/20 transition-colors"
                          onClick={() => navigate(`/admin/fans/${fan.fan_id}`)}
                        >
                          <TableCell className="font-medium">{fan.display_name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {fan.fan_email}
                          </TableCell>
                          <TableCell>{getMembershipBadge(fan.membership_type)}</TableCell>
                          <TableCell className="text-right">
                            <span className="inline-flex items-center gap-1">
                              <Wallet className="w-3 h-3 text-primary" />
                              {fan.credits_balance}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{fan.total_streams}</TableCell>
                          <TableCell className="text-right">
                            <span className={fan.streams_this_week > 0 ? "text-green-400" : "text-muted-foreground"}>
                              {fan.streams_this_week}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">${fan.total_spent.toFixed(2)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {fan.last_stream_date
                              ? format(new Date(fan.last_stream_date), "MMM d, yyyy")
                              : "Never"}
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

      {/* Fan Detail Modal */}
      <Dialog open={!!selectedFan} onOpenChange={() => setSelectedFan(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card border-primary/30">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="font-display text-xl">
                Fan Stream History
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setSelectedFan(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          {isDetailLoading ? (
            <div className="space-y-4 py-8">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : selectedFan ? (
            <div className="space-y-6">
              {/* Fan Summary Card */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 rounded-xl bg-muted/20 border border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground">Fan Name</p>
                  <p className="font-semibold">{selectedFan.display_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm">{selectedFan.fan_email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Vault Status</p>
                  {getVaultStatusBadge(selectedFan.vault_status)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Membership</p>
                  {getMembershipBadge(selectedFan.membership_type)}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Credits Balance</p>
                  <p className="font-semibold text-primary">{selectedFan.credits_balance}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lifetime Streams</p>
                  <p className="font-semibold">{selectedFan.total_streams}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Streams This Week</p>
                  <p className="font-semibold text-green-400">{selectedFan.streams_this_week}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lifetime Spent</p>
                  <p className="font-semibold">${selectedFan.total_spent.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Spent This Week</p>
                  <p className="font-semibold text-green-400">${selectedFan.spent_this_week.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="text-sm">
                    {format(new Date(selectedFan.joined_at), "MMM d, yyyy")}
                  </p>
                </div>
              </div>

              {/* Top 5 Artists */}
              {topArtists.length > 0 && (
                <div>
                  <h4 className="font-display text-sm uppercase tracking-wider text-muted-foreground mb-3">
                    Top 5 Artists Streamed
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {topArtists.map((artist, i) => (
                      <span
                        key={artist.artist_id}
                        className="px-3 py-1.5 rounded-full text-sm bg-primary/10 border border-primary/30"
                      >
                        {i + 1}. {artist.artist_name} ({artist.stream_count})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Stream History Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-display text-sm uppercase tracking-wider text-muted-foreground">
                    Stream History
                  </h4>
                  <Button variant="outline" size="sm" onClick={exportCSV}>
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                  </Button>
                </div>

                <div className="rounded-lg border border-border/50 overflow-hidden overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Artist</TableHead>
                        <TableHead>Track</TableHead>
                        <TableHead className="text-right">Credits</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Artist $</TableHead>
                        <TableHead className="text-right">Platform $</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fanStreams.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No streams found
                          </TableCell>
                        </TableRow>
                      ) : (
                        fanStreams.map((stream) => (
                          <TableRow key={stream.id}>
                            <TableCell className="text-sm">
                              {format(new Date(stream.created_at), "MMM d, HH:mm")}
                            </TableCell>
                            <TableCell className="font-medium">{stream.artist_name}</TableCell>
                            <TableCell className="text-sm">{stream.track_title}</TableCell>
                            <TableCell className="text-right">{stream.credits_spent}</TableCell>
                            <TableCell className="text-right">
                              ${stream.amount_total.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-green-400">
                              ${stream.amount_artist.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right text-blue-400">
                              ${stream.amount_platform.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs ${
                                  stream.payout_status === "paid"
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-yellow-500/20 text-yellow-400"
                                }`}
                              >
                                {stream.payout_status}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFanStreamDetail;