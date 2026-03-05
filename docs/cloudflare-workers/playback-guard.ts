/**
 * Cloudflare Worker: playback-guard
 *
 * Reference implementation — deploy this on Cloudflare, NOT inside
 * this repo's edge functions.  It validates the HS256 session JWT
 * minted by `mint-playback-url`, proxies HLS assets from R2, and
 * rewrites playlist lines so every segment request carries the token
 * and a per-session watermark ID for forensic tracing.
 *
 * Bindings (wrangler.toml):
 *   [[r2_buckets]]
 *   binding = "R2_BUCKET"
 *   bucket_name = "musicexclusive-audio"
 *
 *   [vars]
 *   PLAYBACK_JWT_SECRET = "<same secret as edge function>"
 */

export interface Env {
  PLAYBACK_JWT_SECRET: string;
  R2_BUCKET: R2Bucket;
}

const HLS_PREFIX = "hls";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range",
};

/* ── JWT helpers ── */

function base64urlToBytes(b64url: string): Uint8Array {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function verifyJwtHS256(
  token: string,
  secret: string,
): Promise<Record<string, any> | null> {
  const [hB64, pB64, sB64] = token.split(".");
  if (!hB64 || !pB64 || !sB64) return null;

  const header = JSON.parse(new TextDecoder().decode(base64urlToBytes(hB64)));
  if (header.alg !== "HS256") return null;

  const data = `${hB64}.${pB64}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );

  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    base64urlToBytes(sB64),
    new TextEncoder().encode(data),
  );
  if (!ok) return null;

  const payload = JSON.parse(new TextDecoder().decode(base64urlToBytes(pB64)));
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp < now) return null;

  return payload;
}

/* ── Watermark injection ── */

function injectWatermark(playlist: string, watermarkId: string): string {
  const header = `#EXT-X-SESSION-DATA:DATA-ID="WATERMARK",VALUE="${watermarkId}"`;
  const lines = playlist.split("\n");
  const output: string[] = [];
  let injected = false;
  for (const line of lines) {
    if (!injected && line.startsWith("#EXTM3U")) {
      output.push(line);
      output.push(header);
      injected = true;
      continue;
    }
    output.push(line);
  }
  return output.join("\n");
}

/* ── Playlist rewriter with token + watermark ── */

function rewritePlaylistWithTokenAndWatermark(
  text: string,
  token: string,
  watermarkId: string,
): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return line;
      const sep = trimmed.includes("?") ? "&" : "?";
      return `${trimmed}${sep}token=${encodeURIComponent(token)}&wm=${encodeURIComponent(watermarkId)}`;
    })
    .join("\n");
}

/* ── Worker fetch handler ── */

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) return new Response("Missing token", { status: 401, headers: corsHeaders });

    const payload = await verifyJwtHS256(token, env.PLAYBACK_JWT_SECRET);
    if (!payload) return new Response("Invalid token", { status: 401, headers: corsHeaders });

    const watermarkId: string = payload.watermark_id ?? "";

    // Strip leading slashes and build the R2 key
    const path = url.pathname.replace(/^\/+/, "");
    const key = `${HLS_PREFIX}/${path}`;

    const obj = await env.R2_BUCKET.get(key);
    if (!obj) return new Response("Not found", { status: 404, headers: corsHeaders });

    const isPlaylist = key.endsWith(".m3u8");
    const headers = new Headers();
    obj.writeHttpMetadata(headers);
    headers.set("Cache-Control", "private, max-age=0, no-store");

    if (isPlaylist) {
      const text = await obj.text();
      const withHeader = injectWatermark(text, watermarkId);
      const rewritten = rewritePlaylistWithTokenAndWatermark(withHeader, token, watermarkId);
      headers.set("Content-Type", "application/vnd.apple.mpegurl");
      return new Response(rewritten, { status: 200, headers });
    }

    return new Response(obj.body, { status: 200, headers });
  },
};
