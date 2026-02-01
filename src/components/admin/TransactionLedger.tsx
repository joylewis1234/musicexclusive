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
  id: string;
  fan_id: string;
  fan_email: string;
  artist_id: string;
  track_id: string;
  credits_spent: number;
  amount_total: number;
  amount_artist: number;
  amount_platform: number;
  payout_status: string;
  created_at: string;
  // Enriched fields
  artist_name?: string;
  track_title?: string;
  fan_display_name?: string;
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
    artistId: "all",
    trackId: "all",
    fanEmail: "",
  });

  useEffect(() => {
    fetchOptions();
    fetchEntries();
  }, []);

  const fetchOptions = async () => {
    // Fetch artists
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
      let query = supabase
        .from("stream_ledger")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("created_at", filters.dateTo + "T23:59:59");
      }
      if (filters.artistId && filters.artistId !== "all") {
        query = query.eq("artist_id", filters.artistId);
      }
      if (filters.trackId && filters.trackId !== "all") {
        query = query.eq("track_id", filters.trackId);
      }
      if (filters.fanEmail) {
        query = query.ilike("fan_email", `%${filters.fanEmail}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with artist and track names
      const artistIds = [...new Set((data || []).map(s => s.artist_id))];
      const trackIds = [...new Set((data || []).map(s => s.track_id))];
      const fanEmails = [...new Set((data || []).map(s => s.fan_email))];

      // Separate UUID-based artist IDs from legacy email-based ones
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const uuidArtistIds = artistIds.filter(id => uuidPattern.test(id));
      
      // Fetch artist profiles by ID (UUID-based)
      const { data: artistProfiles } = uuidArtistIds.length > 0 
        ? await supabase
            .from("public_artist_profiles")
            .select("id, artist_name")
            .in("id", uuidArtistIds)
        : { data: [] };

      const { data: tracksData } = await supabase
        .from("tracks")
        .select("id, title")
        .in("id", trackIds);

      const { data: fanProfiles } = await supabase
        .from("vault_members")
        .select("email, display_name")
        .in("email", fanEmails);

      // Build artist map from UUID-based profiles
      const artistMap = new Map((artistProfiles || []).map(a => [a.id, a.artist_name]));
      
      // For legacy email-based artist_ids, use the email as the display name
      artistIds.forEach(id => {
        if (!uuidPattern.test(id) && !artistMap.has(id)) {
          // It's an email-based ID, extract artist name from email
          const emailName = id.includes("@") ? id.split("@")[0].replace(/-/g, " ") : id;
          artistMap.set(id, emailName);
        }
      });
      
      const trackMap = new Map((tracksData || []).map(t => [t.id, t.title]));
      const fanMap = new Map((fanProfiles || []).map(f => [f.email, f.display_name]));

      const enrichedEntries = (data || []).map(e => ({
        ...e,
        artist_name: artistMap.get(e.artist_id) || "Unknown",
        track_title: trackMap.get(e.track_id) || "Unknown",
        fan_display_name: fanMap.get(e.fan_email) || e.fan_email.split("@")[0],
      }));

      setEntries(enrichedEntries);
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
    setFilters({ dateFrom: "", dateTo: "", artistId: "all", trackId: "all", fanEmail: "" });
  };

  const exportCSV = () => {
    const headers = [
      "Timestamp", 
      "Fan Name", 
      "Fan Email", 
      "Artist", 
      "Track", 
      "Credits", 
      "Dollar Value", 
      "Platform Cut", 
      "Artist Payout",
      "Status"
    ];
    const rows = entries.map(e => [
      format(new Date(e.created_at), "yyyy-MM-dd HH:mm:ss"),
      e.fan_display_name || "",
      e.fan_email,
      e.artist_name || "",
      e.track_title || "",
      e.credits_spent.toString(),
      Number(e.amount_total).toFixed(2),
      Number(e.amount_platform).toFixed(2),
      Number(e.amount_artist).toFixed(2),
      e.payout_status,
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

  // Calculate totals
  const totals = {
    totalStreams: entries.length,
    totalRevenue: entries.reduce((sum, e) => sum + Number(e.amount_total), 0),
    platformCut: entries.reduce((sum, e) => sum + Number(e.amount_platform), 0),
    artistPayouts: entries.reduce((sum, e) => sum + Number(e.amount_artist), 0),
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
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
          <p className="text-2xl font-bold text-primary">${totals.platformCut.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Platform Cut</p>
        </GlowCard>
        <GlowCard className="p-4 text-center">
          <p className="text-2xl font-bold text-green-400">${totals.artistPayouts.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Artist Payouts</p>
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
              <SelectItem value="all">All Artists</SelectItem>
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
              <SelectItem value="all">All Tracks</SelectItem>
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
                  <TableHead>Fan</TableHead>
                  <TableHead>Artist</TableHead>
                  <TableHead>Track</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">Dollar Value</TableHead>
                  <TableHead className="text-right">Platform Cut</TableHead>
                  <TableHead className="text-right">Artist Payout</TableHead>
                  <TableHead>Status</TableHead>
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
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(entry.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{entry.fan_display_name}</div>
                        <div className="text-xs text-muted-foreground">{entry.fan_email}</div>
                      </TableCell>
                      <TableCell className="text-sm">{entry.artist_name}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{entry.track_title}</TableCell>
                      <TableCell className="text-right font-mono">{entry.credits_spent}</TableCell>
                      <TableCell className="text-right font-mono">${Number(entry.amount_total).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-primary">${Number(entry.amount_platform).toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-green-400">${Number(entry.amount_artist).toFixed(2)}</TableCell>
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
