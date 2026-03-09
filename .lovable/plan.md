

# MusicExclusive — Technical Architecture Export

## 1. Technology Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite |
| Styling | Tailwind CSS + tailwindcss-animate |
| Component Library | Radix UI primitives (shadcn/ui pattern) |
| State Management | React Context (Auth, AudioPlayer, Player) + React Query (TanStack) |
| Routing | React Router v6 |
| Forms | React Hook Form + Zod validation |
| Backend | Supabase (Lovable Cloud) — Postgres + Edge Functions (Deno) |
| Payments | Stripe (Checkout, Connect Express, Webhooks) |
| Storage | Cloudflare R2 (S3-compatible) via multipart upload |
| Playback | HLS.js + Cloudflare Worker (`playback-guard`) |
| Email | Resend |
| AI Audio | ElevenLabs (sound effects) |
| AI Text | Lovable AI (promo captions) |

---

## 2. Front-End Structure

### 2.1 Route Map

**Public Routes**
```text
/                          Landing page (Index)
/artist-benefits           Artist marketing page
/vault/enter               Fan vault entry
/vault/submit              Submit vault code
/vault/status              Vault spin result
/vault/congrats            Vault win celebration
/agreements/fan            Fan agreements
/fan/agreements            Fan agreement step
/onboarding/listen         Choose access tier
/subscribe                 Superfan subscription checkout
/load-credits              Credit purchase page
/checkout/return           Stripe checkout callback
/login                     Login hub (fan/artist/admin selector)
/auth/fan                  Fan sign-up / sign-in
/auth/artist               Artist auth
/artist/login              Artist login
/admin/login               Admin login
/forgot-password           Password reset request
/reset-password            Password reset form
/invite                    Invite link landing
/preview                   Public preview discovery
/founding-superfan         Founding Superfan landing
/founding-superfan/confirmed  Confirmed page
/artist-waitlist            Artist waitlist landing
/artist-waitlist/apply      Waitlist form
/artist-waitlist/submitted  Waitlist confirmation
/terms                     Terms of Service
/privacy                   Privacy Policy
/dmca                      DMCA / Copyright
/refunds                   Refund Policy
/patent-notice             Patent Notice
/artist-agreement          Artist Participation Agreement
/test-sounds               Sound test page
/access-restricted         Role mismatch page
```

**Fan Routes** (protected, `role=fan`, wrapped in `FanLayout` with MiniPlayer + BottomNav)
```text
/fan/profile               Fan profile / dashboard
/fan/inbox                 Shared tracks & artists inbox
/fan/payment               Payment page
/fan/add-credits           Add credits
/discovery                 Browse artists & tracks
/artist/:artistId          Artist profile (fan view)
/player/:trackId           Full-screen music player
/player                    Music player (no track pre-selected)
```

**Artist Routes** (protected via `ArtistProtectedRoute`, wrapped in `ArtistLayout` with ArtistBottomNav)
```text
/artist/dashboard          Track management, playback testing
/artist/invites            Generate fan invite links
/artist/profile/edit       Edit profile (bio, avatar, socials)
/artist/earnings           Earnings & payout dashboard
/artist/marketing-studio   Cinematic promo asset generator
/artist/upload             Track upload (no bottom nav)
/artist/agreement-accept   Accept artist participation agreement
/artist/apply              Application entry
/artist/application-form   Full application form
/artist/application-status Application status check
/artist/application-submitted  Confirmation
/artist/setup-account      Post-approval account setup
/artist/pending            Pending activation
```

**Admin Routes** (protected via `AdminProtectedRoute`)
```text
/admin                     Admin dashboard
/admin/reports             Stream & revenue reports
/admin/reports/daily       Daily email report
/admin/fans                Fan stream detail
/admin/fans/:fanId         Individual fan detail
/admin/payouts             Payout batch management
/admin/artist-applications Artist application review
/admin/invitations         Artist invitation management
/admin/test-tools          Test fan/artist creation
/admin/waitlist            Artist waitlist management
/admin/fan-waitlist        Fan waitlist management
/health-check              System health check
/admin/artist-applications/approve  Token-based email action
/admin/artist-applications/deny    Token-based email action
```

