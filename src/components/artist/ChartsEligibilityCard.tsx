import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, CheckCircle2, Circle, ExternalLink } from "lucide-react";

interface Milestone {
  milestone: number;
  prize_usd: number;
  status: string;
}

const MILESTONES = [
  { milestone: 1000, prize: 25, label: "1,000 streams" },
  { milestone: 2500, prize: 50, label: "2,500 streams" },
  { milestone: 5000, prize: 100, label: "5,000 streams" },
  { milestone: 10000, prize: 125, label: "10,000 streams" },
];

export const ChartsEligibilityCard = ({ artistProfileId }: { artistProfileId: string }) => {
  const { data: milestones, isLoading, isError } = useQuery({
    queryKey: ["bonus-milestones", artistProfileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bonus_milestones")
        .select("milestone, prize_usd, status")
        .eq("artist_id", artistProfileId)
        .order("milestone", { ascending: true });
      if (error) throw error;
      return (data || []) as Milestone[];
    },
    enabled: !!artistProfileId,
  });

  if (isLoading) {
    return <Skeleton className="h-44 w-full rounded-2xl" />;
  }

  if (isError) {
    return (
      <Card className="p-4 rounded-2xl border border-border/30" style={{ background: "hsla(0, 0%, 100%, 0.02)" }}>
        <p className="text-xs text-muted-foreground">
          Unable to load bonus progress. Contact support@musicexclusive.co
        </p>
      </Card>
    );
  }

  const getMilestoneStatus = (milestone: number): "paid" | "reached" | "pending" => {
    const found = milestones?.find((m) => m.milestone === milestone);
    if (!found) return "pending";
    if (found.status === "paid") return "paid";
    if (found.status === "reached" || found.status === "approved") return "reached";
    return "pending";
  };

  const allComplete = MILESTONES.every(
    (m) => getMilestoneStatus(m.milestone) === "paid"
  );

  const totalEarned = (milestones || [])
    .filter((m) => m.status === "paid")
    .reduce((sum, m) => sum + Number(m.prize_usd), 0);

  if (allComplete) {
    return (
      <Card
        className="p-5 rounded-2xl animate-fade-in"
        style={{
          background: "hsla(45, 90%, 55%, 0.06)",
          borderColor: "hsla(45, 90%, 55%, 0.3)",
          boxShadow: "0 0 20px hsla(45, 90%, 55%, 0.08)",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "hsla(45, 90%, 55%, 0.15)" }}
          >
            <Trophy className="w-5 h-5" style={{ color: "hsl(45, 90%, 55%)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground mb-1">
              You're Eligible for Exclusive Charts
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              You've completed the Cash Bonus Program. Compete for $500, $250, or $100 in your genre this year.
            </p>
            <Button
              size="sm"
              className="rounded-full gap-1.5"
              style={{ background: "hsl(45, 90%, 50%)", color: "hsl(0, 0%, 0%)" }}
              onClick={() => window.open("/charts", "_blank")}
            >
              View Charts
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className="p-5 rounded-2xl animate-fade-in"
      style={{
        background: "hsla(0, 0%, 100%, 0.02)",
        borderColor: "hsla(280, 80%, 50%, 0.15)",
      }}
    >
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "hsla(280, 80%, 50%, 0.12)" }}
        >
          <Trophy className="w-5 h-5" style={{ color: "hsl(280, 80%, 70%)" }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-0.5">
            Your Path to Exclusive Charts
          </h3>
          <p className="text-xs text-muted-foreground">
            Complete the Cash Bonus Program to unlock chart eligibility.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {MILESTONES.map((m) => {
          const status = getMilestoneStatus(m.milestone);
          return (
            <div
              key={m.milestone}
              className="flex items-center gap-2 p-2 rounded-lg"
              style={{
                background:
                  status === "paid"
                    ? "hsla(142, 70%, 45%, 0.08)"
                    : "hsla(0, 0%, 100%, 0.02)",
              }}
            >
              {status === "paid" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(142, 70%, 45%)" }} />
              ) : status === "reached" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: "hsl(45, 90%, 55%)" }} />
              ) : (
                <Circle className="w-4 h-4 flex-shrink-0 text-muted-foreground/40" />
              )}
              <div className="min-w-0">
                <p className={`text-xs font-medium ${status === "paid" ? "text-foreground" : "text-muted-foreground"}`}>
                  {m.label}
                </p>
                <p className="text-[10px] text-muted-foreground">${m.prize.toFixed(2)}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-muted-foreground mb-3">
        Total bonus earned: ${totalEarned.toFixed(2)} of $300.00
      </p>

      <Button
        size="sm"
        variant="outline"
        className="rounded-full gap-1.5 text-xs"
        onClick={() => window.open("/charts", "_blank")}
      >
        View Charts
        <ExternalLink className="w-3.5 h-3.5" />
      </Button>
    </Card>
  );
};
