import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";
import { recordMonitoringEvent } from "../_shared/monitoring.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ── AWS Signature V4 presign helpers ── */

async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getSignatureKey(secret: string, dateStamp: string, region: string, service: string) {
  const kDate = await hmacSha256(new TextEncoder().encode("AWS4" + secret), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return hmacSha256(kService, "aws4_request");
}

function encodeR2Path(key: string): string {
  return "/" + key.split("/").map(encodeURIComponent).join("/");
}

async function presignR2Url(key: string, expireSeconds: number): Promise<string> {
  const accountId = Deno.env.get("R2_ACCOUNT_ID")!;
  const bucket = Deno.env.get("R2_BUCKET_NAME")!;
  const accessKeyId = Deno.env.get("R2_ACCESS_KEY_ID")!;
  const secretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY")!;

  const region = "auto";
  const service = "s3";
  const host = `${accountId}.r2.cloudflarestorage.com`;
  const path = `/${bucket}${encodeR2Path(key)}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const credential = `${accessKeyId}/${credentialScope}`;

  const queryParams = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expireSeconds),
    "X-Amz-SignedHeaders": "host",
  });

  const sortedQs = [...queryParams.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");

  const canonicalRequest = ["GET", path, sortedQs, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(canonicalRequest)].join("\n");

  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signatureBuffer = await hmacSha256(signingKey, stringToSign);
  const signature = [...new Uint8Array(signatureBuffer)].map((b) => b.toString(16).padStart(2, "0")).join("");

  return `https://${host}${path}?${sortedQs}&X-Amz-Signature=${signature}`;
}

/* ── Session JWT helpers ── */

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

/* ── Main handler ── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const requestStart = performance.now();
  let stage = "init";
  let errorCode: string | null = null;
  let errorMessage: string | null = null;
  let trackId: string | null = null;
  let requestedFileType: string | null = null;
  let resolvedFileType: string | null = null;
  let sessionId: string | null = null;
  let r2Key: string | null = null;

  const respond = async (status: number, payload: Record<string, unknown>) => {
    const latencyMs = Math.round(performance.now() - requestStart);
    recordMonitoringEvent({
      function_name: "mint-playback-url",
      event_type: "request",
      status,
      latency_ms: latencyMs,
      stage,
      error_code: errorCode ?? undefined,
      error_message: errorMessage ?? undefined,
      metadata: {
        track_id: trackId,
        file_type: resolvedFileType ?? requestedFileType,
        session_id: sessionId,
        r2_key: r2Key,
        session_ttl_seconds: SESSION_TTL_SECONDS,
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
    if (!authHeader?.startsWith("Bearer ")) {
      errorMessage = "Unauthorized";
      return await respond(401, { error: "Unauthorized" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    if (userErr || !user) {
      errorMessage = "Invalid token";
      return await respond(401, { error: "Invalid token" });
    }

    // ── Body ──
    stage = "parse";
    const body = await req.json();
    trackId = body.trackId ?? null;
    requestedFileType = body.fileType ?? null;
    resolvedFileType = requestedFileType;

    if (!trackId || !["audio", "preview", "artwork"].includes(requestedFileType ?? "")) {
      errorMessage = "Missing trackId or invalid fileType";
      return await respond(400, { error: "Missing trackId or invalid fileType (audio|preview|artwork)" });
    }

    // ── Access check ──
    stage = "access_check";
    const userEmail = user.email?.toLowerCase() ?? "";

    const { data: track, error: trackErr } = await admin
      .from("tracks")
      .select("artist_id, full_audio_key, preview_audio_key, artwork_key, status")
      .eq("id", trackId)
      .maybeSingle();

    if (trackErr || !track) {
      errorMessage = "Track not found";
      return await respond(404, { error: "Track not found" });
    }

    if (requestedFileType !== "artwork") {
      if (track.status !== "ready") {
        errorMessage = "Track not available";
        return await respond(403, { error: "Track not available" });
      }

      const [roleResult, vaultResult] = await Promise.all([
        admin.from("user_roles").select("role").eq("user_id", user.id),
        admin.from("vault_members").select("vault_access_active").eq("email", userEmail).maybeSingle(),
      ]);

      const roles = (roleResult.data ?? []).map((r: any) => r.role as string);
      const isAdmin = roles.includes("admin");
      const isArtist = roles.includes("artist");
      const isVaultActive = vaultResult.data?.vault_access_active === true;

      let isOwner = false;
      if (isArtist) {
        const { data: profile } = await admin.from("artist_profiles").select("id").eq("user_id", user.id).maybeSingle();
        if (profile && String(profile.id) === track.artist_id) {
          isOwner = true;
        }
      }

      if (!isAdmin && !isOwner && !isVaultActive) {
        errorMessage = "Access denied";
        return await respond(403, { error: "Access denied" });
      }
    }

    // ── Mint session ──
    stage = "mint_session";
    sessionId = crypto.randomUUID();
    const sessionExpiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
    const sessionExpiresAtIso = new Date(sessionExpiresAt * 1000).toISOString();

    const watermarkSalt = Deno.env.get("PLAYBACK_WATERMARK_SALT");
    if (!watermarkSalt) {
      errorMessage = "Missing PLAYBACK_WATERMARK_SALT";
      return await respond(500, { error: "Missing PLAYBACK_WATERMARK_SALT" });
    }
    const watermarkId = await sha256Hex(`${sessionId}:${watermarkSalt}`);

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

    const sessionToken = await signJwtHS256(
      {
        track_id: trackId,
        user_id: user.id,
        session_id: sessionId,
        watermark_id: watermarkId,
        expires_at: sessionExpiresAt,
        exp: sessionExpiresAt,
        iat: Math.floor(Date.now() / 1000),
      },
      playbackJwtSecret
    );

    // ── Session recording moved to charge-stream ──
    // mint-playback-url no longer creates playback_sessions to avoid inflation.
    // Sessions are created once per paid stream in charge-stream.

    // ── Resolve key & presign ──
    stage = "presign";
    const key =
      requestedFileType === "audio"
        ? track.full_audio_key
        : requestedFileType === "preview"
        ? track.preview_audio_key
        : track.artwork_key;

    r2Key = key;

    if (!key) {
      errorMessage = `No ${requestedFileType} key`;
      return await respond(404, { error: `No ${requestedFileType} key on this track` });
    }

    const ttl = requestedFileType === "artwork" ? 300 : 90;
    const signedUrl = await presignR2Url(key, ttl);
    const hlsBase = hlsWorkerBaseUrl.startsWith("http") ? hlsWorkerBaseUrl : `https://${hlsWorkerBaseUrl}`;
    const hlsUrl = `${hlsBase}/${trackId}/master.m3u8?token=${encodeURIComponent(sessionToken)}`;

    stage = "done";
    return await respond(200, {
      url: signedUrl,
      expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
      sessionToken,
      hlsUrl,
      session: {
        track_id: trackId,
        user_id: user.id,
        session_id: sessionId,
        watermark_id: watermarkId,
        expires_at: sessionExpiresAtIso,
      },
    });
  } catch (err) {
    console.error("[mint-playback-url] Error:", err);
    errorMessage = err instanceof Error ? err.message : "Internal error";
    const latencyMs = Math.round(performance.now() - requestStart);
    recordMonitoringEvent({
      function_name: "mint-playback-url",
      event_type: "unhandled_error",
      status: 500,
      latency_ms: latencyMs,
      stage,
      error_message: errorMessage,
    }).catch(() => {});
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