### 2.2 Component Architecture

```text
src/components/
├── admin/          ArtistEarningsStatements, FanStreamReport, PayoutBatches, TransactionLedger
├── artist/         BottomNav, InviteSection, AvatarCropper, EarningsDashboard, TrackManagementCard,
│   │               UploadProgressBar, UploadDebugConsole, WeeklyTransparencyReport, PayoutSettings
│   ├── marketing/  TemplateCanvas, CinematicArtistPhoto, CinematicCoverArt
│   └── tutorial/   ArtistTutorial, TutorialPage, WelcomeModal
├── auth/           ProtectedRoute, ArtistProtectedRoute, AdminProtectedRoute
├── discovery/      DiscoveryArtistCard, DiscoveryTrackCard, HotNewArtists, HotNewTracks, SearchFilterBar
├── error-boundaries/ AuthErrorBoundary, PaymentErrorBoundary, PlayerErrorBoundary, TrackListErrorBoundary
├── inbox/          InboxArtistCard, InboxTrackCard
├── legal/          LegalPageLayout, LegalSection
├── player/         StreamConfirmModal, VaultMusicPlayer
├── playlist/       PlaylistPlayerBar, PlaylistSection
├── preview/        PreviewHeader, PreviewTrackCard, PreviewUpsellModal
├── profile/        ArtistHeader, ArtistProfileHero, CompactVaultPlayer, ExclusiveTrackCard,
│                   ShareArtistProfileModal, ShareExclusiveTrackModal, TrackListItem, VaultAccessGate
├── vault/          VaultDoorAnimation, VaultLockedModal, VaultWinScreen, VaultLoseScreen,
│                   VaultPendingScreen, SpinWheel, ReturningFanLogin, FanCommentBubble
├── ui/             ~60 shadcn/ui primitives (Button, Card, Dialog, Toast, etc.) + custom
│                   (ExclusiveBadge, GlowCard, InfoTooltip, LikeButton, PasswordInput, SignedArtwork, etc.)
├── Header, Footer, BottomNav, MiniPlayer, ErrorBoundary, ScrollToTop, etc.
```

### 2.3 State Management

| Context | Purpose |
|---|---|
| `AuthContext` | User/session/role state, sign-up/in/out, role switching (fan/artist/admin), `refreshRole()` |
| `AudioPlayerContext` | Global audio engine — current track, play/pause, seek, HLS playback, queue |
| `PlayerContext` | UI-level player state — mini-player visibility, full-screen toggle |

**React Query** is used for server state (tracks, profiles, credits, playlists, etc.) with `refetchOnWindowFocus: false`.

### 2.4 Custom Hooks

| Hook | Purpose |
|---|---|
| `useStreamCharge` | Charges 1 credit per stream via `charge-stream` edge function with idempotency + retries |
| `useCredits` | Reads/mutates fan credit balance from `vault_members` |
| `useTrackUpload` | End-to-end track upload: draft → compress → R2 multipart → finalize |
| `useAudioPlayer` | Audio playback controls, HLS integration |
| `useAudioPreview` | Preview clip playback for artist dashboard |
| `usePublicAudioPreview` | Unauthenticated preview playback via `mint-playback-url-public-preview` |
| `useArtistProfile` | CRUD for artist profile data |
| `useArtistAccessCache` | Caches artist gate verification to reduce API calls |
| `useFanProfile` | Fan profile data (display name, avatar) |
| `usePlaylist` | Fan playlist management (add/remove tracks) |
| `useTrackLikes` / `useTrackLikesBatch` | Like/unlike tracks, batch fetch like status |
| `useFanTopArtists` | Top artists by like count via RPC |
| `useIsAdmin` | Admin role check |
| `useSignedArtworkUrl` / `usePublicSignedArtwork` | Signed R2 URLs for track artwork |
| `useTemplateExport` / `useVideoExport` | Marketing asset export (image/video) |
| `useUnreadInboxCount` | Badge count for fan inbox |
| `useAvatarUpload` | Avatar upload via edge function |
| `useFanTermsAgreement` / `useArtistAgreement` | Agreement acceptance tracking |
| `useStorageHealthCheck` | R2 storage health diagnostics |
| `useErrorLogger` / `useDebugLogs` | Client-side error logging to `app_error_logs` |

