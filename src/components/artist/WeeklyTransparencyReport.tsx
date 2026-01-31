import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useArtistProfile } from "@/hooks/useArtistProfile";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Download, CalendarIcon, CheckCircle2, Clock, Music, TrendingUp } from "lucide-react";
import {
  format,
  startOfWeek,
  endOfWeek,
  subWeeks,
  isWithinInterval,
} from "date-fns";
import { cn } from "@/lib/utils";

type DateRangeOption = "this_week" | "last_week" | "last_4_weeks" | "custom";

interface StreamEntry {
  track_id: string;
  created_at: string;
  credits_spent: number;
  amount_total: number;
  amount_artist: number;
  amount_platform: number;
  payout_status: string;
}

interface TrackInfo {
  id: string;
  title: string;
  artwork_url: string | null;
}

interface WeeklyData {
  weekRange: string;
  weekStart: Date;
  weekEnd: Date;
  totalStreams: number;
  totalCreditsSpent: number;
  grossStreaming: number;
  artistShare: number;
  platformShare: number;
  status: "Paid" | "Pending";
}

interface TrackEarningData {
  trackId: string;
  title: string;
  artworkUrl: string | null;
  streams: number;
  artistEarnings: number;
  status: "Paid" | "Pending";
}

const WeeklyTransparencyReport = () => {
  const { user } = useAuth();
  const { artistProfileId, isLoading: profileLoading } = useArtistProfile();
  const [streams, setStreams] = useState<StreamEntry[]>([]);
  const [tracks, setTracks] = useState<Map<string, TrackInfo>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>("this_week");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  useEffect(() => {
    const fetchStreams = async () => {
      // Wait for artist profile to be loaded
      if (!user || profileLoading || !artistProfileId) return;

      setIsLoading(true);
      try {
        // Use artist_profiles.id for stream_ledger queries
        const { data, error } = await supabase
          .from("stream_ledger")
          .select("track_id, created_at, credits_spent, amount_total, amount_artist, amount_platform, payout_status")
          .eq("artist_id", artistProfileId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching streams:", error);
        } else {
          setStreams(data || []);
          
          // Fetch track details for unique track IDs
          const trackIds = [...new Set((data || []).map(s => s.track_id))];
          if (trackIds.length > 0) {
            const { data: trackData } = await supabase
              .from("tracks")
              .select("id, title, artwork_url")
              .in("id", trackIds);
            
            const trackMap = new Map<string, TrackInfo>();
            (trackData || []).forEach(t => {
              trackMap.set(t.id, { id: t.id, title: t.title, artwork_url: t.artwork_url });
            });
            setTracks(trackMap);
          }
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStreams();
  }, [user, artistProfileId, profileLoading]);

  const { dateRange, weeklyData, filteredStreams } = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (dateRangeOption) {
      case "this_week":
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "last_week":
        start = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        end = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        break;
      case "last_4_weeks":
        start = startOfWeek(subWeeks(now, 3), { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "custom":
        start = customStartDate || startOfWeek(now, { weekStartsOn: 1 });
        end = customEndDate || endOfWeek(now, { weekStartsOn: 1 });
        break;
      default:
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
    }

    // Filter streams within the date range
    const filtered = streams.filter((stream) => {
      const streamDate = new Date(stream.created_at);
      return isWithinInterval(streamDate, { start, end });
    });

    // Group by week for multi-week ranges
    const weekMap = new Map<string, StreamEntry[]>();
    
    if (dateRangeOption === "last_4_weeks") {
      // Group by individual weeks
      for (let i = 0; i < 4; i++) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const key = `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
        weekMap.set(key, []);
      }
      
      filtered.forEach((stream) => {
        const streamDate = new Date(stream.created_at);
        for (let i = 0; i < 4; i++) {
          const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
          const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
          if (isWithinInterval(streamDate, { start: weekStart, end: weekEnd })) {
            const key = `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
            const existing = weekMap.get(key) || [];
            existing.push(stream);
            weekMap.set(key, existing);
            break;
          }
        }
      });
    } else {
      // Single range
      const key = `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
      weekMap.set(key, filtered);
    }

    // Calculate weekly data
    const weeklyDataArray: WeeklyData[] = [];
    
    weekMap.forEach((weekStreams, weekRange) => {
      const totalStreams = weekStreams.length;
      const totalCreditsSpent = weekStreams.reduce((sum, s) => sum + s.credits_spent, 0);
      const grossStreaming = weekStreams.reduce((sum, s) => sum + Number(s.amount_total), 0);
      const artistShare = weekStreams.reduce((sum, s) => sum + Number(s.amount_artist), 0);
      const platformShare = weekStreams.reduce((sum, s) => sum + Number(s.amount_platform), 0);
      const allPaid = weekStreams.length > 0 && weekStreams.every((s) => s.payout_status === "paid");

      // Parse week range to get dates
      let weekStart: Date;
      let weekEnd: Date;
      
      if (dateRangeOption === "last_4_weeks") {
        // Find which week this corresponds to
        for (let i = 0; i < 4; i++) {
          const ws = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
          const we = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
          const testKey = `${format(ws, "MMM d")} - ${format(we, "MMM d, yyyy")}`;
          if (testKey === weekRange) {
            weekStart = ws;
            weekEnd = we;
            break;
          }
        }
        weekStart = weekStart! || start;
        weekEnd = weekEnd! || end;
      } else {
        weekStart = start;
        weekEnd = end;
      }

      weeklyDataArray.push({
        weekRange,
        weekStart,
        weekEnd,
        totalStreams,
        totalCreditsSpent,
        grossStreaming,
        artistShare,
        platformShare,
        status: allPaid ? "Paid" : "Pending",
      });
    });

    // Sort by week start date (most recent first)
    weeklyDataArray.sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());

    return { dateRange: { start, end }, weeklyData: weeklyDataArray, filteredStreams: filtered };
  }, [streams, dateRangeOption, customStartDate, customEndDate]);

  // Calculate track earnings from filtered streams
  const trackEarnings = useMemo(() => {
    const trackMap = new Map<string, { streams: number; artistEarnings: number; allPaid: boolean; hasPending: boolean }>();
    
    filteredStreams.forEach((stream) => {
      const existing = trackMap.get(stream.track_id) || { streams: 0, artistEarnings: 0, allPaid: true, hasPending: false };
      trackMap.set(stream.track_id, {
        streams: existing.streams + 1,
        artistEarnings: existing.artistEarnings + Number(stream.amount_artist),
        allPaid: existing.allPaid && stream.payout_status === "paid",
        hasPending: existing.hasPending || stream.payout_status === "pending",
      });
    });

    const earningsArray: TrackEarningData[] = [];
    trackMap.forEach((data, trackId) => {
      const trackInfo = tracks.get(trackId);
      earningsArray.push({
        trackId,
        title: trackInfo?.title || "Unknown Track",
        artworkUrl: trackInfo?.artwork_url || null,
        streams: data.streams,
        artistEarnings: data.artistEarnings,
        status: data.allPaid && data.streams > 0 ? "Paid" : "Pending",
      });
    });

    // Sort by streams descending
    return earningsArray.sort((a, b) => b.streams - a.streams);
  }, [filteredStreams, tracks]);

  const handleExportCSV = () => {
    if (weeklyData.length === 0) return;

    const headers = [
      "Week Range",
      "Total Streams",
      "Credits Spent",
      "Gross Streaming ($)",
      "Artist Share ($)",
      "Platform Share ($)",
      "Status",
    ];

    const rows = weeklyData.map((week) => [
      week.weekRange,
      week.totalStreams.toString(),
      week.totalCreditsSpent.toString(),
      week.grossStreaming.toFixed(2),
      week.artistShare.toFixed(2),
      week.platformShare.toFixed(2),
      week.status,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `earnings-report-${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: "Paid" | "Pending") => {
    if (status === "Paid") {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/40">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Paid
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  if (isLoading || profileLoading) {
    return (
      <GlowCard className="p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
      </GlowCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Transparency Report */}
      <GlowCard variant="flat" glowColor="subtle" className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h3 className="text-sm font-display font-semibold text-foreground uppercase tracking-wider">
            Weekly Transparency Report
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={dateRangeOption}
              onValueChange={(value: DateRangeOption) => setDateRangeOption(value)}
            >
              <SelectTrigger className="w-[160px] h-9 text-sm">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="this_week">This Week</SelectItem>
                <SelectItem value="last_week">Last Week</SelectItem>
                <SelectItem value="last_4_weeks">Last 4 Weeks</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {dateRangeOption === "custom" && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-9 justify-start text-left font-normal",
                        !customStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, "MMM d") : "Start"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground">–</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-9 justify-start text-left font-normal",
                        !customEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, "MMM d") : "End"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={weeklyData.length === 0}
              className="h-9"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {weeklyData.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            No streaming data for the selected period.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5 px-5">
            <Table>
              <TableHeader>
                <TableRow className="border-muted/30">
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">
                    Week Range
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">
                    Streams
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">
                    Credits
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">
                    Gross ($)
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">
                    Artist ($)
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-right">
                    Platform ($)
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground text-center">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeklyData.map((week, index) => (
                  <TableRow key={index} className="border-muted/20 hover:bg-muted/10">
                    <TableCell className="text-sm font-medium text-foreground">
                      {week.weekRange}
                    </TableCell>
                    <TableCell className="text-sm text-foreground text-right">
                      {week.totalStreams}
                    </TableCell>
                    <TableCell className="text-sm text-foreground text-right">
                      {week.totalCreditsSpent}
                    </TableCell>
                    <TableCell className="text-sm text-foreground text-right">
                      ${week.grossStreaming.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-green-400 text-right">
                      ${week.artistShare.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground text-right">
                      ${week.platformShare.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(week.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mt-4 text-center">
          Revenue split: $0.10 Artist / $0.10 Platform per stream ($0.20 total)
        </p>
      </GlowCard>

      {/* Earnings by Track */}
      <GlowCard variant="flat" glowColor="subtle" className="p-5">
        <div className="flex items-center gap-3 mb-5">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'hsla(280, 80%, 50%, 0.15)' }}
          >
            <TrendingUp className="w-5 h-5" style={{ color: 'hsl(280, 80%, 70%)' }} />
          </div>
          <div>
            <h3 className="text-sm font-display font-semibold text-foreground uppercase tracking-wider">
              Earnings by Track
            </h3>
            <p className="text-xs text-muted-foreground">
              Performance breakdown for selected period
            </p>
          </div>
        </div>

        {trackEarnings.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">
            No track data for the selected period.
          </p>
        ) : (
          <div className="space-y-3">
            {trackEarnings.map((track, index) => (
              <div
                key={track.trackId}
                className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:scale-[1.01]"
                style={{
                  background: 'hsla(0, 0%, 100%, 0.02)',
                  border: '1px solid hsla(280, 80%, 50%, 0.1)',
                }}
              >
                {/* Rank Badge */}
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-display font-bold text-sm"
                  style={{
                    background: index === 0 
                      ? 'linear-gradient(135deg, hsla(45, 90%, 50%, 0.3), hsla(35, 90%, 40%, 0.2))'
                      : index === 1
                      ? 'linear-gradient(135deg, hsla(220, 10%, 60%, 0.3), hsla(220, 10%, 40%, 0.2))'
                      : index === 2
                      ? 'linear-gradient(135deg, hsla(25, 70%, 45%, 0.3), hsla(20, 70%, 35%, 0.2))'
                      : 'hsla(280, 80%, 50%, 0.1)',
                    color: index === 0 
                      ? 'hsl(45, 90%, 55%)'
                      : index === 1
                      ? 'hsl(220, 10%, 70%)'
                      : index === 2
                      ? 'hsl(25, 70%, 55%)'
                      : 'hsl(280, 80%, 70%)',
                  }}
                >
                  #{index + 1}
                </div>

                {/* Track Artwork */}
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                  {track.artworkUrl ? (
                    <img
                      src={track.artworkUrl}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>

                {/* Track Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {track.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {track.streams} {track.streams === 1 ? "stream" : "streams"}
                  </p>
                </div>

                {/* Earnings & Status */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-400">
                      ${track.artistEarnings.toFixed(2)}
                    </p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Earned
                    </p>
                  </div>
                  {getStatusBadge(track.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlowCard>
    </div>
  );
};

export default WeeklyTransparencyReport;
