# Watermarking + Traceability Design

## Goal

Provide per‑session traceability without modifying master audio files.

## Current Traceability (Implemented)

- `playback_sessions` stores:
  - `session_id`, `user_id`, `track_id`, `expires_at`, `ip_address`, `user_agent`
- Session token includes `session_id`.

## Dynamic Watermarking (Metadata‑Only)

- Generate `watermark_id` per session (deterministic hash of `session_id` + salt).
- Store `watermark_id` in `playback_sessions`.
- Embed watermark in playlists:
  - `#EXT-X-SESSION-DATA:DATA-ID="WATERMARK",VALUE="<watermark_id>"`
- Append `wm=<watermark_id>` to segment URLs for traceability.

## Benefits

- No audio processing.
- Session‑level traceability.
- Does not modify master files.

## Validation Checklist

- Playlist includes watermark session data tag.
- Segment URLs include `wm=` parameter.
- `watermark_id` stored in `playback_sessions`.

## Future Extension (Optional)

- Pre‑generated watermark variants per segment.
- On‑demand watermarking pipeline.