---

## 3. Back-End Structure (Edge Functions)

All functions are Deno-based Supabase Edge Functions. JWT verification is disabled at the gateway level (`verify_jwt = false` in `config.toml`); auth is validated internally via `supabase.auth.getUser()` or `getClaims()`.

### 3.1 Authentication & Roles
| Function | Purpose |
|---|---|
| `finalize-artist-setup` | Creates artist profile + assigns `artist` role (service role) |
| `_shared/verify-admin.ts` | Shared admin verification (role + email allowlist) |

### 3.2 Payments & Credits
| Function | Purpose |
|---|---|
| `create-checkout` | Creates Stripe Checkout for credit purchase (1 credit = $0.20, min 25) |
| `create-subscription-checkout` | Creates Stripe Checkout for Superfan subscription ($5/mo) |
| `stripe-webhook` | Processes `checkout.session.completed` + `invoice.payment_succeeded`; calls `apply_credit_purchase` RPC |
| `verify-checkout` | Client-side fallback to verify payment if webhook delayed |
| `apply-credit-topup` | Manual credit addition via service role |
| `charge-stream` | Deducts 1 credit, records stream, mints HLS playback token |
| `create-connect-account` | Creates Stripe Connect Express account for artist payouts |
| `verify-connect-status` | Checks Stripe Connect onboarding status |
| `process-payouts` | Executes batch Stripe transfers to artists |
| `send-payout-notification` | Emails artist on payout completion |

### 3.3 Playback & Streaming
| Function | Purpose |
|---|---|
| `charge-stream` | Primary: debit credit → create stream record → mint JWT → return `hlsUrl` |
| `mint-playback-url` | Secondary: signed R2 URL + optional HLS token for artist preview / on-demand |
| `mint-playback-url-public-preview` | Public unauthenticated preview URLs |
| `playback-telemetry` | Records playback events |
| `check-exclusivity` | Verifies 3-week exclusive window |

### 3.4 Upload Pipeline
| Function | Purpose |
|---|---|
| `create-track-draft` | Creates draft track record in DB |
| `initiate-multipart-upload` | Starts R2 multipart upload session |
| `sign-upload-part` | Signs individual upload part URLs |
| `upload-part-proxy` | Proxy for upload parts (CORS) |
| `complete-multipart-upload` | Completes R2 multipart assembly |
| `verify-r2-objects` | Confirms R2 objects exist post-upload |
| `upload-track-cover` | Cover art upload |
| `upload-track-media` | Audio media upload |
| `uploadTrackAssets` | Legacy combined upload |
| `upload-avatar` / `upload-fan-avatar` | Profile avatar uploads |
| `storage-health-check` | R2 connectivity test |

### 3.5 Artist Application & Onboarding
| Function | Purpose |
|---|---|
| `submit-artist-application` | Persists application |
| `lookup-artist-application` | Checks existing application by email |
| `notify-new-application` | Emails admin on new application |
| `handle-application-action` | Token-based approve/deny from email |
| `approve-artist` | Admin approval action |
| `finalize-artist-setup` | Creates profile + role after approval |
| `submit-agreement-acceptance` | Records legal agreement acceptance |

### 3.6 Waitlist
| Function | Purpose |
|---|---|
| `submit-waitlist-application` / `submit-fan-waitlist` | Artist/fan waitlist signup |
| `approve-waitlist-artist` / `reject-waitlist-artist` | Admin waitlist actions |

