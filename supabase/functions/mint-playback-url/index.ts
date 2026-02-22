import { createClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

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
  const amzDate = now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
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
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const sigB64 = base64url(new Uint8Array(sig));
  return `${data}.${sigB64}`;
}

/* ── Main handler ── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate user token
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Body ──
    const { trackId, fileType } = await req.json();
    if (!trackId || !["audio", "preview", "artwork"].includes(fileType)) {
      return new Response(JSON.stringify({ error: "Missing trackId or invalid fileType (audio|preview|artwork)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Access check (service role to bypass RLS) ──
    const admin = createClient(supabaseUrl, supabaseServiceKey);
    const userEmail = user.email?.toLowerCase() ?? "";

    // Look up the track
    const { data: track, error: trackErr } = await admin
      .from("tracks")
      .select("artist_id, full_audio_key, preview_audio_key, artwork_key, status")
      .eq("id", trackId)
      .maybeSingle();

    if (trackErr || !track) {
      return new Response(JSON.stringify({ error: "Track not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Artwork is promotional — any authenticated user may view it.
    // Audio/preview require full access check.
    if (fileType !== "artwork") {
      if (track.status !== "ready") {
        return new Response(JSON.stringify({ error: "Track not available" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check access: admin, artist owner, or active vault member
      const [roleResult, vaultResult] = await Promise.all([
        admin.from("user_roles").select("role").eq("user_id", user.id),
        admin.from("vault_members").select("vault_access_active").eq("email", userEmail).maybeSingle(),
      ]);

      const roles = (roleResult.data ?? []).map((r: any) => r.role as string);
      const isAdmin = roles.includes("admin");
      const isArtist = roles.includes("artist");
      const isVaultActive = vaultResult.data?.vault_access_active === true;

      // Artist ownership check
      let isOwner = false;
      if (isArtist) {
        const { data: profile } = await admin.from("artist_profiles").select("id").eq("user_id", user.id).maybeSingle();
        if (profile && String(profile.id) === track.artist_id) {
          isOwner = true;
        }
      }

      if (!isAdmin && !isOwner && !isVaultActive) {
        return new Response(JSON.stringify({ error: "Access denied" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Mint playback session JWT ──
    const sessionId = crypto.randomUUID();
    const sessionExpiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
    const sessionExpiresAtIso = new Date(sessionExpiresAt * 1000).toISOString();

    const playbackJwtSecret = Deno.env.get("PLAYBACK_JWT_SECRET");
    if (!playbackJwtSecret) {
      return new Response(JSON.stringify({ error: "Missing PLAYBACK_JWT_SECRET" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hlsWorkerBaseUrl = Deno.env.get("HLS_WORKER_BASE_URL");
    if (!hlsWorkerBaseUrl) {
      return new Response(JSON.stringify({ error: "Missing HLS_WORKER_BASE_URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionToken = await signJwtHS256(
      {
        track_id: trackId,
        user_id: user.id,
        session_id: sessionId,
        expires_at: sessionExpiresAt,
        exp: sessionExpiresAt,
        iat: Math.floor(Date.now() / 1000),
      },
      playbackJwtSecret
    );

    // ── Record session in DB ──
    const ipAddress = req.headers.get("cf-connecting-ip");
    const userAgent = req.headers.get("user-agent");

    const { error: sessionInsertError } = await admin
      .from("playback_sessions")
      .insert({
        session_id: sessionId,
        user_id: user.id,
        track_id: trackId,
        expires_at: sessionExpiresAtIso,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (sessionInsertError) {
      console.error("[mint-playback-url] Session insert error:", sessionInsertError);
      return new Response(
        JSON.stringify({ error: "Failed to store playback session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Resolve key ──
    const key = fileType === "audio"
      ? track.full_audio_key
      : fileType === "preview"
      ? track.preview_audio_key
      : track.artwork_key;

    if (!key) {
      return new Response(JSON.stringify({ error: `No ${fileType} key on this track` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Artwork gets a longer TTL (5 min) since it's just a cover image
    const ttl = fileType === "artwork" ? 300 : 90;
    const signedUrl = await presignR2Url(key, ttl);

    const hlsUrl = `${hlsWorkerBaseUrl}/${trackId}/master.m3u8?token=${encodeURIComponent(sessionToken)}`;

    return new Response(
      JSON.stringify({
        url: signedUrl,
        expiresAt: new Date(Date.now() + ttl * 1000).toISOString(),
        sessionToken,
        hlsUrl,
        session: {
          track_id: trackId,
          user_id: user.id,
          session_id: sessionId,
          expires_at: sessionExpiresAtIso,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[mint-playback-url] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
