

## Dynamic Per-Session Watermarking

Embeds a unique, per-session watermark ID into every HLS playlist and segment URL without modifying master audio files. This enables forensic tracing of any leaked stream back to the exact playback session.

### Changes

**1. Database Migration**
- Add `watermark_id text` column to `playback_sessions`
- Add index `playback_sessions_watermark_id_idx` for fast lookup during leak investigations

**2. New Secret: `PLAYBACK_WATERMARK_SALT`**
- A random string used to derive the watermark hash from the session ID
- Will prompt you to enter this value before proceeding

**3. Edge Function: `mint-playback-url`**
- After generating `sessionId`, derive `watermarkId = sha256Hex(sessionId + ":" + salt)` (reuses the existing `sha256Hex` helper already in the file)
- Check for `PLAYBACK_WATERMARK_SALT` env var (500 if missing)
- Include `watermark_id` in:
  - The `playback_sessions` DB insert
  - The JWT payload
  - The response JSON under `session.watermark_id`

**4. Worker: `playback-guard.ts`**
- Extract `watermark_id` from the verified JWT payload
- Replace old `rewritePlaylist` with two new functions:
  - `injectWatermark(playlist, watermarkId)`: inserts `#EXT-X-SESSION-DATA:DATA-ID="WATERMARK",VALUE="..."` after `#EXTM3U`
  - `rewritePlaylistWithTokenAndWatermark(text, token, watermarkId)`: appends both `token=` and `wm=` to segment URLs
- Apply both transforms to `.m3u8` responses

**5. Client**
- No changes needed. The watermark is entirely server-side.

### Technical Flow

```text
mint-playback-url:
  sessionId = randomUUID()
  watermarkId = sha256Hex(sessionId + ":" + PLAYBACK_WATERMARK_SALT)
  -> stored in playback_sessions.watermark_id
  -> embedded in JWT { ..., watermark_id }
  -> returned in response session.watermark_id

playback-guard Worker:
  JWT verified -> payload.watermark_id extracted
  .m3u8 response:
    1. #EXT-X-SESSION-DATA:DATA-ID="WATERMARK",VALUE="<hash>" injected after #EXTM3U
    2. Segment URIs get ?token=...&wm=<hash> appended
  .ts segments:
    wm= param available for future server-side audio watermark embedding
```
