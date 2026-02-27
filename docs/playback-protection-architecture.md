# Playback Protection Architecture

## Purpose

Protect audio from direct download by using short‑lived playback sessions, HLS segmenting, and a token‑gated delivery layer.

## Components

- **Client**: `useAudioPlayer` with `hls.js` (or native HLS on Safari), `ExclusiveSongCard` (artist dashboard: full track + hook preview playback)
- **Edge Function**: `mint-playback-url`
- **Worker**: `playback-guard` (Cloudflare Worker)
- **Storage**: R2 bucket
  - `artists/{artistId}/audio/` for raw uploads
  - `hls/{trackId}/` for HLS playlists/segments
- **DB**: `playback_sessions` (traceability)

## Secrets / Config

- `PLAYBACK_JWT_SECRET` (Edge Function + Worker)
- `HLS_WORKER_BASE_URL` (Edge Function)
- R2 bucket binding for Worker

## Playback Flow (HLS)

1. Client requests playback for `trackId`.
2. `mint-playback-url` verifies access and mints a session JWT.
3. Session is recorded in `playback_sessions`.
4. Response includes:
   - `hlsUrl = {HLS_WORKER_BASE_URL}/{trackId}/master.m3u8?token=<sessionToken>`
   - `sessionToken` + session metadata
   - signed fallback URL (non‑HLS)
5. Client loads `hlsUrl` using `hls.js` or native HLS.
6. Artist dashboard uses the same `mint-playback-url` flow for on-demand playback of full tracks and 15-second hook previews. Audio elements are created synchronously (user-gesture compliance) with signed URLs assigned asynchronously.
7. Worker validates JWT and serves playlist.
7. Worker rewrites playlist entries so each segment URL includes `?token=`.

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
