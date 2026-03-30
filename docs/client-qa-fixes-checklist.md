# Client QA — fixes checklist

Action items derived from fan-flow testing feedback (daily report, earnings, share, preview Superfan, playback, playlist, exclusivity, upload/preview). Check off as completed.

## Engineering — UI / playback

- [x] **Preview Superfan CTA** — Either set `VAULT_LOCKED_MODAL_ENABLED` to `true` in `VaultLockedModal.tsx`, or change preview CTAs to `navigate("/founding-superfan")` (or your subscribe route) instead of opening a disabled modal. *(Done: `PreviewHeader`, `PreviewUpsellModal` navigate to `/founding-superfan`.)*
- [x] **Single paid-playback path** — After a successful `chargeStream`, use returned `hlsUrl` / `loadPaidStream` consistently (e.g. fan playlist `handlePlayTrack` path) so mint-only full audio isn’t parallel to charged sessions. *(Done: `PlaylistSection` + `FanProfile` pass `hlsUrl`/`sessionId` into `loadPaidStream` when present.)*
- [x] **Playback errors vs audio** — Ensure `VaultMusicPlayer` (if still mounted anywhere) calls charge **before** `play()`; reduce spurious “Stream failed” toasts when playback is intentionally from another path. *(Done: `VaultMusicPlayer` calls `onPlay` before `play` on first play.)*
- [ ] **HLS fallback** — Keep or tune `useAudioPlayer` HLS → direct URL fallback; optionally surface one clear message instead of multiple errors.

## Engineering — Fan playlist

- [x] **fan_playlists RLS + vault match** — Policies used case-sensitive JWT email while `vault_members` is case-insensitive; inserts could fail silently. Fixed in migration `20260329120000_fan_playlists_rls_case_insensitive_playlist_cleanup.sql` (`user_id` or `lower(email)`). **Deploy:** run migrations. Still confirm `fanVaultId` loads for the fan in prod.
- [x] **Non-ready tracks** — Either hide “add to playlist” until `tracks.status === 'ready'`, or show playlist rows in a “processing” state instead of silently filtering them out in `usePlaylist`. *(Done: fetch all statuses; show “Processing”; block play until `ready`.)*
- [x] **Playlist rows disappearing** — DB trigger removed playlist entries whenever `tracks.status` left `ready` (e.g. processing). Same migration narrows cleanup to **`status = 'disabled'`** only.

## Engineering — Preview / upload

- [ ] **New song on `/preview`** — Ensure pipeline sets `status = 'ready'`, `is_preview_public = true`, and `preview_audio_key` (per `get_public_preview_tracks()`). Fix any upload error path she hit (repro + edge function / DB insert).

## Engineering — Exclusivity

- [x] **Emails vs DB** — Align `check-exclusivity` with product: e.g. stop “expired” mails when `exclusivity_decision` is set, or auto-set decision at expiry if policy allows. *(Done: at most one `exclusivity_expired` email per track — lifetime dedup via `email_logs`.)*
- [x] **Countdown UI** — Align `ExclusivityBanner` math (date-fns day/hour vs live countdown) and timezone copy with the same rules as emails. *(Done: safe-period days use same ceil formula as `check-exclusivity`.)*

## Engineering — Reporting / earnings (verify first)

- [x] **Daily report date** — Confirm `send-daily-report` uses intended **America/Chicago** window vs when streams occurred; document or fix cron/report date for testers. *(Doc comment added in `send-daily-report`.)*
- [ ] **Idempotency** — Confirm admin isn’t viewing a skipped/regenerated report for the wrong date (`report_email_logs`).
- [ ] **Artist earnings** — Confirm production RLS on `stream_ledger` matches repo (`artist_profiles.id::text`); confirm tester uses the artist account whose `artist_id` appears on rows.

## Engineering — Stripe

- [x] **Webhook verification** — Replace synchronous `constructEvent` with async path where required (`constructEventAsync` / Deno crypto) so `signature_invalid` / SubtleCrypto errors stop. *(Done: `constructEventAsync` in `stripe-webhook`.)*

## Engineering — Share (if product stays “vault only”)

- [x] **Empty state** — When `shareable_vault_members` has no one else, show explicit copy: “No other active Vault members to share with yet.” *(Done: `ShareExclusiveTrackModal`, `ShareArtistProfileModal`, `ShareTrackModal`.)*
- [ ] **Optional later** — Invite-by-email or share-link if product requires sharing outside the vault member list.

## Ops / data (no code)

- [ ] **Second test fan** — For share QA, ensure at least two `vault_access_active` members exist (or accept empty list as expected).
- [ ] **Reconcile “$0” reports** — Query `stream_ledger` for tester’s dates and artist id before changing code.

## Product decisions (block engineering if unclear)

- [ ] **What counts as a stream** — Must every full listen go through `charge-stream` (credits + ledger)? If yes, restrict mint full-audio for fans accordingly. *(Fan playlist + bar confirm now prefer `charge-stream` HLS when returned; other surfaces unchanged.)*
- [ ] **Share scope** — Vault members only vs external sharing — decide before building.

## Deploy notes

- Redeploy Edge Functions: **`stripe-webhook`**, **`check-exclusivity`** (and any cron that invokes it).
