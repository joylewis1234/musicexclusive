import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Shield,
  Database,
  Mail,
  Server,
} from "lucide-react";

interface CheckResult {
  label: string;
  ok: boolean;
  detail: string;
  icon: typeof Activity;
}

const AdminHealthCheck = () => {
  const { user, role } = useAuth();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const [results, setResults] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const runChecks = useCallback(async () => {
    setRunning(true);
    const checks: CheckResult[] = [];

    // 1. DB connectivity
    try {
      const { error } = await supabase
        .from("user_roles")
        .select("id")
        .limit(1);
      checks.push({
        label: "Database Connectivity",
        ok: !error,
        detail: error ? error.message : "Connected",
        icon: Database,
      });
    } catch (err: any) {
      checks.push({
        label: "Database Connectivity",
        ok: false,
        detail: err?.message ?? "Unknown error",
        icon: Database,
      });
    }

    // 2. Edge function: approve-artist
    try {
      const { data, error } = await supabase.functions.invoke("approve-artist", {
        method: "POST",
        body: { healthCheck: true },
      });
      const reachable = !error;
      checks.push({
        label: "Edge Function: approve-artist",
        ok: reachable,
        detail: reachable
          ? `Reachable (status returned)`
          : error?.message ?? "Unreachable",
        icon: Server,
      });
    } catch (err: any) {
      checks.push({
        label: "Edge Function: approve-artist",
        ok: false,
        detail: err?.message ?? "Unreachable",
        icon: Server,
      });
    }

    // 3. Edge function: lookup-artist-application
    try {
      const { data, error } = await supabase.functions.invoke(
        "lookup-artist-application",
        {
          method: "POST",
          body: { healthCheck: true },
        }
      );
      const reachable = !error;
      checks.push({
        label: "Edge Function: lookup-artist-application",
        ok: reachable,
        detail: reachable
          ? `Reachable (status returned)`
          : error?.message ?? "Unreachable",
        icon: Server,
      });
    } catch (err: any) {
      checks.push({
        label: "Edge Function: lookup-artist-application",
        ok: false,
        detail: err?.message ?? "Unreachable",
        icon: Server,
      });
    }

    // 4. Resend status (check via send-daily-report with a dry-run-like probe)
    try {
      // We check if the edge function that depends on Resend is reachable
      const { error } = await supabase.functions.invoke("send-daily-report", {
        method: "POST",
        body: { healthCheck: true },
      });
      checks.push({
        label: "Resend (Email Service)",
        ok: !error,
        detail: !error ? "Edge function reachable" : error?.message ?? "Unreachable",
        icon: Mail,
      });
    } catch (err: any) {
      checks.push({
        label: "Resend (Email Service)",
        ok: false,
        detail: err?.message ?? "Unreachable",
        icon: Mail,
      });
    }

    // 5. Auth info
    checks.push({
      label: "Current Auth",
      ok: !!user,
      detail: user
        ? `Role: ${role ?? "none"} | UID: ${user.id}`
        : "Not authenticated",
      icon: Shield,
    });

    setResults(checks);
    setLastRun(new Date().toLocaleString());
    setRunning(false);
  }, [user, role]);

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-5 py-10">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-display font-bold text-foreground">
              Health Check
            </h1>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={runChecks}
            disabled={running}
            className="gap-2"
          >
            {running ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {running ? "Running…" : "Run Checks"}
          </Button>
        </div>

        {/* Last run timestamp */}
        {lastRun && (
          <p className="text-xs text-muted-foreground">
            Last checked: {lastRun}
          </p>
        )}

        {/* Results */}
        {results.length === 0 && !running && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">
              Press "Run Checks" to start diagnostics.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {results.map((r, i) => (
            <div
              key={i}
              className="flex items-start gap-4 rounded-xl border border-border/50 bg-card/50 px-5 py-4"
            >
              <div className="shrink-0 mt-0.5">
                {r.ok ? (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <r.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">
                    {r.label}
                  </span>
                  <Badge
                    variant={r.ok ? "default" : "destructive"}
                    className="text-[10px] px-2 py-0"
                  >
                    {r.ok ? "OK" : "FAIL"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground break-all">
                  {r.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminHealthCheck;
