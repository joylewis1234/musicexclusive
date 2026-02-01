import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, Search, X, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface StreamEntry {
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
  created_at: string;
}

interface ArtistOption {
  id: string;
  artist_name: string;
}

interface TrackOption {
  id: string;
  title: string;
}

export function TransactionLedger() {
  const [entries, setEntries] = useState<StreamEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [tracks, setTracks] = useState<TrackOption[]>([]);
  
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    artistId: "all_artists",
    trackId: "all_tracks",
    fanEmail: "",
  });

  useEffect(() => {
    fetchOptions();
    fetchEntries();
  }, []);

  const fetchOptions = async () => {
    // Fetch artists from the unified view for consistency
    const { data: artistData } = await supabase
      .from("public_artist_profiles")
      .select("id, artist_name")
      .order("artist_name");
    setArtists((artistData || []).map(a => ({ id: a.id || "", artist_name: a.artist_name || "Unknown" })));

    // Fetch tracks
    const { data: trackData } = await supabase
      .from("tracks")
      .select("id, title")
      .order("title");
    setTracks(trackData || []);
  };

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      // Use admin_stream_report_view as the ONLY data source
      let query = supabase
        .from("admin_stream_report_view")
        .select("stream_id, fan_id, fan_email, fan_display_name, artist_id, artist_name, track_id, track_title, credits_spent, amount_total, amount_artist, amount_platform, created_at")
        .order("created_at", { ascending: false })
        .limit(500);

      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("created_at", filters.dateTo + "T23:59:59");
      }
      if (filters.artistId && filters.artistId !== "all_artists") {
        query = query.eq("artist_id", filters.artistId);
      }
      if (filters.trackId && filters.trackId !== "all_tracks") {
        query = query.eq("track_id", filters.trackId);
      }
      if (filters.fanEmail) {
        query = query.ilike("fan_email", `%${filters.fanEmail}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Map the view columns to our interface
      const mappedEntries: StreamEntry[] = (data || []).map(e => ({
        stream_id: e.stream_id || "",
        fan_id: e.fan_id || "",
        fan_email: e.fan_email || "",
        fan_display_name: e.fan_display_name || e.fan_email?.split("@")[0] || "Unknown",
        artist_id: e.artist_id || "",
        artist_name: e.artist_name || "Unknown",
        track_id: e.track_id || "",
        track_title: e.track_title || "Unknown",
        credits_spent: e.credits_spent || 0,
        amount_total: Number(e.amount_total) || 0,
        amount_artist: Number(e.amount_artist) || 0,
        amount_platform: Number(e.amount_platform) || 0,
        created_at: e.created_at || "",
      }));

      setEntries(mappedEntries);
    } catch (error) {
      console.error("Error fetching stream entries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    fetchEntries();
  };

  const clearFilters = () => {
    setFilters({ dateFrom: "", dateTo: "", artistId: "all_artists", trackId: "all_tracks", fanEmail: "" });
  };

  // Export the SAME filtered dataset shown on screen
  const exportCSV = () => {
    const headers = [
      "Timestamp", 
      "Fan Name", 
      "Fan Email", 
      "Artist Name",
      "Track Title", 
      "Credits", 
      "Total $", 
      "$ to Artist",
      "$ to Platform"
    ];
    const rows = entries.map(e => [
      format(new Date(e.created_at), "yyyy-MM-dd HH:mm:ss"),
      e.fan_display_name || "",
      e.fan_email,
      e.artist_name || "",
      e.track_title || "",
      e.credits_spent.toString(),
      e.amount_total.toFixed(2),
      e.amount_artist.toFixed(2),
      e.amount_platform.toFixed(2),
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stream-ledger-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate totals from filtered entries
  const totals = {
    totalStreams: entries.length,
    totalRevenue: entries.reduce((sum, e) => sum + e.amount_total, 0),
    totalToArtists: entries.reduce((sum, e) => sum + e.amount_artist, 0),
    totalPlatform: entries.reduce((sum, e) => sum + e.amount_platform, 0),
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards - Totals for selected date range */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlowCard className="p-4 text-center">
          <p className="text-2xl font-bold">{totals.totalStreams}</p>
          <p className="text-xs text-muted-foreground">Total Streams</p>
        </GlowCard>
        <GlowCard className="p-4 text-center">
          <p className="text-2xl font-bold">${totals.totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Total Revenue</p>
        </GlowCard>
        <GlowCard className="p-4 text-center">
          <p className="text-2xl font-bold text-green-400">${totals.totalToArtists.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Total to Artists</p>
        </GlowCard>
        <GlowCard className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">${totals.totalPlatform.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Platform Share</p>
        </GlowCard>
      </div>

      {/* Filters */}
      <GlowCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <Input
            type="date"
            placeholder="From Date"
            value={filters.dateFrom}
            onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
            className="bg-background/50"
          />
          <Input
            type="date"
            placeholder="To Date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="bg-background/50"
          />
          <Select value={filters.artistId} onValueChange={(v) => setFilters({ ...filters, artistId: v })}>
            <SelectTrigger className="bg-background/50">
              <SelectValue placeholder="All Artists" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all_artists">All Artists</SelectItem>
              {artists.map((artist) => (
                <SelectItem key={artist.id} value={artist.id}>{artist.artist_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filters.trackId} onValueChange={(v) => setFilters({ ...filters, trackId: v })}>
            <SelectTrigger className="bg-background/50">
              <SelectValue placeholder="All Tracks" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all_tracks">All Tracks</SelectItem>
              {tracks.map((track) => (
                <SelectItem key={track.id} value={track.id}>{track.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Fan Email"
            value={filters.fanEmail}
            onChange={(e) => setFilters({ ...filters, fanEmail: e.target.value })}
            className="bg-background/50"
          />
          <div className="flex gap-2">
            <Button onClick={handleSearch} className="flex-1">
              <Search className="w-4 h-4 mr-1" /> Search
            </Button>
            <Button variant="outline" size="icon" onClick={clearFilters}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </GlowCard>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing {entries.length} entries
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchEntries}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
        </div>
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
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Fan Name</TableHead>
                  <TableHead>Fan Email</TableHead>
                  <TableHead>Artist Name</TableHead>
                  <TableHead>Track Title</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Total $</TableHead>
                  <TableHead className="text-right">$ to Artist</TableHead>
                  <TableHead className="text-right">$ to Platform</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.stream_id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(entry.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{entry.fan_display_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{entry.fan_email}</TableCell>
                      <TableCell className="text-sm">{entry.artist_name}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{entry.track_title}</TableCell>
                      <TableCell className="text-right font-mono">{entry.credits_spent}</TableCell>
                      <TableCell className="text-right font-mono">${entry.amount_total.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-green-400">${entry.amount_artist.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-primary">${entry.amount_platform.toFixed(2)}</TableCell>
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
