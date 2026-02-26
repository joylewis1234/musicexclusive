import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

/* ── In-memory IP rate limiter: 10 requests per 10 minutes ── */

const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

/* ── AWS Signature V4 presign helpers ── */

async function hmacSha256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
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

/* ── Main handler ── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  // Service-role client for monitoring only
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const monitorClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    // Rate limit by IP
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (!checkRateLimit(ip)) {
      logMonitoringEvent(monitorClient, {
        function_name: "mint-playback-url-public-preview",
        event_type: "rate_limited",
        status: 429,
        latency_ms: Date.now() - startTime,
      }).catch(() => {});
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { trackId } = await req.json();
    if (!trackId || typeof trackId !== "string") {
      return new Response(JSON.stringify({ error: "Missing trackId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use ANON key — NOT service role
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const client = createClient(supabaseUrl, supabaseAnonKey);

    // Call the SECURITY DEFINER RPC that only returns preview_audio_key
    // for tracks where is_preview_public = true AND status = 'ready'
    const { data: previewKey, error: rpcError } = await client.rpc(
      "get_public_preview_audio_key",
      { p_track_id: trackId }
    );

    if (rpcError) {
      console.error("[mint-playback-url-public-preview] RPC error:", rpcError);
      logMonitoringEvent(monitorClient, {
        function_name: "mint-playback-url-public-preview",
        event_type: "rpc_error",
        status: 500,
        latency_ms: Date.now() - startTime,
        error_code: rpcError.code,
        error_message: rpcError.message,
        metadata: { track_id: trackId },
      }).catch(() => {});
      return new Response(JSON.stringify({ error: "Track lookup failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!previewKey) {
      logMonitoringEvent(monitorClient, {
        function_name: "mint-playback-url-public-preview",
        event_type: "no_preview_available",
        status: 404,
        latency_ms: Date.now() - startTime,
        metadata: { track_id: trackId },
      }).catch(() => {});
      return new Response(JSON.stringify({ error: "No preview available" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Presign with R2 credentials (NOT Supabase service role)
    const ttl = 45;
    const signedUrl = await presignR2Url(previewKey, ttl);

    logMonitoringEvent(monitorClient, {
      function_name: "mint-playback-url-public-preview",
      event_type: "success",
      status: 200,
      latency_ms: Date.now() - startTime,
      metadata: { track_id: trackId },
    }).catch(() => {});

    return new Response(
      JSON.stringify({
        url: signedUrl,
        expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[mint-playback-url-public-preview] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
