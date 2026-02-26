import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { verifyAdmin } from "../_shared/verify-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MonitoringRow {
  function_name: string;
  event_type: string;
  status: number;
  latency_ms: number | null;
  conflict: boolean;
  retry_count: number;
  contention_count: number;
  ledger_written: boolean | null;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function parseWindow(raw: string | null): number {
  if (!raw) return 24;
  const match = raw.match(/^(\d+)h$/);
  if (!match) return 24;
  const hours = parseInt(match[1], 10);
  if (hours < 1) return 1;
  if (hours > 168) return 168; // max 7d
  return hours;
}

function buildMetrics(events: MonitoringRow[]) {
  const total = events.length;
  const latencyValues = events
    .map((e) => e.latency_ms)
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b);

  let error5xx = 0;
  let conflictCount = 0;
  let retrySum = 0;
  let contentionSum = 0;
  let ledgerWrittenCount = 0;
  const statusCounts: Record<string, number> = {};

  for (const e of events) {
    if (e.status >= 500) error5xx++;
    if (e.conflict) conflictCount++;
    retrySum += e.retry_count;
    contentionSum += e.contention_count;
    if (e.ledger_written === true) ledgerWrittenCount++;
    const bucket = String(e.status);
    statusCounts[bucket] = (statusCounts[bucket] || 0) + 1;
  }

  return {
    total,
    latency: {
      p95Ms: Math.round(percentile(latencyValues, 95)),
      p99Ms: Math.round(percentile(latencyValues, 99)),
    },
    rates: {
      error5xx: total ? Number((error5xx / total).toFixed(4)) : 0,
      conflict: total ? Number((conflictCount / total).toFixed(4)) : 0,
      retry: total ? Number((retrySum / total).toFixed(4)) : 0,
      contention: total ? Number((contentionSum / total).toFixed(4)) : 0,
      ledgerWritten: total ? Number((ledgerWrittenCount / total).toFixed(4)) : 0,
    },
    statusCounts,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const { user, error: authError } = await verifyAdmin(authHeader);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: authError || "Unauthorized" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const windowHours = parseWindow(url.searchParams.get("window"));
    const since = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await admin
      .from("monitoring_events")
      .select("function_name, event_type, status, latency_ms, conflict, retry_count, contention_count, ledger_written")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(10000);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = (data ?? []) as MonitoringRow[];

    // Group by function_name
    const byFunction: Record<string, MonitoringRow[]> = {};
    for (const row of rows) {
      (byFunction[row.function_name] ??= []).push(row);
    }

    const metrics: Record<string, ReturnType<typeof buildMetrics>> = {};
    for (const [fn, events] of Object.entries(byFunction)) {
      metrics[fn] = buildMetrics(events);
    }

    return new Response(
      JSON.stringify({ windowHours, since, functions: metrics, totalEvents: rows.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[monitoring-metrics] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
