import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Trophy, CheckCircle2, Circle, ExternalLink, Loader2 } from "lucide-react";

interface Milestone {
  milestone: number;
  prize_usd: number;
  status: string;
}

const MILESTONES = [
  { milestone: 1000, prize: 25, label: "1K streams" },
  { milestone: 2500, prize: 50, label: "2.5K streams" },
  { milestone: 5000, prize: 100, label: "5K streams" },
  { milestone: 10000, prize: 125, label: "10K streams" },
];

export const ChartsEligibilityCard = ({ artistProfileId }: { artistProfileId: string }) => {
  const navigate = useNavigate();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!artistProfileId) return;

    const fetchMilestones = async () => {
      const { data } = await supabase
        .from("bonus_milestones")
        .select("milestone, prize_usd, status")
        .eq("artist_id", artistProfileId)
        .order("milestone", { ascending: true });

      setMilestones(data || []);
      setIsLoading(false);
    };

    fetchMilestones();
  }, [artistProfileId]);

  if (isLoading) {
    return (
      <div className="p-4 rounded-2xl border border-border/30 bg-muted/10 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allComplete = MILESTONES.every((m) =>
    milestones.some((dm) => dm.milestone === m.milestone && dm.status === "paid")
  );

  const getMilestoneStatus = (milestone: number): "paid" | "reached" | "pending" => {
    const found = milestones.find((m) => m.milestone === milestone);
    if (!found) return "pending";
    if (found.status === "paid") return "paid";
    if (found.status === "reached" || found.status === "approved") return "reached";
    return "pending";
  };

  if (allComplete) {
    return (
      <div
        className="p-5 rounded-2xl animate-fade-in"
        style={{
          background: "hsla(45, 90%, 55%, 0.06)",
          border: "1px solid hsla(45, 90%, 55%, 0.3)",
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
              Compete for $500, $250, or $100 in your genre this year.
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
      </div>
    );
  }

  return (
    <div
      className="p-5 rounded-2xl animate-fade-in"
      style={{
        background: "hsla(0, 0%, 100%, 0.02)",
        border: "1px solid hsla(280, 80%, 50%, 0.15)",
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
            Complete the Cash Bonus Program to unlock eligibility.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {MILESTONES.map((m) => {
          const status = getMilestoneStatus(m.milestone);
          return (
            <div
              key={m.milestone}
              className="flex items-center gap-2 p-2 rounded-lg"
              style={{
                background: status === "paid" ? "hsla(142, 70%, 45%, 0.08)" : "hsla(0, 0%, 100%, 0.02)",
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
                <p className="text-[10px] text-muted-foreground">${m.prize}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
