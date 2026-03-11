import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GlowCard } from "@/components/ui/GlowCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Shield, ArrowLeft, Trophy, Ban, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MilestoneRow {
  id: string;
  artist_id: string;
  milestone: number;
  prize_usd: number;
  status: string;
  reached_at: string | null;
  paid_at: string | null;
  disqualified_at: string | null;
  disqualified_reason: string | null;
  artist_profiles: {
    id: string;
    artist_name: string;
    stripe_account_id: string | null;
  };
}

interface ArtistGroup {
  artist_id: string;
  artist_name: string;
  stripe_connected: boolean;
  milestones: MilestoneRow[];
  stream_count: number | null;
}

const MILESTONE_CONFIG = [
  { threshold: 1000, prize: 25 },
  { threshold: 2500, prize: 50 },
  { threshold: 5000, prize: 75 },
  { threshold: 10000, prize: 150 },
];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
  pending: { label: "Pending", variant: "outline", icon: Clock },
  paid: { label: "Paid", variant: "default", icon: CheckCircle },
  disqualified: { label: "Disqualified", variant: "destructive", icon: XCircle },
};

const AdminCashBonusTracker = () => {
  const navigate = useNavigate();
  const [artistGroups, setArtistGroups] = useState<ArtistGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [disqualifyReason, setDisqualifyReason] = useState("");
  const [recoupPaid, setRecoupPaid] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all milestones with artist profiles
      const { data: milestones, error } = await supabase
        .from("bonus_milestones")
        .select("*, artist_profiles!inner(id, artist_name, stripe_account_id)")
        .order("milestone", { ascending: true });

      if (error) throw error;

      // Group by artist
      const groupMap = new Map<string, ArtistGroup>();

      for (const m of (milestones ?? []) as unknown as MilestoneRow[]) {
        const key = m.artist_id;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            artist_id: key,
            artist_name: m.artist_profiles.artist_name,
            stripe_connected: !!m.artist_profiles.stripe_account_id,
            milestones: [],
            stream_count: null,
          });
        }
        groupMap.get(key)!.milestones.push(m);
      }

      // Fetch stream counts for each artist
      const groups = Array.from(groupMap.values());
      await Promise.all(
        groups.map(async (g) => {
          const { count } = await supabase
            .from("stream_ledger")
            .select("*", { count: "exact", head: true })
            .eq("artist_id", g.artist_id);
          g.stream_count = count;
        })
      );

      setArtistGroups(groups.sort((a, b) => (b.stream_count ?? 0) - (a.stream_count ?? 0)));
    } catch (err) {
      console.error("Failed to fetch bonus data:", err);
      toast.error("Failed to load bonus data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (milestoneId: string) => {
    setActionLoading(milestoneId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("approve-bonus-payout", {
        body: { milestone_id: milestoneId },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.error) throw new Error(res.error.message ?? "Failed to approve");
      const result = res.data;
      if (result?.error) throw new Error(result.error);

      toast.success(`Approved! Transfer: ${result.stripe_transfer_id}`);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to approve payout");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisqualify = async (artistId: string) => {
    if (!disqualifyReason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    setActionLoading(artistId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("disqualify-bonus", {
        body: { artist_id: artistId, reason: disqualifyReason, recoup_paid: recoupPaid },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.error) throw new Error(res.error.message ?? "Failed to disqualify");
      const result = res.data;
      if (result?.error) throw new Error(result.error);

      toast.success(`Disqualified ${result.disqualified_count} milestone(s)`);
      setDisqualifyReason("");
      setRecoupPaid(false);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to disqualify");
    } finally {
      setActionLoading(null);
    }
  };

  const totalPaid = artistGroups.reduce(
    (sum, g) => sum + g.milestones.filter((m) => m.status === "paid").reduce((s, m) => s + m.prize_usd, 0),
    0
  );
  const totalPending = artistGroups.reduce(
    (sum, g) => sum + g.milestones.filter((m) => m.status === "pending").reduce((s, m) => s + m.prize_usd, 0),
    0
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => navigate("/admin")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Shield className="w-5 h-5 text-primary" />
          <span className="font-display text-sm font-semibold uppercase tracking-widest text-foreground">
            Cash Bonus Tracker
          </span>
        </div>
      </header>

      <main className="pt-20 pb-12 px-4">
        <div className="container max-w-5xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlowCard className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Artists Active</p>
              <p className="text-2xl font-bold text-foreground mt-1">{artistGroups.length}</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Milestones</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {artistGroups.reduce((s, g) => s + g.milestones.length, 0)}
              </p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Paid Out</p>
              <p className="text-2xl font-bold text-green-400 mt-1">${totalPaid}</p>
            </GlowCard>
            <GlowCard className="p-4 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p>
              <p className="text-2xl font-bold text-amber-400 mt-1">${totalPending}</p>
            </GlowCard>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : artistGroups.length === 0 ? (
            <GlowCard className="p-8 text-center">
              <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No artists have reached any milestones yet.</p>
            </GlowCard>
          ) : (
            artistGroups.map((group) => {
              const allDisqualified = group.milestones.every((m) => m.status === "disqualified");
              return (
                <GlowCard key={group.artist_id} className="p-5 space-y-4">
                  {/* Artist Header */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h3 className="font-semibold text-lg text-foreground">{group.artist_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {group.stream_count?.toLocaleString() ?? "—"} total streams
                        {!group.stripe_connected && (
                          <span className="text-destructive ml-2">• Stripe not connected</span>
                        )}
                      </p>
                    </div>
                    {!allDisqualified && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm" className="gap-1">
                            <Ban className="w-3.5 h-3.5" />
                            Disqualify
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Disqualify {group.artist_name}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will disqualify all pending and paid milestones for this artist.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="space-y-3 py-2">
                            <Textarea
                              placeholder="Reason for disqualification..."
                              value={disqualifyReason}
                              onChange={(e) => setDisqualifyReason(e.target.value)}
                            />
                            <div className="flex items-center gap-2">
                              <Switch
                                id="recoup"
                                checked={recoupPaid}
                                onCheckedChange={setRecoupPaid}
                              />
                              <Label htmlFor="recoup" className="text-sm">
                                Flag paid bonuses for recoupment
                              </Label>
                            </div>
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDisqualify(group.artist_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              disabled={actionLoading === group.artist_id}
                            >
                              {actionLoading === group.artist_id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "Confirm Disqualify"
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>

                  {/* Milestone Progress */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {MILESTONE_CONFIG.map(({ threshold, prize }) => {
                      const milestone = group.milestones.find((m) => m.milestone === threshold);
                      const config = milestone ? statusConfig[milestone.status] ?? statusConfig.pending : null;
                      const Icon = config?.icon ?? Clock;

                      return (
                        <div
                          key={threshold}
                          className={`rounded-lg border p-3 space-y-2 ${
                            milestone
                              ? milestone.status === "paid"
                                ? "border-green-500/30 bg-green-500/5"
                                : milestone.status === "disqualified"
                                ? "border-destructive/30 bg-destructive/5"
                                : "border-amber-500/30 bg-amber-500/5"
                              : "border-border/30 bg-muted/20"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">
                              {threshold.toLocaleString()} streams
                            </span>
                            <span className="text-sm font-bold text-foreground">${prize}</span>
                          </div>

                          {milestone ? (
                            <>
                              <Badge variant={config?.variant ?? "outline"} className="text-xs gap-1">
                                <Icon className="w-3 h-3" />
                                {config?.label}
                              </Badge>
                              {milestone.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="w-full text-xs gap-1 border-green-500/40 text-green-400 hover:bg-green-500/10"
                                  onClick={() => handleApprove(milestone.id)}
                                  disabled={actionLoading === milestone.id || !group.stripe_connected}
                                >
                                  {actionLoading === milestone.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <>
                                      <CheckCircle className="w-3 h-3" />
                                      Approve & Pay
                                    </>
                                  )}
                                </Button>
                              )}
                              {milestone.status === "disqualified" && milestone.disqualified_reason && (
                                <p className="text-xs text-destructive/80 truncate" title={milestone.disqualified_reason}>
                                  {milestone.disqualified_reason}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-muted-foreground/60">Not reached</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </GlowCard>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminCashBonusTracker;
