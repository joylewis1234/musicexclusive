import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useArtistProfile } from "@/hooks/useArtistProfile";
import { GlowCard } from "@/components/ui/GlowCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDown, ChevronUp, Bug, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface LedgerRow {
  id: string;
  created_at: string;
  fan_email: string;
  fan_id: string;
  track_id: string;
  amount_artist: number;
  payout_status: string;
}

const EarningsDebugPanel = () => {
  const { user } = useAuth();
  const { artistProfile, artistProfileId, isLoading: profileLoading } = useArtistProfile();
  const [isOpen, setIsOpen] = useState(false);
  const [ledgerRows, setLedgerRows] = useState<LedgerRow[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  useEffect(() => {
    const fetchLedgerRows = async () => {
      if (!isOpen || !artistProfileId) return;

      setIsLoadingLedger(true);
      try {
        const { data, error } = await supabase
          .from("stream_ledger")
          .select("id, created_at, fan_email, fan_id, track_id, amount_artist, payout_status")
          .eq("artist_id", artistProfileId)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) {
          console.error("[EarningsDebugPanel] Error fetching ledger:", error);
        } else {
          setLedgerRows(data || []);
        }
      } catch (err) {
        console.error("[EarningsDebugPanel] Unexpected error:", err);
      } finally {
        setIsLoadingLedger(false);
      }
    };

    fetchLedgerRows();
  }, [isOpen, artistProfileId]);

  if (profileLoading) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground mt-4"
        >
          <Bug className="w-4 h-4" />
          <span>Show Debug</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <GlowCard variant="flat" glowColor="subtle" className="p-4 mt-2 space-y-4">
          <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Bug className="w-4 h-4" />
            Debug Info
          </h4>

          {/* Artist Identity Info */}
          <div className="space-y-2 text-xs font-mono bg-muted/30 rounded-lg p-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">auth.user.id:</span>
              <span className="text-foreground">{user?.id || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">artist_profiles.id:</span>
              <span className="text-primary">{artistProfileId || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Artist Name:</span>
              <span className="text-foreground">{artistProfile?.artist_name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="text-foreground">{user?.email || "—"}</span>
            </div>
          </div>

          {/* Last 10 Ledger Rows */}
          <div>
            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Last 10 stream_ledger rows (artist_id = {artistProfileId?.slice(0, 8)}...)
            </h5>

            {isLoadingLedger ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : ledgerRows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
                No ledger rows found for this artist_id.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">created_at</TableHead>
                      <TableHead className="text-xs">fan_email</TableHead>
                      <TableHead className="text-xs">track_id</TableHead>
                      <TableHead className="text-xs">amount_artist</TableHead>
                      <TableHead className="text-xs">payout_status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-xs font-mono">
                          {format(new Date(row.created_at), "MM/dd HH:mm")}
                        </TableCell>
                        <TableCell className="text-xs font-mono truncate max-w-[120px]">
                          {row.fan_email}
                        </TableCell>
                        <TableCell className="text-xs font-mono truncate max-w-[80px]">
                          {row.track_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="text-xs font-mono text-green-400">
                          ${Number(row.amount_artist).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                              row.payout_status === "paid"
                                ? "bg-green-500/20 text-green-400"
                                : "bg-amber-500/20 text-amber-400"
                            }`}
                          >
                            {row.payout_status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </GlowCard>
      </CollapsibleContent>
    </Collapsible>
  );
};

export default EarningsDebugPanel;
