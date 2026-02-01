import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
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
  Home,
  LogOut,
  Shield,
  Download,
  Users,
  Music,
  DollarSign,
  ArrowLeft,
  Wallet,
  Crown,
  CreditCard,
  Calendar,
  CheckCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { format, subDays, startOfWeek, isWithinInterval, parseISO } from "date-fns";

const FAN_ACTIVITY_TOOLTIP = "See each fan's stream history, membership status, and spending. Tap a fan to view detailed streams.";

interface FanProfile {
  fan_id: string;
  fan_email: string;
  display_name: string;
  vault_access_active: boolean;
  membership_type: "superfan" | "payg" | "unknown";
  credits_balance: number;
  joined_at: string;
}

interface StreamEntry {
  id: string;
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

interface StreamStats {
  totalStreams: number;
  totalSpent: number;
  streamsThisWeek: number;
  spentThisWeek: number;
  lastStreamDate: string | null;
}

const ITEMS_PER_PAGE = 25;

const AdminFanDetail = () => {
  const navigate = useNavigate();
  const { fanId } = useParams<{ fanId: string }>();
  const { signOut } = useAuth();

  // Data states
  const [fanProfile, setFanProfile] = useState<FanProfile | null>(null);
  const [streams, setStreams] = useState<StreamEntry[]>([]);
  const [stats, setStats] = useState<StreamStats>({
    totalStreams: 0,
    totalSpent: 0,
    streamsThisWeek: 0,
    spentThisWeek: 0,
    lastStreamDate: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [dateRange, setDateRange] = useState<string>("all");
  const [artistFilter, setArtistFilter] = useState<string>("all");
  const [trackFilter, setTrackFilter] = useState<string>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Available filter options
  const [availableArtists, setAvailableArtists] = useState<{ id: string; name: string }[]>([]);
  const [availableTracks, setAvailableTracks] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (fanId) {
      fetchFanData();
    }
  }, [fanId]);

  const fetchFanData = async () => {
    if (!fanId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Fetch fan profile from vault_members
      const { data: member, error: memberError } = await supabase
        .from("vault_members")
        .select("*")
        .eq("id", fanId)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!member) {
        setError("Fan not found");
        setIsLoading(false);
        return;
      }

      // Determine membership type
      let membershipType: FanProfile["membership_type"] = "unknown";
      if (member.vault_access_active) {
        membershipType = member.credits >= 25 ? "superfan" : "payg";
      }

      setFanProfile({
        fan_id: member.id,
        fan_email: member.email,
        display_name: member.display_name || member.email.split("@")[0],
        vault_access_active: member.vault_access_active,
        membership_type: membershipType,
        credits_balance: member.credits,
        joined_at: member.joined_at,
      });

      // Fetch all streams for this fan
      const { data: streamData, error: streamsError } = await supabase
        .from("stream_ledger")
        .select("*")
        .eq("fan_email", member.email)
        .order("created_at", { ascending: false });

      if (streamsError) throw streamsError;

      // Get track IDs and artist IDs for enrichment
      const trackIds = [...new Set((streamData || []).map((s) => s.track_id))];
      const artistIds = [...new Set((streamData || []).map((s) => s.artist_id))];

      // Fetch tracks
      const { data: tracks } = await supabase
        .from("tracks")
        .select("id, title")
        .in("id", trackIds.length > 0 ? trackIds : ["00000000-0000-0000-0000-000000000000"]);

      // Fetch artists from public view
      const { data: artists } = await supabase
        .from("public_artist_profiles")
        .select("id, user_id, artist_name")
        .in("user_id", artistIds.length > 0 ? artistIds : ["00000000-0000-0000-0000-000000000000"]);

      // Create lookup maps
      const trackMap = new Map((tracks || []).map((t) => [t.id, t.title]));
      const artistMap = new Map((artists || []).map((a) => [a.user_id, a.artist_name]));

      // Enrich streams
      const enrichedStreams: StreamEntry[] = (streamData || []).map((s) => ({
        id: s.id,
        artist_id: s.artist_id,
        artist_name: artistMap.get(s.artist_id) || "Unknown Artist",
        track_id: s.track_id,
        track_title: trackMap.get(s.track_id) || "Unknown Track",
        credits_spent: s.credits_spent,
        amount_total: Number(s.amount_total),
        amount_artist: Number(s.amount_artist),
        amount_platform: Number(s.amount_platform),
        payout_status: s.payout_status,
        created_at: s.created_at,
      }));

      setStreams(enrichedStreams);

      // Build filter options
      const uniqueArtists = new Map<string, string>();
      const uniqueTracks = new Map<string, string>();
      enrichedStreams.forEach((s) => {
        uniqueArtists.set(s.artist_id, s.artist_name);
        uniqueTracks.set(s.track_id, s.track_title);
      });
      setAvailableArtists(Array.from(uniqueArtists.entries()).map(([id, name]) => ({ id, name })));
      setAvailableTracks(Array.from(uniqueTracks.entries()).map(([id, title]) => ({ id, title })));

      // Calculate stats
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      const weekEnd = new Date();
      
      const thisWeekStreams = enrichedStreams.filter((s) => {
        const streamDate = parseISO(s.created_at);
        return isWithinInterval(streamDate, { start: weekStart, end: weekEnd });
      });

      setStats({
        totalStreams: enrichedStreams.length,
        totalSpent: enrichedStreams.reduce((sum, s) => sum + s.amount_total, 0),
        streamsThisWeek: thisWeekStreams.length,
        spentThisWeek: thisWeekStreams.reduce((sum, s) => sum + s.amount_total, 0),
        lastStreamDate: enrichedStreams.length > 0 ? enrichedStreams[0].created_at : null,
      });
    } catch (err) {
      console.error("Error fetching fan data:", err);
      setError("Failed to load fan data");
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered streams
  const filteredStreams = useMemo(() => {
    return streams.filter((stream) => {
      // Date range filter
      if (dateRange !== "all") {
        const streamDate = parseISO(stream.created_at);
        let cutoff: Date;
        
        if (dateRange === "week") {
          cutoff = startOfWeek(new Date(), { weekStartsOn: 1 });
        } else if (dateRange === "30days") {
          cutoff = subDays(new Date(), 30);
        } else {
          cutoff = new Date(0);
        }
        
        if (streamDate < cutoff) return false;
      }

      // Artist filter
      if (artistFilter !== "all" && stream.artist_id !== artistFilter) {
        return false;
      }

      // Track filter
      if (trackFilter !== "all" && stream.track_id !== trackFilter) {
        return false;
      }

      return true;
    });
  }, [streams, dateRange, artistFilter, trackFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredStreams.length / ITEMS_PER_PAGE);
  const paginatedStreams = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStreams.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredStreams, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateRange, artistFilter, trackFilter]);

  const exportCSV = () => {
    const headers = [
      "Timestamp",
      "Track Title",
      "Track ID",
      "Artist Name",
      "Artist ID",
      "Credits Used",
      "Cost ($)",
      "Artist Payout ($)",
      "Platform Fee ($)",
      "Status",
    ];
    const rows = filteredStreams.map((s) => [
      format(parseISO(s.created_at), "yyyy-MM-dd HH:mm:ss"),
      `"${s.track_title}"`,
      s.track_id,
      `"${s.artist_name}"`,
      s.artist_id,
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
    a.download = `fan-streams-${fanProfile?.fan_email || fanId}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getMembershipBadge = (type: string) => {
    switch (type) {
      case "superfan":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <Crown className="w-4 h-4" /> Superfan
          </span>
        );
      case "payg":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <CreditCard className="w-4 h-4" /> Pay-As-You-Go
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-sm bg-muted text-muted-foreground border border-border">
            Unknown
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
          <div className="container max-w-7xl mx-auto px-4 h-14 flex items-center">
            <Shield className="w-5 h-5 text-primary mr-2" />
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
              Loading Fan Details...
            </span>
          </div>
        </header>
        <main className="pt-20 pb-12 px-4">
          <div className="container max-w-7xl mx-auto space-y-6">
            <Skeleton className="h-40 w-full" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !fanProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <GlowCard className="p-8 text-center max-w-md">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-xl font-display mb-2">{error || "Fan Not Found"}</h2>
          <p className="text-muted-foreground mb-4">
            The fan you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => navigate("/admin/fans")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Fan Activity
          </Button>
        </GlowCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
              Fan Detail
            </span>
            <InfoTooltip message={FAN_ACTIVITY_TOOLTIP} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/admin/fans")}
              className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Back to fans"
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
          {/* Fan Profile Header */}
          <GlowCard className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-display font-bold mb-1">{fanProfile.display_name}</h1>
                <p className="text-muted-foreground">{fanProfile.fan_email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {getMembershipBadge(fanProfile.membership_type)}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border ${
                  fanProfile.vault_access_active 
                    ? "bg-green-500/20 text-green-400 border-green-500/30" 
                    : "bg-red-500/20 text-red-400 border-red-500/30"
                }`}>
                  {fanProfile.vault_access_active ? (
                    <><CheckCircle className="w-4 h-4" /> Vault Active</>
                  ) : (
                    <><Clock className="w-4 h-4" /> No Vault Access</>
                  )}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-primary/20 text-primary border border-primary/30">
                  <Wallet className="w-4 h-4" /> {fanProfile.credits_balance} Credits
                </span>
              </div>
            </div>
          </GlowCard>

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <GlowCard className="p-4 text-center">
              <Music className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{stats.totalStreams}</p>
              <p className="text-xs text-muted-foreground">Lifetime Streams</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <DollarSign className="w-6 h-6 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold">${stats.totalSpent.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Lifetime Spent</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <Music className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <p className="text-2xl font-bold">{stats.streamsThisWeek}</p>
              <p className="text-xs text-muted-foreground">Streams This Week</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <DollarSign className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <p className="text-2xl font-bold">${stats.spentThisWeek.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Spent This Week</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-lg font-bold">
                {stats.lastStreamDate 
                  ? format(parseISO(stats.lastStreamDate), "MMM d, yyyy")
                  : "Never"}
              </p>
              <p className="text-xs text-muted-foreground">Last Stream</p>
            </GlowCard>
          </div>

          {/* Stream History */}
          <GlowCard className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <SectionHeader title="Stream History" align="left" />
              <Button variant="outline" size="sm" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>

              <Select value={artistFilter} onValueChange={setArtistFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Artist" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Artists</SelectItem>
                  {availableArtists.map((artist) => (
                    <SelectItem key={artist.id} value={artist.id}>
                      {artist.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={trackFilter} onValueChange={setTrackFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by Track" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tracks</SelectItem>
                  {availableTracks.map((track) => (
                    <SelectItem key={track.id} value={track.id}>
                      {track.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Results count */}
            <p className="text-sm text-muted-foreground mb-4">
              Showing {paginatedStreams.length} of {filteredStreams.length} streams
            </p>

            {/* Stream Table */}
            <div className="rounded-lg border border-border/50 overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Track Title</TableHead>
                    <TableHead>Artist Name</TableHead>
                    <TableHead className="text-right">Credits</TableHead>
                    <TableHead className="text-right">Cost ($)</TableHead>
                    <TableHead className="text-right">Artist $</TableHead>
                    <TableHead className="text-right">Platform $</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStreams.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No streams found matching filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedStreams.map((stream) => (
                      <TableRow key={stream.id}>
                        <TableCell className="text-sm">
                          {format(parseISO(stream.created_at), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium">{stream.track_title}</TableCell>
                        <TableCell>{stream.artist_name}</TableCell>
                        <TableCell className="text-right">{stream.credits_spent}</TableCell>
                        <TableCell className="text-right">${stream.amount_total.toFixed(2)}</TableCell>
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
                                : stream.payout_status === "pending"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-red-500/20 text-red-400"
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

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </GlowCard>
        </div>
      </main>
    </div>
  );
};

export default AdminFanDetail;
