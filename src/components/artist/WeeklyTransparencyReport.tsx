import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import { Loader2, Download, CalendarIcon, CheckCircle2, Clock } from "lucide-react";
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
  created_at: string;
  credits_spent: number;
  amount_total: number;
  amount_artist: number;
  amount_platform: number;
  payout_status: string;
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

const WeeklyTransparencyReport = () => {
  const { user } = useAuth();
  const [streams, setStreams] = useState<StreamEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>("this_week");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();

  useEffect(() => {
    const fetchStreams = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("stream_ledger")
          .select("created_at, credits_spent, amount_total, amount_artist, amount_platform, payout_status")
          .eq("artist_id", user.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching streams:", error);
        } else {
          setStreams(data || []);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStreams();
  }, [user]);

  const { dateRange, weeklyData } = useMemo(() => {
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
    const filteredStreams = streams.filter((stream) => {
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
      
      filteredStreams.forEach((stream) => {
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
      weekMap.set(key, filteredStreams);
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
      const [startStr] = weekRange.split(" - ");
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

    return { dateRange: { start, end }, weeklyData: weeklyDataArray };
  }, [streams, dateRangeOption, customStartDate, customEndDate]);

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

  if (isLoading) {
    return (
      <GlowCard className="p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
      </GlowCard>
    );
  }

  return (
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
  );
};

export default WeeklyTransparencyReport;
