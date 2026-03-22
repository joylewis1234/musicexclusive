const HLS_PREFIX = "hls";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range",
};

function base64urlToBytes(input) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 ? "=".repeat(4 - (base64.length % 4)) : "";
  const bin = atob(base64 + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function verifyJwtHS256(token, secret) {
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return null;

  const data = new TextEncoder().encode(`${header}.${payload}`);
  const sigBytes = base64urlToBytes(signature);

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const ok = await crypto.subtle.verify("HMAC", key, sigBytes, data);
  if (!ok) return null;

  const payloadJson = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  const parsed = JSON.parse(payloadJson);
  
  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (!parsed.exp || parsed.exp < now) return null;

  return parsed;
}

function injectWatermark(playlist, watermarkId) {
  const header = `#EXT-X-SESSION-DATA:DATA-ID="WATERMARK",VALUE="${watermarkId}"`;
  const lines = playlist.split("\n");
  const output = [];
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

function rewritePlaylistWithTokenAndWatermark(text, token, watermarkId) {
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

async function handleRequest(request, env) {
  try {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    if (url.pathname === "/") {
      return new Response("ok", { status: 200, headers: corsHeaders });
    }

    const token = url.searchParams.get("token");
    if (!token) return new Response("Missing token", { status: 401, headers: corsHeaders });

    const payload = await verifyJwtHS256(token, env.PLAYBACK_JWT_SECRET);
    if (!payload) return new Response("Invalid token", { status: 401, headers: corsHeaders });

    // Extract watermark_id from payload
    const watermarkId = payload.watermark_id ?? "";

    const path = url.pathname.replace(/^\/+/, "");
    const key = `${HLS_PREFIX}/${path}`;
    const isPlaylist = key.endsWith(".m3u8");

    if (!isPlaylist) {
      const cache = caches.default;
      const cacheKey = new Request(`${url.origin}/${path}`, { method: "GET" });
      const cached = await cache.match(cacheKey);
      if (cached) return cached;
    }

    const obj = await env.R2_BUCKET.get(key);
    if (!obj) return new Response("Not found", { status: 404, headers: corsHeaders });

    const headers = new Headers(corsHeaders);
    obj.writeHttpMetadata(headers);
    headers.set("Cache-Control", "private, max-age=0, no-store");

    if (isPlaylist) {
      const text = await obj.text();
      // Inject watermark and rewrite with token + watermark
      const withHeader = injectWatermark(text, watermarkId);
      const rewritten = rewritePlaylistWithTokenAndWatermark(withHeader, token, watermarkId);
      headers.set("Content-Type", "application/vnd.apple.mpegurl");
      return new Response(rewritten, { status: 200, headers });
    }

    const response = new Response(obj.body, { status: 200, headers });
    const cache = caches.default;
    const cacheKey = new Request(`${url.origin}/${path}`, { method: "GET" });
    const cachedResponse = response.clone();
    cachedResponse.headers.set("Cache-Control", "public, max-age=60");
    await cache.put(cacheKey, cachedResponse);
    return response;
  } catch (err) {
    return new Response(
      err instanceof Error ? err.message : "Worker error",
      { status: 500, headers: corsHeaders }
    );
  }
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  },
};
