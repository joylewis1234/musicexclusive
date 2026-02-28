import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { recordMonitoringEvent } from "../_shared/monitoring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SESSION_TTL_SECONDS = 300;

function base64url(data: Uint8Array): string {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signJwtHS256(payload: Record<string, unknown>, secret: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const enc = new TextEncoder();
  const headerB64 = base64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64url(enc.encode(JSON.stringify(payload)));
  const data = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const sigB64 = base64url(new Uint8Array(sig));
  return `${data}.${sigB64}`;
}

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

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

    // ── Debit via RPC (handles idempotency internally) ──
    stage = "debit";
    const RPC_MAX_RETRIES = 3;
    const RPC_BACKOFF_MS = [50, 100, 200];
    let rpcData: { new_credits: number; already_charged: boolean; stream_ledger_id: string | null; out_stream_id: string | null } | null = null;

    for (let attempt = 0; attempt < RPC_MAX_RETRIES; attempt++) {
      const { data, error: rpcError } = await adminClient.rpc("debit_stream_credit", {
        p_fan_email: fanEmail,
        p_fan_id: fanUserId,
        p_track_id: trackId,
        p_artist_id: trackOwnerArtistId,
        p_idempotency_key: idempotencyKey,
      });

      if (!rpcError) {
        retryCount = attempt;
        // RPC returns TABLE rows — take the first row
        const rows = data as Array<typeof rpcData>;
        rpcData = rows?.[0] ?? null;
        break;
      }

      if ((rpcError.code === "40001" || rpcError.code === "40P01") && attempt < RPC_MAX_RETRIES - 1) {
        console.warn(`debit_stream_credit contention (${rpcError.code}), retry ${attempt + 1}`);
        contentionCount++;
        await new Promise((r) => setTimeout(r, RPC_BACKOFF_MS[attempt]));
        continue;
      }

      // Check for insufficient_credits exception from RPC
      if (rpcError.message?.includes("insufficient_credits")) {
        errorMessage = "Insufficient credits";
        return await respond(402, { error: "Insufficient credits", requiresCredits: true });
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

    if (!rpcData) {
      errorMessage = "RPC returned no data";
      return await respond(500, { error: "Failed to process payment" });
    }

    const newCredits = rpcData.new_credits;

    // ── Already charged (idempotent replay) ──
    if (rpcData.already_charged) {
      conflict = true;
      return await respond(200, { success: true, alreadyCharged: true, newCredits });
    }

    // ── Mint playback session + token ──
    stage = "mint_session";
    const streamId = rpcData.out_stream_id;
    if (!streamId) {
      errorCode = "missing_stream_id";
      errorMessage = "Failed to create stream";
      return await respond(500, { error: "Failed to create stream" });
    }

    const playbackJwtSecret = Deno.env.get("PLAYBACK_JWT_SECRET");
    if (!playbackJwtSecret) {
      errorMessage = "Missing PLAYBACK_JWT_SECRET";
      return await respond(500, { error: "Missing PLAYBACK_JWT_SECRET" });
    }

    const hlsWorkerBaseUrl = Deno.env.get("HLS_WORKER_BASE_URL");
    if (!hlsWorkerBaseUrl) {
      errorMessage = "Missing HLS_WORKER_BASE_URL";
      return await respond(500, { error: "Missing HLS_WORKER_BASE_URL" });
    }

    const watermarkSalt = Deno.env.get("PLAYBACK_WATERMARK_SALT");
    if (!watermarkSalt) {
      errorMessage = "Missing PLAYBACK_WATERMARK_SALT";
      return await respond(500, { error: "Missing PLAYBACK_WATERMARK_SALT" });
    }

    const sessionExpiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
    const sessionExpiresAtIso = new Date(sessionExpiresAt * 1000).toISOString();
    const watermarkId = await sha256Hex(`${streamId}:${watermarkSalt}`);

    // 1 playback_session per paid stream
    await adminClient.from("playback_sessions").upsert(
      {
        session_id: streamId,
        user_id: fanUserId,
        track_id: trackId,
        expires_at: sessionExpiresAtIso,
        ip_address: req.headers.get("cf-connecting-ip"),
        user_agent: req.headers.get("user-agent"),
        watermark_id: watermarkId,
      },
      { onConflict: "session_id" }
    );

    // Single-use token record
    const tokenId = crypto.randomUUID();
    await adminClient.from("playback_tokens").insert({
      token_id: tokenId,
      stream_id: streamId,
      expires_at: sessionExpiresAtIso,
    });

    const token = await signJwtHS256(
      {
        token_id: tokenId,
        stream_id: streamId,
        track_id: trackId,
        user_id: fanUserId,
        exp: sessionExpiresAt,
        iat: Math.floor(Date.now() / 1000),
      },
      playbackJwtSecret
    );

    const hlsUrl = `${hlsWorkerBaseUrl}/${trackId}/master.m3u8?token=${encodeURIComponent(token)}`;

    stage = "done";
    ledgerWritten = true;
    return await respond(200, {
      success: true,
      newCredits,
      streamId,
      sessionId: streamId,
      hlsUrl,
    });
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
