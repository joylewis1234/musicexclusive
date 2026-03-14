

## Edge Function Migration Guide

Your project has **48 edge functions** (plus 2 shared modules). To deploy them on your own Supabase instance, you need to use the Supabase CLI. Here's the complete migration plan.

### What you're migrating

**Shared modules** (imported by other functions):
- `_shared/monitoring.ts` — structured event logging
- `_shared/verify-admin.ts` — admin auth helper

**48 Edge Functions** — all configured with `verify_jwt = false` (auth is handled in-code):

| Category | Functions |
|----------|-----------|
| **Payments/Stripe** | `create-checkout`, `create-subscription-checkout`, `stripe-webhook`, `verify-checkout`, `create-connect-account`, `verify-connect-status`, `apply-credit-topup` |
| **Streaming** | `charge-stream`, `mint-playback-url`, `mint-playback-url-public-preview`, `playback-telemetry` |
| **Upload/Storage** | `initiate-multipart-upload`, `sign-upload-part`, `upload-part-proxy`, `complete-multipart-upload`, `upload-avatar`, `upload-fan-avatar`, `upload-track-cover`, `upload-track-media`, `uploadTrackAssets`, `verify-r2-objects`, `storage-health-check`, `create-track-draft` |
| **Artist Onboarding** | `submit-artist-application`, `approve-artist`, `finalize-artist-setup`, `lookup-artist-application`, `handle-application-action`, `notify-new-application`, `submit-agreement-acceptance`, `send-artist-invite` |
| **Waitlist** | `submit-waitlist-application`, `approve-waitlist-artist`, `reject-waitlist-artist`, `submit-fan-waitlist` |
| **Vault/Fan** | `generate-vault-code`, `validate-vault-code`, `ensure-vault-member`, `backfill-vault-user-ids`, `generate-fan-invite`, `validate-fan-invite`, `generate-superfan-invite` |
| **Email** | `send-vault-win-email`, `send-vault-lose-email`, `send-vault-retry-win-email`, `send-vault-resend-email`, `send-superfan-welcome-email`, `send-password-reset`, `send-payout-notification`, `send-daily-report` |
| **Admin** | `monitoring-metrics`, `process-payouts`, `aggregate-weekly-earnings`, `check-bonus-milestones`, `check-exclusivity`, `close-annual-cycle`, `update-charts-standings`, `disqualify-bonus`, `disqualify-charts-artist`, `approve-bonus-payout`, `create-test-artist`, `create-test-fan`, `delete-test-application`, `reset-test-password`, `cleanup-accounts` |
| **AI** | `generate-promo-captions`, `elevenlabs-sfx` |

### Migration steps

#### 1. Generate a deployment script

I'll create `supabase/export/deploy-functions.sh` — a shell script that:
- Copies `supabase/config.toml` with your new project ID
- Runs `supabase functions deploy <name>` for each function
- Can be executed with `bash deploy-functions.sh` after linking your CLI to the new project

#### 2. Generate a secrets setup script

I'll create `supabase/export/setup-secrets.sh` that lists every `supabase secrets set` command you need to run, with placeholder values for the 19 required secrets:

| Secret | Source |
|--------|--------|
| `SUPABASE_URL` | Your new project URL |
| `SUPABASE_ANON_KEY` | Your new anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your new service role key |
| `SUPABASE_DB_URL` | Your new DB connection string |
| `STRIPE_SECRET_KEY` | Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook config |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 |
| `R2_ACCOUNT_ID` | Cloudflare R2 |
| `R2_BUCKET_NAME` | Cloudflare R2 |
| `R2_PUBLIC_BASE_URL` | Cloudflare R2 |
| `RESEND_API_KEY` | Resend Dashboard |
| `PLAYBACK_JWT_SECRET` | Generate new or reuse |
| `PLAYBACK_WATERMARK_SALT` | Generate new or reuse |
| `HLS_QUEUE_PRODUCER_TOKEN` | Your Cloudflare Worker |
| `HLS_QUEUE_PRODUCER_URL` | Your Cloudflare Worker |
| `HLS_WORKER_BASE_URL` | Your Cloudflare Worker |
| `ELEVENLABS_API_KEY` | ElevenLabs Dashboard |
| `LOVABLE_API_KEY` | Lovable AI Gateway |

#### 3. Generate a config.toml template

I'll create `supabase/export/config.toml` with a placeholder `project_id` and all 48 function JWT configs.

### Deliverables

Three files in `supabase/export/`:
1. **`deploy-functions.sh`** — deploys all 48 functions via Supabase CLI
2. **`setup-secrets.sh`** — sets all 19 secrets with placeholder values
3. **`config.toml`** — ready-to-use config with your new project ID placeholder

### Prerequisites
- Supabase CLI installed and linked to your new project (`supabase link --project-ref <your-new-ref>`)
- All secrets values ready from their respective dashboards
- Schema and data migration already complete

