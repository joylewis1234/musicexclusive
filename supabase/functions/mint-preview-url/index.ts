import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/* ── AWS Signature V4 presign helpers (same as mint-playback-url) ── */

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

/* ── Main handler ── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { trackId } = await req.json();
    if (!trackId) {
      return new Response(JSON.stringify({ error: "Missing trackId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role to look up the track's preview key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: track, error: trackErr } = await admin
      .from("tracks")
      .select("preview_audio_key, status")
      .eq("id", trackId)
      .maybeSingle();

    if (trackErr || !track) {
      return new Response(JSON.stringify({ error: "Track not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (track.status !== "ready") {
      return new Response(JSON.stringify({ error: "Track not available" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only serve preview_audio_key — never full audio
    if (!track.preview_audio_key) {
      return new Response(JSON.stringify({ error: "No preview available" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Short TTL for preview (60 seconds)
    const ttl = 60;
    const signedUrl = await presignR2Url(track.preview_audio_key, ttl);

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
    console.error("[mint-preview-url] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
