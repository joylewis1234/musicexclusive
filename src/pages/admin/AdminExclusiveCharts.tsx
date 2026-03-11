import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ARTIST_GENRES } from "@/data/genres";
import { GlowCard } from "@/components/ui/GlowCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Shield,
  ArrowLeft,
  BarChart3,
  Ban,
  Trophy,
  Loader2,
  Lock,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

interface ChartEntry {
  id: string;
  artist_id: string;
  genre: string;
  cycle_year: number;
  cumulative_streams: number;
  rank: number | null;
  prize_usd: number | null;
  status: string;
  disqualified_reason: string | null;
  artist_profiles: {
    id: string;
    artist_name: string;
    country_code: string | null;
    stripe_account_id: string | null;
  };
}

const statusStyles: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Active", variant: "outline" },
  pending_payout: { label: "Pending Payout", variant: "secondary" },
  paid: { label: "Paid", variant: "default" },
  disqualified: { label: "Disqualified", variant: "destructive" },
};

function countryCodeToFlag(code: string | null): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

const currentYear = new Date().getUTCFullYear();

const AdminExclusiveCharts = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ChartEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string>(ARTIST_GENRES[0]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [disqualifyTarget, setDisqualifyTarget] = useState<ChartEntry | null>(null);
  const [disqualifyReason, setDisqualifyReason] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("charts_bonus_cycles")
        .select("*, artist_profiles!inner(id, artist_name, country_code, stripe_account_id)")
        .eq("genre", selectedGenre)
        .eq("cycle_year", selectedYear)
        .order("cumulative_streams", { ascending: false });

      if (error) throw error;
      setEntries((data ?? []) as unknown as ChartEntry[]);
    } catch (err) {
      console.error("Failed to fetch charts:", err);
      toast.error("Failed to load chart data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedGenre, selectedYear]);

  const handleCloseCycle = async () => {
    setActionLoading("close-cycle");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("close-annual-cycle", {
        body: { genre: selectedGenre, cycle_year: selectedYear },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message);
      const result = res.data;
      if (result?.error) throw new Error(result.error);

      const winnerCount = result.winners?.length ?? 0;
      toast.success(`Cycle closed! ${winnerCount} winner(s) processed.`);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to close cycle");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisqualify = async () => {
    if (!disqualifyTarget || !disqualifyReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    setActionLoading(disqualifyTarget.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("disqualify-charts-artist", {
        body: {
          artist_id: disqualifyTarget.artist_id,
          genre: selectedGenre,
          cycle_year: selectedYear,
          reason: disqualifyReason,
        },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) throw new Error(res.error.message);
      const result = res.data;
      if (result?.error) throw new Error(result.error);

      toast.success("Artist disqualified. Rankings recalculated.");
      setDisqualifyTarget(null);
      setDisqualifyReason("");
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to disqualify");
    } finally {
      setActionLoading(null);
    }
  };

  const qualifiedEntries = entries.filter((e) => e.status !== "disqualified");
  const disqualifiedEntries = entries.filter((e) => e.status === "disqualified");
  const hasPaidOrPending = entries.some((e) => e.status === "paid" || e.status === "pending_payout");
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
            Exclusive Charts
          </span>
        </div>
      </header>

      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-5xl mx-auto space-y-6">
          {/* Filters */}
          <GlowCard className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  {ARTIST_GENRES.filter((g) => g !== "Other").map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="ml-auto">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-primary/40 text-primary"
                      disabled={hasPaidOrPending || qualifiedEntries.length === 0}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Close {selectedYear} Cycle
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Close {selectedGenre} cycle for {selectedYear}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will assign prizes ($500 / $250 / $100) to the top 3 ranked artists and process Stripe transfers. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleCloseCycle}
                        disabled={actionLoading === "close-cycle"}
                      >
                        {actionLoading === "close-cycle" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm & Pay Winners"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </GlowCard>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <GlowCard className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Qualified</p>
              <p className="text-2xl font-bold text-foreground mt-1">{qualifiedEntries.length}</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Ranked (Top 3)</p>
              <p className="text-2xl font-bold text-primary mt-1">
                {qualifiedEntries.filter((e) => e.rank !== null).length}
              </p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Disqualified</p>
              <p className="text-2xl font-bold text-destructive mt-1">{disqualifiedEntries.length}</p>
            </GlowCard>
          </div>

          {/* Leaderboard */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : qualifiedEntries.length === 0 && disqualifiedEntries.length === 0 ? (
            <GlowCard className="p-8 text-center">
              <BarChart3 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No chart entries for {selectedGenre} in {selectedYear}.</p>
            </GlowCard>
          ) : (
            <>
              {/* Qualified Artists */}
              <GlowCard className="overflow-hidden">
                <div className="p-4 border-b border-border/30">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-primary" />
                    {selectedGenre} Leaderboard — {selectedYear}
                  </h3>
                </div>
                <div className="divide-y divide-border/20">
                  {qualifiedEntries.map((entry, idx) => {
                    const style = statusStyles[entry.status] ?? statusStyles.active;
                    const flag = countryCodeToFlag(entry.artist_profiles.country_code);
                    const isTop3 = entry.rank !== null && entry.rank <= 3;

                    return (
                      <div
                        key={entry.id}
                        className={`flex items-center gap-4 px-4 py-3 ${
                          isTop3 ? "bg-primary/5" : ""
                        }`}
                      >
                        {/* Rank */}
                        <div className="w-10 text-center">
                          {entry.rank ? (
                            <span className={`text-lg font-bold ${
                              entry.rank === 1 ? "text-amber-400" : entry.rank === 2 ? "text-slate-300" : "text-amber-600"
                            }`}>
                              #{entry.rank}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">{idx + 1}</span>
                          )}
                        </div>

                        {/* Artist */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {flag && <span className="mr-1.5">{flag}</span>}
                            {entry.artist_profiles.artist_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.cumulative_streams.toLocaleString()} cumulative streams
                          </p>
                        </div>

                        {/* Prize */}
                        {entry.prize_usd && (
                          <span className="text-sm font-semibold text-primary">${entry.prize_usd}</span>
                        )}

                        {/* Status */}
                        <Badge variant={style.variant} className="text-xs gap-1">
                          {entry.status === "paid" && <CheckCircle className="w-3 h-3" />}
                          {entry.status === "pending_payout" && <Clock className="w-3 h-3" />}
                          {style.label}
                        </Badge>

                        {/* Disqualify button */}
                        {entry.status !== "paid" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => { setDisqualifyTarget(entry); setDisqualifyReason(""); }}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </GlowCard>

              {/* Disqualified */}
              {disqualifiedEntries.length > 0 && (
                <GlowCard className="overflow-hidden opacity-60">
                  <div className="p-4 border-b border-border/30">
                    <h3 className="font-semibold text-muted-foreground flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Disqualified
                    </h3>
                  </div>
                  <div className="divide-y divide-border/20">
                    {disqualifiedEntries.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-4 px-4 py-3">
                        <div className="w-10" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-muted-foreground truncate line-through">
                            {entry.artist_profiles.artist_name}
                          </p>
                          <p className="text-xs text-destructive/70">{entry.disqualified_reason}</p>
                        </div>
                        <Badge variant="destructive" className="text-xs">Disqualified</Badge>
                      </div>
                    ))}
                  </div>
                </GlowCard>
              )}
            </>
          )}
        </div>
      </main>

      {/* Disqualify Dialog */}
      <AlertDialog open={!!disqualifyTarget} onOpenChange={(open) => { if (!open) setDisqualifyTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Disqualify {disqualifyTarget?.artist_profiles.artist_name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Remove from {selectedGenre} charts for {selectedYear}. Rankings will be recalculated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Reason for disqualification..."
            value={disqualifyReason}
            onChange={(e) => setDisqualifyReason(e.target.value)}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisqualify}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={actionLoading === disqualifyTarget?.id}
            >
              {actionLoading === disqualifyTarget?.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Confirm Disqualify"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminExclusiveCharts;
