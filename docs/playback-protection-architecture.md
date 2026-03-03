# Playback Protection Architecture

## Purpose

Protect audio from direct download by using short‑lived playback sessions, HLS segmenting, and a token‑gated delivery layer.

## Components

- **Client**: `useAudioPlayer` with `hls.js` (or native HLS on Safari), `ExclusiveSongCard` (artist dashboard: full track + hook preview playback), `CompactVaultPlayer` (fan profile: receives `paidStreamData` from charge flow)
- **Edge Function**: `charge-stream` (primary entry point for fan paid streams — mints session JWT and returns `hlsUrl` directly), `mint-playback-url` (artist dashboard, replay, and on-demand signed URLs)
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
