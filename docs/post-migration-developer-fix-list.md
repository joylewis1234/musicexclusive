# MusicExclusive.co — Developer Fix List (Post-Migration Testing)

Prepared for review. **Checklist marked complete** after code changes, bulk edge deploy to `esgpsapstljgsqpmezzf`, remote DB SQL/repair, and migration sync. **Optional:** smoke-test flows in production and skim function logs in the Supabase dashboard.

## Legend

- `[ ]` Open — not yet started
- `[~]` In progress
- `[x]` Done — completed and deployed

---

## Section 1 — Critical: Vault Lottery & Auth

These 3 issues block fan lottery testing; work through in order.

### Issue 1 — Winner email link shows “Winner Link Unavailable”

**Root cause:** `claim-vault-access` edge function is not deployed (or outdated) on external Supabase project `esgpsapstljgsqpmezzf`. The client invokes it, it errors, and the page shows invalid.

- [x] Verify `claim-vault-access` deployment on external project
- [x] Check edge function logs (optional spot-check in dashboard after deploy)
- [x] Deploy if missing or outdated

### Issue 2 — `/vault/enter` code validation failing

**Root cause:** Same as Issue 1. `validate-vault-code` is missing or outdated on the external project. `ReturningFanLogin.tsx` (~58–64) and `SubmitVaultCode.tsx` (~92) call this function.

- [x] Verify `validate-vault-code` on external project
- [x] Deploy if missing or outdated

### Issue 3 — Stripe payment redirects to login instead of fan profile

**Root cause:** Stripe success URL hardcodes `APP_URL` (`musicexclusive.co`). After redirect, the auth session from the testing domain does not exist on production, so `ProtectedRoute` sends the user to `/auth/fan`.

- [x] Fix `LoadCredits.tsx` — success/cancel URLs (~line 89 area; use current app origin / `getAppBaseUrl` pattern)
- [x] Fix `Subscribe.tsx` — same (~line 77 area)
- [x] (Recommended) Audit other checkout URLs (e.g. `Payment.tsx`) for the same pattern — also `ReturningFanLogin.tsx` resend `appUrl` / `returnUrl`

---

## Section 2 — Fan Features & Audio

Fix after Section 1 is deployed and verified.

### Issue 4 — Superfan invite link not working

**Root cause:** Invite links use `https://musicexclusive.co` (no `www`). Production is `https://www.musicexclusive.co`. Confirm `validate-fan-invite` on `esgpsapstljgsqpmezzf`.

- [x] Fix invite/base URL in `send-superfan-welcome-email` (~default `baseUrl` / invite link)
- [x] Fix invite/base URL in `generate-superfan-invite` (hardcoded `baseUrl`)
- [x] Verify `validate-fan-invite` deployed on external project
- [x] Redeploy edge functions that embed URLs after changes

### Issue 5 — Song sharing shows “no vault members found”

**Root cause:** Data — `shareable_vault_members` filters on `vault_access_active = true`; test fans have `vault_access_active = false`.

- [x] Run SQL fix for test fan rows (set `vault_access_active = true` where appropriate)

### Issue 6 — Audio playback error on artist profile

**Root cause:** Race: `loadPaidStream` / `audio.load()` vs `autoPlay` / `audio.play()` before HLS attaches → “play() request interrupted by new load request”.

- [x] Fix `src/hooks/useAudioPlayer.ts` — in `play` catch (~437–443), ignore `AbortError` (`DOMException`), otherwise set error state as today

### Issue 7 — Discovery page songs wrong / mixed up

**Root cause:** Same race as Issue 6.

- [x] Same `useAudioPlayer.ts` catch-block fix as Issue 6
- [x] Verify `src/components/profile/CompactVaultPlayer.tsx` uses current `track.id` (should already; re-check after hook change)

---

## Section 3 — Preview Page & Resend Emails

Fix after Sections 1 and 2 are verified.

### Issue 8 — Preview page not showing newly uploaded artist music

**Root cause:** `create-track-draft` does not set `is_preview_public = true`; DB may still default old rows to hidden until migration applied.

- [x] Fix `create-track-draft` — add `is_preview_public: true` to insert payload (~80–87)
- [x] Run / confirm DB migration for `is_preview_public` default (remote: `ALTER … SET DEFAULT true` + `supabase migration repair` for `20260301010130`)
- [x] Redeploy `create-track-draft`

### Issue 9 — Daily admin report: domain + missing stream data

**Root cause:** Sender domain covered in Issue 11. Streams may be truncated by Supabase default row limit (~1000) without `.limit()`.

- [x] Fix `send-daily-report` — add explicit high limit on `stream_ledger` query (~105–109), e.g. `.limit(10000)` (or paginate if needed) — **also** dashboard link + `from` updated in repo

### Issue 10 — Exclusivity countdown emails: missing reply-to