### 3.7 Invites
| Function | Purpose |
|---|---|
| `generate-fan-invite` | Artist generates fan invite links |
| `validate-fan-invite` | Validates + redeems invite token |
| `generate-superfan-invite` | Superfan monthly invite generation |
| `send-artist-invite` | Admin sends artist invitation email |

### 3.8 Vault System
| Function | Purpose |
|---|---|
| `generate-vault-code` | Creates vault access code |
| `validate-vault-code` | Validates vault code entry |
| `ensure-vault-member` | Provisions vault_members row |
| `backfill-vault-user-ids` | Migration: backfill user IDs |

### 3.9 Email (via Resend)
| Function | Purpose |
|---|---|
| `send-vault-win-email` / `send-vault-lose-email` / `send-vault-resend-email` / `send-vault-retry-win-email` | Vault outcome emails |
| `send-superfan-welcome-email` | Superfan onboarding welcome |
| `send-password-reset` | Password reset email |
| `send-daily-report` | Admin daily metrics email |

### 3.10 AI & Misc
| Function | Purpose |
|---|---|
| `elevenlabs-sfx` | AI sound effect generation |
| `generate-promo-captions` | AI-generated marketing captions |
| `aggregate-weekly-earnings` | Weekly earnings aggregation |
| `monitoring-metrics` | System health metrics |
| `create-test-artist` / `create-test-fan` / `delete-test-application` / `reset-test-password` | Admin test tools |

---

## 4. Database Schema

### 4.1 Core Tables

**User & Auth**
| Table | Purpose | Key Columns |
|---|---|---|
| `profiles` | Basic user profile | `user_id`, `display_name`, `avatar_url` |
| `user_roles` | Role assignments | `user_id`, `role` (enum: fan/artist/admin) |

**Artist**
| Table | Purpose | Key Columns |
|---|---|---|
| `artist_profiles` | Artist identity & settings | `user_id`, `artist_name`, `bio`, `avatar_url`, `genre`, social URLs, `stripe_account_id`, `payout_status` |
| `public_artist_profiles` | View (read-only) for fan-facing data | Same as above minus sensitive fields |
| `artist_applications` | Application submissions | `contact_email`, `artist_name`, `status`, `auth_user_id`, `approved_by`, social/music links |
| `artist_agreement_acceptances` | Legal agreement records | `artist_id`, `agreement_version` |
| `artist_waitlist` | Pre-launch waitlist | `email`, `artist_name`, `status`, `music_link` |
| `artist_invitations` | Admin-generated artist invites | `artist_name`, `platform`, `apply_link`, `status` |

**Fan & Vault**
| Table | Purpose | Key Columns |
|---|---|---|
| `vault_members` | Fan membership & credit balance | `email`, `credits`, `vault_access_active`, `membership_type`, `superfan_active`, `display_name`, `user_id` |
| `fan_waitlist` | Fan waitlist | `email`, `first_name`, `status` |
| `fan_invites` | Fan invite tokens | `token`, `inviter_id`, `inviter_type`, `status`, `expires_at` |
| `fan_terms_acceptances` | Fan legal agreement records | `user_id`, `version`, `agreement_type` |
| `fan_playlists` | Fan saved tracks | `fan_id`, `track_id` |

**Tracks & Playback**
| Table | Purpose | Key Columns |
|---|---|---|
| `tracks` | Track metadata | `id`, `artist_id`, `title`, `genre`, `status`, `artwork_url`, `audio_key`, `preview_audio_key`, `like_count` |
| `track_likes` | Fan likes | `fan_id`, `track_id` |
| `stream_ledger` | Stream records (source of truth for revenue) | `fan_id`, `artist_id`, `track_id`, `amount_artist`, `amount_platform`, `payout_status` |
| `stream_charges` | Idempotency for stream charges | `stream_id`, `fan_email`, `track_id`, `idempotency_key` |
| `playback_sessions` | Active playback sessions | `session_id`, `user_id`, `track_id`, `expires_at`, `watermark_id` |
| `playback_tokens` | Single-use playback JWTs | `token_id`, `stream_id`, `expires_at`, `consumed_at` |

