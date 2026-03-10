# Playback Protection Architecture

## Purpose

Protect audio from direct download by using short‑lived playback sessions, HLS segmenting, and a token‑gated delivery layer.

## Components

- **Client**: `useAudioPlayer` with `hls.js` (or native HLS on Safari), `ExclusiveSongCard` (artist dashboard: full track + hook preview playback), `CompactVaultPlayer` (fan profile: receives `paidStreamData` from charge flow)
- **Edge Function**: `charge-stream` (primary entry point for fan paid streams — mints session JWT and returns `hlsUrl` directly), `mint-playback-url` (artist dashboard, replay, and on-demand signed URLs), `complete-multipart-upload` (enqueues HLS transcode jobs)
- **Worker**: `playback-guard` (Cloudflare Worker)
- **Queue**: `hls-transcode-queue` (Cloudflare Queue for HLS jobs)
- **Storage**: R2 bucket
  - `artists/{artistId}/audio/` for raw uploads
  - `hls/{trackId}/` for HLS playlists/segments
- **DB**: `playback_sessions` (traceability)

## Secrets / Config

- `PLAYBACK_JWT_SECRET` (Edge Function + Worker)
- `HLS_WORKER_BASE_URL` (Edge Function)
- R2 bucket binding for Worker

## Playback Flow (HLS)

### Fan Paid Stream (primary path)

1. Fan selects a track on the artist profile page (UI state only — no audio loading).
2. Fan confirms stream via `StreamConfirmModal`.
3. `charge-stream` edge function deducts 1 credit, mints a session JWT, records the session in `playback_sessions`, and returns `hlsUrl` and `sessionId` directly in the response.
4. `ArtistProfilePage` passes `paidStreamData` (`hlsUrl` + `sessionId`) to `CompactVaultPlayer`.
5. `CompactVaultPlayer` calls `loadPaidStream()` with the provided `hlsUrl` — **no separate `mint-playback-url` call**.
6. Client loads HLS via `hls.js` or native HLS (Safari).
7. Worker validates JWT and serves playlist, rewriting segment URLs to include `?token=`.

### Artist Dashboard / Replay / On-Demand

1. Client requests playback for `trackId`.
2. `mint-playback-url` verifies access and mints a session JWT.
3. Session is recorded in `playback_sessions`.
4. Response includes:
   - `hlsUrl = {HLS_WORKER_BASE_URL}/{trackId}/master.m3u8?token=<sessionToken>`
   - `sessionToken` + session metadata
   - signed fallback URL (non‑HLS)
5. Client loads `hlsUrl` using `hls.js` or native HLS.
6. Artist dashboard uses this flow for on-demand playback of full tracks and 15-second hook previews. Audio elements are created synchronously (user-gesture compliance) with signed URLs assigned asynchronously.
7. Worker validates JWT and serves playlist.
8. Worker rewrites playlist entries so each segment URL includes `?token=`.

## Enforcement

- JWT expiry enforces time‑limited access.
- R2 bucket is private; only Worker can read segments.
- Signed URL fallback exists but is secondary to HLS.
- No public audio URLs are stored or exposed to the client; all playback resolves R2 keys to short-lived signed URLs at play time.

## Validation Checklist

- 401 for playlist without token.
- 200 with valid token.
- Playlist returns `#EXTM3U`.
- Segment URLs load from Worker.

Below is a Cloudflare‑only queue pipeline skeleton. It’s designed to write HLS to hls/{trackId}/... in R2, matching your existing worker + charge-stream URLs.
1) Queue Producer (Worker)
export interface Env {  HLS_TRANSCODE_QUEUE: Queue;}interface HlsJob {  trackId: string;  artistId: string;  inputKey: string; // e.g. artists/{artistId}/audio/{trackId}.mp3}export default {  async fetch(req: Request, env: Env): Promise<Response> {    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });    const body = (await req.json()) as Partial<HlsJob>;    if (!body.trackId || !body.artistId || !body.inputKey) {      return new Response("Missing job fields", { status: 400 });    }    await env.HLS_TRANSCODE_QUEUE.send({      trackId: body.trackId,      artistId: body.artistId,      inputKey: body.inputKey,    });    return new Response(JSON.stringify({ ok: true }), {      status: 200,      headers: { "Content-Type": "application/json" },    });  },};
2) Queue Consumer (Transcode Worker, FFmpeg WASM skeleton)
export interface Env {  R2_BUCKET: R2Bucket;}interface HlsJob {  trackId: string;  artistId: string;  inputKey: string;}// Pseudocode placeholders for FFmpeg WASMasync function transcodeToHlsWasm(inputBytes: Uint8Array) {  // TODO: integrate FFmpeg WASM (e.g. @ffmpeg/ffmpeg build compatible with Workers)  // Must output: master.m3u8, variant.m3u8, seg_000.ts, ...  return {    "master.m3u8": new Uint8Array(),    "variant.m3u8": new Uint8Array(),    "seg_000.ts": new Uint8Array(),  };}export default {  async queue(batch: MessageBatch<HlsJob>, env: Env): Promise<void> {    for (const msg of batch.messages) {      const { trackId, inputKey } = msg.body;      const inputObj = await env.R2_BUCKET.get(inputKey);      if (!inputObj) {        msg.retry(); // raw audio missing        continue;      }      const inputBytes = new Uint8Array(await inputObj.arrayBuffer());      const outputs = await transcodeToHlsWasm(inputBytes);      const base = `hls/${trackId}/`;      for (const [name, bytes] of Object.entries(outputs)) {        await env.R2_BUCKET.put(`${base}${name}`, bytes, {          httpMetadata: {            contentType: name.endsWith(".m3u8")              ? "application/vnd.apple.mpegurl"              : "video/mp2t",          },        });      }      msg.ack();    }  },};
3) Wrangler bindings (producer)
name = "hls-queue-producer"main = "producer.js"compatibility_date = "2026-02-22"[[queues.producers]]binding = "HLS_TRANSCODE_QUEUE"queue = "hls-transcode-queue"
4) Wrangler bindings (consumer)
name = "hls-queue-consumer"main = "consumer.js"compatibility_date = "2026-02-22"[[queues.consumers]]queue = "hls-transcode-queue"max_batch_size = 1max_batch_timeout = 30[[r2_buckets]]binding = "R2_BUCKET"bucket_name = "musicexclusive-audio"
