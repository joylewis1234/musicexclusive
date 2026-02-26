import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { recordMonitoringEvent } from "../_shared/monitoring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestStart = performance.now();
  let stage = "init";
  let errorCode: string | null = null;
  let errorMessage: string | null = null;
  let conflict = false;
  let retryCount = 0;
  let contentionCount = 0;
  let ledgerWritten: boolean | null = null;
  let trackId: string | null = null;
  let fanUserId: string | null = null;

  const respond = async (status: number, payload: Record<string, unknown>) => {
    const latencyMs = Math.round(performance.now() - requestStart);
    recordMonitoringEvent({
      function_name: "charge-stream",
      event_type: "request",
      status,
      latency_ms: latencyMs,
      stage,
      error_code: errorCode ?? undefined,
      error_message: errorMessage ?? undefined,
      conflict,
      retry_count: retryCount,
      contention_count: contentionCount,
      ledger_written: ledgerWritten,
      metadata: {
        track_id: trackId,
        fan_user_id: fanUserId,
      },
    }).catch(() => {});
    return new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  };

  try {
    // ── Auth ──
    stage = "auth";
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      errorMessage = "Missing authorization";
      return await respond(401, { error: "Missing authorization" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      errorMessage = "Not authenticated";
      return await respond(401, { error: "Not authenticated" });
    }

    const fanEmail = user.email;
    fanUserId = user.id;

    if (!fanEmail) {
      errorMessage = "No email on account";
      return await respond(400, { error: "No email on account" });
    }

    // ── Parse body ──
    stage = "parse";
    const body = await req.json();
    const { idempotencyKey } = body ?? {};
    trackId = body?.trackId ?? null;

    if (!trackId) {
      errorMessage = "trackId is required";
      return await respond(400, { error: "trackId is required" });
    }
    if (!idempotencyKey || typeof idempotencyKey !== "string") {
      errorMessage = "idempotencyKey is required";
      return await respond(400, { error: "idempotencyKey is required" });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // ── Track lookup ──
    stage = "track_lookup";
    const { data: trackData, error: trackError } = await adminClient
      .from("tracks")
      .select("artist_id")
      .eq("id", trackId)
      .maybeSingle();

    if (trackError || !trackData) {
      console.error("Error fetching track:", trackError);
      errorMessage = "Track not found";
      return await respond(404, { error: "Track not found" });
    }

    const trackOwnerArtistId = trackData.artist_id;

    // ── Vault check ──
    stage = "vault_check";
    const { data: vaultMember, error: vaultError } = await adminClient
      .from("vault_members")
      .select("id, credits, vault_access_active")
      .eq("email", fanEmail)
      .maybeSingle();

    if (vaultError) {
      console.error("Error checking vault:", vaultError);
      errorMessage = vaultError.message;
      return await respond(500, { error: "Could not verify vault access" });
    }

    if (!vaultMember) {
      errorMessage = "No vault access";
      return await respond(403, { error: "You need vault access to stream" });
    }

    if (!vaultMember.vault_access_active) {
      errorMessage = "Vault access not active";
      return await respond(403, { error: "Your vault access is not active" });
    }

    if (vaultMember.credits < 1) {
      errorMessage = "Insufficient credits";
      return await respond(402, { error: "Insufficient credits", requiresCredits: true });
    }

    // ── Idempotency ──
    stage = "idempotency";
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
        const { data: current } = await adminClient
          .from("vault_members")
          .select("credits")
          .eq("email", fanEmail)
          .maybeSingle();
        conflict = true;
        return await respond(200, { success: true, alreadyCharged: true, newCredits: current?.credits ?? null });
      }
      console.error("Idempotency insert error:", idempotencyError);
      errorCode = idempotencyError.code;
      errorMessage = idempotencyError.message;
      return await respond(500, { error: "Failed to record stream charge" });
    }

    // ── Debit with retry ──
    stage = "debit";
    const RPC_MAX_RETRIES = 3;
    const RPC_BACKOFF_MS = [50, 100, 200];
    let rpcResult: { success: boolean; newCredits?: number; alreadyCharged?: boolean; streamLedgerId?: string } | null = null;

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
        retryCount = attempt;
        rpcResult = data as typeof rpcResult;
        break;
      }

      if ((rpcError.code === "40001" || rpcError.code === "40P01") && attempt < RPC_MAX_RETRIES - 1) {
        console.warn(`debit_stream_credit contention (${rpcError.code}), retry ${attempt + 1}`);
        contentionCount++;
        await new Promise((r) => setTimeout(r, RPC_BACKOFF_MS[attempt]));
        continue;
      }

      console.error("debit_stream_credit RPC error:", rpcError);
      const isContention = rpcError.code === "40001" || rpcError.code === "40P01";
      contentionCount++;
      retryCount = attempt + 1;
      conflict = isContention;
      errorCode = rpcError.code;
      errorMessage = rpcError.message;
      return await respond(isContention ? 409 : 500, {
        error: isContention ? "Concurrent update, retry" : "Failed to process payment",
      });
    }

    if (!rpcResult?.success) {
      conflict = true;
      errorMessage = "debit returned false";
      return await respond(409, { error: "Concurrent update, retry" });
    }

    if (rpcResult.alreadyCharged) {
      conflict = true;
      return await respond(200, { success: true, alreadyCharged: true, newCredits: rpcResult.newCredits });
    }

    stage = "done";
    ledgerWritten = true;
    return await respond(200, { success: true, newCredits: rpcResult.newCredits });
  } catch (err) {
    console.error("charge-stream error:", err);
    errorMessage = err instanceof Error ? err.message : "Internal server error";
    const latencyMs = Math.round(performance.now() - requestStart);
    recordMonitoringEvent({
      function_name: "charge-stream",
      event_type: "unhandled_error",
      status: 500,
      latency_ms: latencyMs,
      stage,
      error_message: errorMessage,
    }).catch(() => {});
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
