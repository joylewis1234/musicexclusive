

## Add HLS Playback Guard: Edge Function Update + Worker Reference

### Overview
Three deliverables:
1. Save the Cloudflare Worker code as a reference file in the repo
2. Add `HLS_WORKER_BASE_URL` secret and update `mint-playback-url` to return `hlsUrl`
3. No client changes yet (HLS assets not in R2 yet)

### Step 1 -- Save Worker reference file

Create `docs/cloudflare-workers/playback-guard.ts` with the full Worker implementation you provided (JWT verification, R2 proxying, playlist rewriting). This is a reference for deploying on Cloudflare -- it does not run in this project.

### Step 2 -- Add `HLS_WORKER_BASE_URL` secret

Use the secrets tool to prompt for the Worker's deployed URL (e.g. `https://playback-guard.your-account.workers.dev`). This will be read by the edge function.

### Step 3 -- Update `mint-playback-url` edge function

After the session JWT is minted and before the final response, add:

- Read `HLS_WORKER_BASE_URL` from env
- If missing, return 500 (same pattern as `PLAYBACK_JWT_SECRET` check)
- Build `hlsUrl` as `{HLS_WORKER_BASE_URL}/{trackId}/master.m3u8?token={sessionToken}`
- Add `hlsUrl` to the success response JSON alongside the existing `url`, `expiresAt`, `sessionToken`, and `session` fields

Updated response shape:
```json
{
  "url": "https://... (signed R2 URL, unchanged)",
  "expiresAt": "2026-...",
  "sessionToken": "eyJ...",
  "hlsUrl": "https://playback-guard.../trackId/master.m3u8?token=eyJ...",
  "session": {
    "track_id": "...",
    "user_id": "...",
    "session_id": "...",
    "expires_at": "2026-..."
  }
}
```

### Step 4 -- Deploy edge function

Automatic on save.

### What does NOT change
- All existing access checks, signed URL logic, session insert, and error handling remain intact
- `useAudioPlayer` and other client hooks are untouched -- they will receive `hlsUrl` in the response and ignore it until we add hls.js support
- No database changes

### File summary

| File | Action |
|------|--------|
| `docs/cloudflare-workers/playback-guard.ts` | Create (reference only) |
| `supabase/functions/mint-playback-url/index.ts` | Edit (add hlsUrl to response) |

