import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ── Monitoring helper (fire-and-forget) ──
async function logMonitoringEvent(
  client: any,
  event: {
    function_name: string;
    event_type: string;
    status: number;
    latency_ms?: number;
    stage?: string;
    error_code?: string;
    error_message?: string;
    conflict?: boolean;
    retry_count?: number;
    contention_count?: number;
    ledger_written?: boolean;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await client.from("monitoring_events").insert(event);
  } catch (_) { /* never block main flow */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  let contentionCount = 0;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create a client with the user's JWT to verify identity
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      logMonitoringEvent(adminClient, {
        function_name: "charge-stream",
        event_type: "auth_failure",
        status: 401,
        latency_ms: Date.now() - startTime,
      }).catch(() => {});
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fanEmail = user.email;
    const fanUserId = user.id;

    if (!fanEmail) {
      return new Response(JSON.stringify({ error: "No email on account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { trackId, idempotencyKey } = body ?? {};
    if (!trackId) {
      return new Response(JSON.stringify({ error: "trackId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!idempotencyKey || typeof idempotencyKey !== "string") {
      return new Response(JSON.stringify({ error: "idempotencyKey is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for all DB operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch the track to get the owner's artist_id
    const { data: trackData, error: trackError } = await adminClient
      .from("tracks")
      .select("artist_id")
      .eq("id", trackId)
      .maybeSingle();

    if (trackError || !trackData) {
      console.error("Error fetching track:", trackError);
      return new Response(JSON.stringify({ error: "Track not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trackOwnerArtistId = trackData.artist_id;

    // 2. Check vault membership (read-only pre-check for better error messages)
    const { data: vaultMember, error: vaultError } = await adminClient
      .from("vault_members")
      .select("id, credits, vault_access_active")
      .eq("email", fanEmail)
      .maybeSingle();

    if (vaultError) {
      console.error("Error checking vault:", vaultError);
      return new Response(JSON.stringify({ error: "Could not verify vault access" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!vaultMember) {
      return new Response(JSON.stringify({ error: "You need vault access to stream" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!vaultMember.vault_access_active) {
      return new Response(JSON.stringify({ error: "Your vault access is not active" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (vaultMember.credits < 1) {
      logMonitoringEvent(adminClient, {
        function_name: "charge-stream",
        event_type: "insufficient_credits",
        status: 402,
        latency_ms: Date.now() - startTime,
        metadata: { fan_email: fanEmail, track_id: trackId },
      }).catch(() => {});
      return new Response(JSON.stringify({ error: "Insufficient credits", requiresCredits: true }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Idempotency: insert into stream_charges; if duplicate, return success
    const streamChargeId = crypto.randomUUID();

    const { error: idempotencyError } = await adminClient
      .from("stream_charges")
      .insert({
        stream_id: streamChargeId,
        fan_email: fanEmail,
        track_id: trackId,
        idempotency_key: idempotencyKey,
      });

    if (idempotencyError) {
      if (idempotencyError.code === "23505") {
        // Duplicate idempotency key — already charged
        const { data: current } = await adminClient
          .from("vault_members")
          .select("credits")
          .eq("email", fanEmail)
          .maybeSingle();
        logMonitoringEvent(adminClient, {
          function_name: "charge-stream",
          event_type: "idempotency_duplicate",
          status: 200,
          latency_ms: Date.now() - startTime,
          conflict: true,
        }).catch(() => {});
        return new Response(
          JSON.stringify({ success: true, alreadyCharged: true, newCredits: current?.credits ?? null }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("Idempotency insert error:", idempotencyError);
      return new Response(JSON.stringify({ error: "Failed to record stream charge" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Transactional debit with retry on serialization/deadlock errors
    const RPC_MAX_RETRIES = 3;
    const RPC_BACKOFF_MS = [50, 100, 200];
    let rpcResult: { success: boolean; newCredits?: number; streamLedgerId?: string } | null = null;

    for (let attempt = 0; attempt < RPC_MAX_RETRIES; attempt++) {
      const { data, error: rpcError } = await adminClient.rpc("debit_stream_credit", {
        p_fan_email: fanEmail,
        p_fan_user_id: fanUserId,
        p_track_id: trackId,
        p_artist_id: trackOwnerArtistId,
        p_stream_charge_id: streamChargeId,
        p_idempotency_key: idempotencyKey,
      });

      if (!rpcError) {
        rpcResult = data as { success: boolean; newCredits?: number; streamLedgerId?: string } | null;
        break;
      }

      // Retry on serialization failure (40001) or deadlock (40P01)
      if ((rpcError.code === "40001" || rpcError.code === "40P01") && attempt < RPC_MAX_RETRIES - 1) {
        console.warn(`debit_stream_credit contention (${rpcError.code}), retry ${attempt + 1}`);
        contentionCount++;
        await new Promise((r) => setTimeout(r, RPC_BACKOFF_MS[attempt]));
        continue;
      }

      // Non-retryable error or retries exhausted
      console.error("debit_stream_credit RPC error:", rpcError);
      const isContention = rpcError.code === "40001" || rpcError.code === "40P01";
      contentionCount++;
      logMonitoringEvent(adminClient, {
        function_name: "charge-stream",
        event_type: "contention_exhausted",
        status: isContention ? 409 : 500,
        latency_ms: Date.now() - startTime,
        conflict: isContention,
        retry_count: attempt + 1,
        contention_count: contentionCount,
        error_code: rpcError.code,
        error_message: rpcError.message,
      }).catch(() => {});
      return new Response(
        JSON.stringify({ error: isContention ? "Concurrent update, retry" : "Failed to process payment" }),
        {
          status: isContention ? 409 : 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!rpcResult?.success) {
      logMonitoringEvent(adminClient, {
        function_name: "charge-stream",
        event_type: "debit_failed",
        status: 409,
        latency_ms: Date.now() - startTime,
        conflict: true,
      }).catch(() => {});
      return new Response(JSON.stringify({ error: "Concurrent update, retry" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle duplicate detected inside RPC (ON CONFLICT DO NOTHING path)
    if (rpcResult.alreadyCharged) {
      logMonitoringEvent(adminClient, {
        function_name: "charge-stream",
        event_type: "idempotency_duplicate",
        status: 200,
        latency_ms: Date.now() - startTime,
        conflict: true,
      }).catch(() => {});
      return new Response(
        JSON.stringify({ success: true, alreadyCharged: true, newCredits: rpcResult.newCredits }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    logMonitoringEvent(adminClient, {
      function_name: "charge-stream",
      event_type: "success",
      status: 200,
      latency_ms: Date.now() - startTime,
      ledger_written: true,
      contention_count: contentionCount,
    }).catch(() => {});

    return new Response(
      JSON.stringify({ success: true, newCredits: rpcResult.newCredits }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("charge-stream error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