**Financial**
| Table | Purpose | Key Columns |
|---|---|---|
| `credit_ledger` | All financial movements | `user_email`, `type`, `credits_delta`, `usd_delta`, `reference` (unique per type+email) |
| `payout_batches` | Weekly payout aggregations | `artist_user_id`, `week_start/end`, `total_artist_net`, `status`, `stripe_transfer_id` |
| `artist_payouts` | Individual payout records | `artist_id`, `payout_batch_id`, `status`, `stripe_transfer_id` |
| `stripe_events` | Webhook idempotency | (implied, used in stripe-webhook) |

**Social**
| Table | Purpose | Key Columns |
|---|---|---|
| `shared_tracks` | Fan-to-fan track sharing | `sender_id`, `recipient_id`, `track_id` |
| `shared_artist_profiles` | Fan-to-fan artist sharing | `sender_id`, `recipient_id`, `artist_profile_id` |
| `shareable_vault_members` | View for share recipient lookup | `id`, `display_name` |

**Admin & System**
| Table | Purpose | Key Columns |
|---|---|---|
| `admin_action_logs` | Admin audit trail | `action_type`, `target_type`, `target_id`, `admin_email` |
| `admin_stream_report_view` | View joining streams + tracks + artists | (read-only view) |
| `app_error_logs` | Client-side error logging | `page`, `error_message`, `user_id` |
| `monitoring_events` | Edge function telemetry | `function_name`, `event_type`, `status`, `latency_ms`, `stage` |
| `email_logs` | Email delivery tracking | `email_type`, `recipient_email`, `status`, `resend_id` |
| `invitation_email_logs` | Artist invitation email logs | `artist_name`, `invite_type`, `status` |
| `report_email_logs` | Daily report email logs | `report_type`, `report_date`, `status` |
| `request_rate_limits` | Rate limiting state | `endpoint`, `key`, `count`, `window_start` |
| `application_action_tokens` | Email-based approve/deny tokens | `application_id`, `token`, `action_type`, `expires_at` |
| `marketing_assets` | Generated marketing images | `artist_id`, `track_id`, `template_id`, `promo_image_url` |

### 4.2 Key Database Functions

| Function | Purpose |
|---|---|
| `debit_stream_credit()` | Atomic: debit 1 credit, insert stream_ledger + credit_ledger entries, idempotent via stream_charges |
| `apply_credit_purchase()` | Atomic: upsert vault_members credits + insert credit_ledger |
| `has_role()` / `get_user_role()` | SECURITY DEFINER role checks (avoids RLS recursion) |
| `is_admin_email()` | Email allowlist check |
| `handle_new_user_role()` | Trigger: auto-assign `fan` role on signup |
| `ensure_admin_role()` | Trigger: auto-assign `admin` role for allowlisted emails |
| `ensure_stream_artist_id()` | Trigger: derives artist_id from track on stream_ledger insert |
| `handle_new_user()` | Trigger: creates profiles row on signup |
| `update_track_like_count()` | Trigger: increments/decrements track like_count |
| `cleanup_playlist_on_track_change()` | Trigger: removes playlist entries when track leaves `ready` |
| `sync_profile_name_to_vault()` | Trigger: syncs profile display_name to vault_members |
| `get_fan_top_artists()` | RPC: top artists by like count |
| `get_public_preview_tracks()` / `get_public_preview_audio_key()` | RPC: public preview data |

### 4.3 RLS Summary

