import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Loader2, Search, X } from "lucide-react";
import { format } from "date-fns";

interface LedgerEntry {
  id: string;
  user_email: string;
  type: string;
  credits_delta: number;
  usd_delta: number;
  reference: string | null;
  created_at: string;
  payout_batch_id: string | null;
}

export function TransactionLedger() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateFrom: "",
    dateTo: "",
    type: "",
    userEmail: "",
  });

  const transactionTypes = [
    "CREDITS_PURCHASE",
    "CREDITS_SPEND",
    "ARTIST_EARNING",
    "SUBSCRIPTION_CREDITS",
    "REFUND",
  ];

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("credit_ledger")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (filters.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("created_at", filters.dateTo + "T23:59:59");
      }
      if (filters.type) {
        query = query.eq("type", filters.type);
      }
      if (filters.userEmail) {
        query = query.ilike("user_email", `%${filters.userEmail}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching ledger entries:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    fetchEntries();
  };

  const clearFilters = () => {
    setFilters({ dateFrom: "", dateTo: "", type: "", userEmail: "" });
  };

  const exportCSV = () => {
    const headers = ["Date", "User Email", "Type", "Credits", "USD", "Reference", "Batch ID"];
    const rows = entries.map(e => [
      format(new Date(e.created_at), "yyyy-MM-dd HH:mm:ss"),
      e.user_email,
      e.type,
      e.credits_delta.toString(),
      e.usd_delta.toString(),
      e.reference || "",
      e.payout_batch_id || "",
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transaction-ledger-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <GlowCard className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
          <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
            <SelectTrigger className="bg-background/50">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              {transactionTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="User Email"
            value={filters.userEmail}
            onChange={(e) => setFilters({ ...filters, userEmail: e.target.value })}
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
        <Button variant="outline" size="sm" onClick={exportCSV}>
          <Download className="w-4 h-4 mr-1" /> Export CSV
        </Button>
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
                  <TableHead>Date</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Credits</TableHead>
                  <TableHead className="text-right">USD</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-sm">
                        {format(new Date(entry.created_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm truncate max-w-[150px]">
                        {entry.user_email}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          entry.type === "CREDITS_PURCHASE" ? "bg-green-500/20 text-green-400" :
                          entry.type === "ARTIST_EARNING" ? "bg-primary/20 text-primary" :
                          entry.type === "CREDITS_SPEND" ? "bg-red-500/20 text-red-400" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {entry.type}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right font-mono ${entry.credits_delta >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {entry.credits_delta >= 0 ? "+" : ""}{entry.credits_delta}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${Number(entry.usd_delta) >= 0 ? "text-green-400" : "text-red-400"}`}>
                        ${Math.abs(Number(entry.usd_delta)).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {entry.reference || "—"}
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