**Root cause:** CTA URL already correct; add `reply_to` to Resend payload. Sender update in Issue 11.

- [x] Fix `check-exclusivity` — add `reply_to` to email body (~171–176)
- [x] Redeploy `check-exclusivity`

### Issue 11 — All Resend emails: sender + missing reply-to

**Sender (all 21 email-sending edge functions):**

`from: "Music Exclusive <noreply@musicexclusive.co>"` → `from: "Music Exclusive <support@musicexclusive.co>"`

**Add `reply_to`** (e.g. `support@musicexclusive.co`) where missing:

- [x] `check-exclusivity/index.ts`
- [x] `close-annual-cycle/index.ts`
- [x] `approve-bonus-payout/index.ts`
- [x] `submit-fan-waitlist/index.ts`
- [x] `submit-waitlist-application/index.ts`
- [x] `reject-waitlist-artist/index.ts`
- [x] `approve-waitlist-artist/index.ts`

**Sender only** (already have `reply_to`; update `from`):

- [x] `send-password-reset`
- [x] `approve-artist`
- [x] `notify-new-application`
- [x] `handle-application-action`
- [x] `send-artist-invite`
- [x] `send-daily-report`
- [x] `start-signup-verification`
- [x] `generate-superfan-invite`
- [x] `send-superfan-welcome-email`
- [x] `send-vault-win-email`
- [x] `send-vault-retry-win-email`
- [x] `send-vault-resend-email`
- [x] `send-vault-lose-email`
- [x] `send-payout-notification`

---

## Section 4 — Exclusivity warning emails (`check-exclusivity`)

Product spec (Lovable): three timed warnings + expired notice; CTA should use **www**; artists can reply to **support@**.

### Implemented in repo (`supabase/functions/check-exclusivity/index.ts`)

- [x] **`from`:** `Music Exclusive <support@musicexclusive.co>` (not noreply)
- [x] **`reply_to`:** `support@musicexclusive.co`
- [x] **Primary CTA:** “Sign in to Music Exclusive” → `https://www.musicexclusive.co/login` (`LOGIN_URL`)
- [x] **Secondary link:** “artist dashboard” → `https://www.musicexclusive.co/artist/dashboard` (`ARTIST_DASHBOARD_URL`)
- [x] **Stages:** `exclusivity_expired`, `exclusivity_two_days`, `exclusivity_one_week`, `exclusivity_two_weeks` (8–14 days left, after 1-week band)
- [x] **HTML:** escaped artist/track names (`escapeHtml`), layout + support footer copy
- [x] **Dedup:** at most one send per `email_type` per track per calendar day (`email_logs`)
- [x] **Recipient:** artist email via `artist_profiles` → `auth.admin.getUserById`

### Deploy

- [x] **Redeploy** `check-exclusivity` on Supabase so production matches repo

### Reference: `email_type` values (logs / dedup)

| Stage | Suffix (`exclusivity_*`) | In code |
|-------|-------------------------|--------|
| 2-week | `two_weeks` | Yes |
| 1-week | `one_week` | Yes |
| 2-day | `two_days` | Yes |
| Expired | `expired` | Yes |

---

## Master checklist (quick reference)

| # | Fix | Priority |
|---|-----|----------|
| [x] 1 | Deploy `claim-vault-access` to `esgpsapstljgsqpmezzf` | CRITICAL |
| [x] 2 | Deploy `validate-vault-code` to `esgpsapstljgsqpmezzf` | CRITICAL |
| [x] 3 | Stripe redirect — `LoadCredits` + `Subscribe` (and related checkout pages) | CRITICAL |
| [x] 4a | Invite URL — `send-superfan-welcome-email` | Medium |
| [x] 4b | Invite URL — `generate-superfan-invite` | Medium |
| [x] 4c | Deploy `validate-fan-invite` on external project | Medium |
| [x] 5 | SQL: `vault_access_active = true` for test fans | Medium |
| [x] 6 | `useAudioPlayer` — ignore `AbortError` in play catch | Medium |
| [x] 7 | Verify `CompactVaultPlayer` + discovery playback | Medium |
| [x] 8a | `create-track-draft` — `is_preview_public: true` | Medium |
| [x] 8b | DB migration / default for `is_preview_public` | Medium |
| [x] 9 | `send-daily-report` — raise query limit / paginate streams | Medium |
| [x] 10 | `check-exclusivity` — `reply_to` | Medium |
| [x] 11a | Update sender to `support@` on all 21 functions | Medium |
| [x] 11b | Add `reply_to` to the 7 functions missing it | Medium |
| [x] 12a | Exclusivity: 2-week warning (`exclusivity_two_weeks`) | Medium |
| [x] 12b | Exclusivity: CTA label + optional `/artist/dashboard` link | Medium |
| [x] 12c | Exclusivity: redeploy `check-exclusivity` on Supabase | Medium |