- **Financial tables** (`credit_ledger`, `stream_charges`, `playback_tokens`): writes restricted to `service_role`
- **User roles**: `service_role` only for writes
- **Tracks**: SELECT restricted to service_role, admins, owning artist, or active vault fans
- **Artist profiles**: visible to owner, admins, and active vault members
- **Fan data** (playlists, likes, shared): scoped to owner via JWT email or `auth.uid()`
- **Admin tables**: gated by `has_role(auth.uid(), 'admin')`

---

## 5. Authentication

| Aspect | Implementation |
|---|---|
| Provider | Supabase Auth (email/password) |
| Auto-confirm | Enabled (all signups) |
| Session | JWT stored in localStorage, auto-refresh enabled |
| Roles | Stored in `user_roles` table (enum: `fan`, `artist`, `admin`) |
| Role assignment | `fan` auto-assigned by DB trigger; `artist` assigned by `finalize-artist-setup` edge function; `admin` auto-assigned by trigger for allowlisted emails |
| Dual-role | Single account can hold both `fan` + `artist` roles; active role stored in sessionStorage |
| Route guards | `ProtectedRoute` (fan), `ArtistProtectedRoute` (artist + access cache), `AdminProtectedRoute` (admin) |
| Admin allowlist | `support@musicexclusive.co`, `tinytunesmusic@gmail.com` — enforced by `is_admin_email()` RPC |

---

## 6. Third-Party Integrations

| Service | Purpose | Integration Point |
|---|---|---|
| **Stripe** | Credit purchases, Superfan subscriptions, artist payouts | Edge functions: `create-checkout`, `create-subscription-checkout`, `stripe-webhook`, `process-payouts`, `create-connect-account` |
| **Stripe Connect Express** | Artist payout accounts | `create-connect-account`, `verify-connect-status` |
| **Cloudflare R2** | Audio, artwork, preview storage | Multipart upload via edge functions; presigned URLs via `mint-playback-url` |
| **Cloudflare Worker** (`playback-guard`) | HLS playback token enforcement | JWT validation, segment URL rewriting |
| **Resend** | Transactional email | Edge functions: `send-vault-*-email`, `send-superfan-welcome-email`, `send-daily-report`, `send-password-reset`, `send-payout-notification`, `send-artist-invite`, `notify-new-application` |
| **ElevenLabs** | AI sound effects | Edge function: `elevenlabs-sfx` |
| **Lovable AI** | Promo caption generation | Edge function: `generate-promo-captions` |

---

## 7. Environment Variables / Secrets

**Client-side (.env)**
```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
```

**Server-side (Supabase/Cloud Secrets)**
```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_PUBLISHABLE_KEY
SUPABASE_DB_URL
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_BASE_URL
HLS_WORKER_BASE_URL
HLS_QUEUE_PRODUCER_URL
HLS_QUEUE_PRODUCER_TOKEN
PLAYBACK_JWT_SECRET
PLAYBACK_WATERMARK_SALT
RESEND_API_KEY
ELEVENLABS_API_KEY
LOVABLE_API_KEY
```

---

## 8. Core User Flows

### 8.1 Fan Signup & Onboarding

```text
1. Fan lands on / or /invite?token=...
2. Navigates to /vault/enter → enters vault code → /vault/submit
3. Spin wheel determines outcome → /vault/status
4. Win → /vault/congrats → /agreements/fan (mandatory consent)
5. Account creation at /auth/fan (email/password)
6. DB trigger auto-assigns "fan" role + creates profile
7. Choose access: /onboarding/listen
   ├── Pay-As-You-Go → /load-credits → Stripe Checkout → /checkout/return
   └── Superfan ($5/mo) → /subscribe → Stripe Checkout → /checkout/return
8. Redirected to /fan/profile (dashboard)
```

### 8.2 Fan Streaming

```text
1. Fan browses /discovery → selects artist → /artist/:artistId
2. Taps track → StreamConfirmModal (confirm 1 credit spend)
3. Client calls charge-stream edge function with idempotencyKey
4. RPC debit_stream_credit: debit 1 credit, insert stream_ledger + credit_ledger
5. charge-stream mints JWT, creates playback_session + playback_token
6. Returns hlsUrl → CompactVaultPlayer loads via HLS.js
7. playback-guard Worker validates JWT, serves audio segments
8. (Fallback: if HLS fails, signed R2 URL used directly)
```

