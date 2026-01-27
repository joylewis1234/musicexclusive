import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { CalendarIcon, Download, Loader2, RefreshCw, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

interface ArtistOption {
  user_id: string;
  artist_name: string;
}

interface LiveLedgerTableProps {
  refreshTrigger?: number;
}

const ENTRY_TYPES = [
  { value: "all", label: "All Types" },
  { value: "ARTIST_EARNING", label: "Artist Earning" },
  { value: "PLATFORM_EARNING", label: "Platform Earning" },
  { value: "CREDITS_PURCHASE", label: "Credits Purchase" },
  { value: "SUBSCRIPTION_CREDITS", label: "Subscription Credits" },
  { value: "PAYOUT", label: "Payout" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
];

export const LiveLedgerTable = ({ refreshTrigger }: LiveLedgerTableProps) => {
  const { toast } = useToast();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    type: "all",
    artist: "all",
    status: "all",
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
  });

  const fetchArtists = useCallback(async () => {
    const { data } = await supabase
      .from("artist_profiles")
      .select("user_id, artist_name")
      .order("artist_name");
    setArtists(data || []);
  }, []);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("credit_ledger")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      // Apply type filter
      if (filters.type !== "all") {
        query = query.eq("type", filters.type);
      }

      // Apply status filter
      if (filters.status === "paid") {
        query = query.not("payout_batch_id", "is", null);
      } else if (filters.status === "unpaid") {
        query = query.is("payout_batch_id", null);
      }

      // Apply date range filters
      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom.toISOString());
      }
      if (filters.dateTo) {
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      // Apply artist filter client-side (since user_email contains artist_name for earnings)
      let filteredData = data || [];
      if (filters.artist !== "all") {
        const selectedArtist = artists.find((a) => a.user_id === filters.artist);
        if (selectedArtist) {
          filteredData = filteredData.filter(
            (e) => e.user_email === selectedArtist.artist_name
          );
        }
      }

      setEntries(filteredData);
    } catch (error: any) {
      toast({
        title: "Error fetching ledger",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [filters, artists, toast]);

  useEffect(() => {
    fetchArtists();
  }, [fetchArtists]);

  useEffect(() => {
    if (artists.length >= 0) {
      fetchEntries();
    }
  }, [filters, artists, refreshTrigger, fetchEntries]);

  const clearFilters = () => {
    setFilters({
      type: "all",
      artist: "all",
      status: "all",
      dateFrom: undefined,
      dateTo: undefined,
    });
  };

  const hasActiveFilters =
    filters.type !== "all" ||
    filters.artist !== "all" ||
    filters.status !== "all" ||
    filters.dateFrom ||
    filters.dateTo;

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "ARTIST_EARNING":
        return "border-green-500 text-green-500";
      case "PLATFORM_EARNING":
        return "border-blue-500 text-blue-500";
      case "CREDITS_PURCHASE":
        return "border-purple-500 text-purple-500";
      case "SUBSCRIPTION_CREDITS":
        return "border-cyan-500 text-cyan-500";
      case "PAYOUT":
        return "border-amber-500 text-amber-500";
      default:
        return "border-muted-foreground text-muted-foreground";
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Date/Time",
      "Entry Type",
      "User/Artist",
      "Credits Delta",
      "USD Delta",
      "Status",
      "Reference Type",
      "Reference ID",
    ];
    const rows = entries.map((entry) => {
      const refParts = entry.reference?.split("_") || [];
      const refType = refParts.length > 0 ? refParts[0] : "";
      return [
        format(new Date(entry.created_at), "yyyy-MM-dd HH:mm:ss"),
        entry.type,
        entry.user_email,
        entry.credits_delta,
        entry.usd_delta,
        entry.payout_batch_id ? "Paid" : "Unpaid",
        refType,
        entry.reference || "",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ledger-live-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="border-primary/30 bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <CardTitle className="text-lg font-display text-primary">
          Ledger Entries (Live)
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchEntries}
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
          <Button variant="outline" size="sm" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters Row */}
        <div className="flex gap-3 flex-wrap items-end">
          {/* Entry Type Filter */}
          <div className="min-w-[160px]">
            <Select
              value={filters.type}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, type: v }))}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Entry Type" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                {ENTRY_TYPES.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Artist Filter */}
          <div className="min-w-[160px]">
            <Select
              value={filters.artist}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, artist: v }))}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Artist" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                <SelectItem value="all">All Artists</SelectItem>
                {artists.map((artist) => (
                  <SelectItem key={artist.user_id} value={artist.user_id}>
                    {artist.artist_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="min-w-[130px]">
            <Select
              value={filters.status}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, status: v }))}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50">
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date From */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "min-w-[130px] justify-start text-left font-normal bg-background",
                  !filters.dateFrom && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateFrom ? format(filters.dateFrom, "MMM d") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
              <Calendar
                mode="single"
                selected={filters.dateFrom}
                onSelect={(date) =>
                  setFilters((prev) => ({ ...prev, dateFrom: date }))
                }
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Date To */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "min-w-[130px] justify-start text-left font-normal bg-background",
                  !filters.dateTo && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filters.dateTo ? format(filters.dateTo, "MMM d") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-background z-50" align="start">
              <Calendar
                mode="single"
                selected={filters.dateTo}
                onSelect={(date) =>
                  setFilters((prev) => ({ ...prev, dateTo: date }))
                }
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {/* Results count */}
        <div className="text-xs text-muted-foreground">
          Showing {entries.length} entries
          {hasActiveFilters && " (filtered)"}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">
            No ledger entries found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date / Time</TableHead>
                  <TableHead>Entry Type</TableHead>
                  <TableHead>User / Artist</TableHead>
                  <TableHead className="text-right">Credits Δ</TableHead>
                  <TableHead className="text-right">USD Δ</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ref Type</TableHead>
                  <TableHead>Reference ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const refParts = entry.reference?.split("_") || [];
                  const refType = refParts.length > 1 ? refParts[0] : entry.reference ? "custom" : "—";
                  
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(entry.created_at), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-xs whitespace-nowrap", getTypeBadgeColor(entry.type))}
                        >
                          {entry.type.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate">
                        {entry.user_email}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span
                          className={
                            entry.credits_delta > 0
                              ? "text-green-500"
                              : entry.credits_delta < 0
                              ? "text-red-500"
                              : ""
                          }
                        >
                          {entry.credits_delta > 0 ? "+" : ""}
                          {entry.credits_delta}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span
                          className={
                            Number(entry.usd_delta) > 0
                              ? "text-green-500"
                              : Number(entry.usd_delta) < 0
                              ? "text-red-500"
                              : ""
                          }
                        >
                          {Number(entry.usd_delta) > 0 ? "+" : ""}
                          ${Number(entry.usd_delta).toFixed(2)}
                        </span>
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
                      <TableCell className="text-xs text-muted-foreground capitalize">
                        {refType}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate font-mono">
                        {entry.reference || "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
