# Cloudflare HLS Queue Pipeline

## Overview
Queue flow to generate per-track HLS assets in R2:

1. Upload completes → enqueue `{ trackId, artistId, inputKey }`.
2. Queue consumer calls external transcoder service.
3. Transcoder writes outputs to `hls/{trackId}/...`.

## Producer
- File: `worker/hls-queue-producer/worker.js`
- Queue binding: `HLS_TRANSCODE_QUEUE`
- Enqueue payload:
  - `trackId`
  - `artistId`
  - `inputKey` (`artists/{artistId}/audio/{trackId}.mp3`)

## Consumer
- File: `worker/hls-queue-consumer/worker.js`
- External service env vars:
  - `HLS_TRANSCODER_URL` (transcoder `/transcode` endpoint)
  - `HLS_TRANSCODER_TOKEN` (optional bearer token)
  - `HLS_TRANSCODER_TIMEOUT_MS` (optional timeout in ms)

## Output
Expected objects in R2:
- `hls/{trackId}/master.m3u8`
- `hls/{trackId}/seg_000.ts`
# Cloudflare HLS Queue Pipeline (Skeleton)

## Overview
Cloudflare-only flow to generate per-track HLS assets in R2:

1. Upload completes → enqueue `{ trackId, artistId, inputKey }`.
2. Queue consumer calls external transcoder service.
3. Write outputs to `hls/{trackId}/...`.

## Workers

### Producer
- File: `worker/hls-queue-producer/worker.js`
- Queue binding: `HLS_TRANSCODE_QUEUE`
- Env vars (Supabase edge function):
  - `HLS_QUEUE_PRODUCER_URL` (producer Worker URL)
  - `HLS_QUEUE_PRODUCER_TOKEN` (optional bearer token)
- Enqueue payload:
  - `trackId`
  - `artistId`
  - `inputKey` (`artists/{artistId}/audio/{trackId}.mp3`)

### Consumer
- File: `worker/hls-queue-consumer/worker.js`
- External service env vars:
  - `HLS_TRANSCODER_URL` (transcoder `/transcode` endpoint)
  - `HLS_TRANSCODER_TOKEN` (optional bearer token)
  - `HLS_TRANSCODER_TIMEOUT_MS` (optional timeout in ms)
- Expected output:
  - `hls/{trackId}/master.m3u8`
  - `hls/{trackId}/variant.m3u8`
  - `hls/{trackId}/seg_000.ts`

## Notes
- The consumer no longer performs any transcoding itself; it only dispatches jobs.