### 8.3 Artist Application & Onboarding

```text
1. Artist visits /artist/apply → /artist/application-form
2. submit-artist-application edge function stores application
3. notify-new-application emails admin
4. Admin reviews at /admin/artist-applications → approve/deny
5. On approve: approve-artist → handle-application-action
6. Artist receives email with setup link → /artist/setup-account
7. Creates account at /auth/artist
8. finalize-artist-setup: creates artist_profiles row + assigns "artist" role
9. /artist/agreement-accept → accept participation agreement
10. Redirected to /artist/dashboard
```

### 8.4 Artist Track Upload

```text
1. Artist navigates to /artist/upload
2. Selects audio file (≤50MB) + cover art + metadata
3. Client: MP3 compression (192kbps via lamejs) + cover compression
4. create-track-draft: creates DB record with status "draft"
5. initiate-multipart-upload → sign-upload-part → browser-to-R2 direct upload
6. complete-multipart-upload assembles R2 object
7. Client PATCH updates track with R2 keys
8. verify-r2-objects confirms files exist → status set to "ready"
9. Track appears on artist dashboard and in fan discovery
```

### 8.5 Payment Processing

```text
Credit Purchase:
1. Fan selects credit amount (min 25 = $5)
2. create-checkout → Stripe Checkout session (mode: "payment")
3. Stripe redirects to /checkout/return?session_id=...
4. stripe-webhook receives checkout.session.completed
5. apply_credit_purchase RPC: upsert vault_members + insert credit_ledger
6. Fallback: verify-checkout polls Stripe if webhook delayed

Superfan Subscription:
1. Fan selects Superfan ($5/mo)
2. create-subscription-checkout → Stripe Checkout (mode: "subscription")
3. stripe-webhook: checkout.session.completed → initial 25 credits + superfan flags
4. Monthly: invoice.payment_succeeded → 25 renewal credits + new invite

Artist Payouts:
1. Admin triggers at /admin/payouts
2. aggregate-weekly-earnings calculates per-artist totals
3. process-payouts: Stripe Connect transfer ($1 minimum)
4. payout_batches + artist_payouts updated
5. send-payout-notification emails artist
```

### 8.6 Revenue Model

```text
1 credit = $0.20
1 stream = 1 credit
Revenue split: 50/50 ($0.10 artist / $0.10 platform)
Superfan: $5/month → 25 credits + vault access (credits don't roll over)
Pay-As-You-Go: purchase credits in bulk (min 25)
```

---

## 9. External Infrastructure (Not in Codebase)

| Component | Location | Purpose |
|---|---|---|
| `playback-guard` Worker | Cloudflare | JWT-gated HLS segment serving |
| R2 Bucket | Cloudflare | Audio, artwork, preview storage |
| Stripe Dashboard | stripe.com | Payment configuration, webhook endpoints |
| Resend Dashboard | resend.com | Email sending, domain verification |
| ElevenLabs | elevenlabs.io | AI SFX API |

---

## 10. Known Architectural Notes

1. **HLS Gap**: No transcoding pipeline exists. Raw MP3s are uploaded to R2 but `charge-stream` constructs HLS URLs pointing to `hls/{trackId}/master.m3u8`. Playback works via fallback to direct signed R2 URLs.
2. **Dual-role support**: A single email can hold both `fan` and `artist` roles with session-based switching.
3. **All edge functions** have `verify_jwt = false` at the gateway; auth is validated internally.
4. **RLS is comprehensive** with service-role-only writes on financial and security tables.
5. **Idempotency** is enforced on stream charges (via `stream_charges.idempotency_key`) and credit purchases (via `credit_ledger.reference` unique index).

