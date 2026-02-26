import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { recordMonitoringEvent } from "../_shared/monitoring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Authenticate via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    const status = typeof body.status === "number" ? body.status : null;
    const latencyMs = typeof body.latencyMs === "number" ? Math.round(body.latencyMs) : null;
    const eventType =
      status !== null && status >= 400 ? "playback_error" : "playback_request";

    await recordMonitoringEvent({
      function_name: "playback",
      event_type: eventType,
      status: status ?? 0,
      latency_ms: latencyMs ?? undefined,
      metadata: {
        track_id: typeof body.trackId === "string" ? body.trackId : null,
        session_id: typeof body.sessionId === "string" ? body.sessionId : null,
        range: typeof body.range === "string" ? body.range : null,
        cache_status: typeof body.cacheStatus === "string" ? body.cacheStatus : null,
        origin_status: typeof body.originStatus === "number" ? body.originStatus : null,
        origin_latency_ms:
          typeof body.originLatencyMs === "number"
            ? Math.round(body.originLatencyMs)
            : null,
        user_id: userData.user.id,
        client_ip: req.headers.get("cf-connecting-ip"),
        user_agent: req.headers.get("user-agent"),
        cf_ray: req.headers.get("cf-ray"),
        colo: req.headers.get("cf-ipcountry"),
      },
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[playback-telemetry] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
