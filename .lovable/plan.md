
## Completed: Double-Mint Elimination (2026-03-03)

**What was done:**
- Eliminated redundant `mint-playback-url` calls during fan paid streams by using the `hlsUrl` returned directly from `charge-stream`.
- Fixed `charge-stream` protocol normalization (`https://` prefix for `HLS_WORKER_BASE_URL`).
- Updated `CompactVaultPlayer` to accept `paidStreamData` prop and call `loadPaidStream()` directly.
- Updated `ArtistProfilePage` to pass charge result's `hlsUrl`/`sessionId` to the player.
- Updated `docs/playback-protection-architecture.md`, `docs/global-audio-engine-plan.md`, and `docs/final-audit-report.md` to reflect the new flow.

## Completed: Upload Flow Verification (2026-03-17)

**Status:** Client-side code correctly configured — no code changes required.

**Verified:**
- `SUPABASE_URL` → `https://esgpsapstljgsqpmezzf.supabase.co`
- `create-track-draft` call routes to `${SUPABASE_URL}/functions/v1/create-track-draft`
- `r2MultipartUpload` routes to external project for `initiate-multipart-upload`, `sign-upload-part`, `complete-multipart-upload`
- localStorage auth token key → `sb-esgpsapstljgsqpmezzf-auth-token`

**If 401 persists:** Issue is on external project deployment/config — verify `verify_jwt = false` in external `config.toml` and check Edge Function logs for `getClaims()` output.
