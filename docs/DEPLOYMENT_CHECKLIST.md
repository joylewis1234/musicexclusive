# Music Exclusive - Staging / Production Deployment Checklist

## 1. Supabase Secrets

All secrets must be set in the target Supabase project. Verify with `supabase secrets list`.

| Secret | Purpose | Where to get it |
|--------|---------|-----------------|
| `R2_ACCESS_KEY_ID` | Cloudflare R2 API token ID | Cloudflare > R2 > Manage API Tokens |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 API secret | Same token page |
| `R2_ACCOUNT_ID` | Cloudflare account ID | Cloudflare sidebar |
| `R2_BUCKET_NAME` | R2 bucket name | Cloudflare > R2 > Overview |
| `STRIPE_SECRET_KEY` | Stripe API key | Stripe Dashboard > Developers > API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Stripe > Webhooks > Signing secret |
| `RESEND_API_KEY` | Resend email API key | Resend Dashboard > API Keys |
| `RESEND_FROM_EMAIL` | Sender email address | Resend > Domains |
| `HLS_QUEUE_PRODUCER_URL` | Cloudflare Worker URL for HLS queue | Cloudflare Workers dashboard |
| `HLS_QUEUE_PRODUCER_TOKEN` | Auth token for HLS queue worker | Set during worker deployment |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (for Edge Functions) | Supabase > Settings > API |

## 2. Stripe Webhook

- [ ] Webhook URL points to deployed `stripe-webhook` Edge Function
  - Format: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
- [ ] Webhook signing secret (`STRIPE_WEBHOOK_SECRET`) matches the endpoint
- [ ] Events subscribed: `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.*`
- [ ] Test with Stripe CLI: `stripe trigger checkout.session.completed`

## 3. Cloudflare R2

- [ ] R2 API token has **Object Read and Write** permissions (not just read)
- [ ] CORS policy allows `https://www.musicexclusive.co` (and staging domain if different)
  - Required methods: `GET`, `PUT`, `POST`, `DELETE`
  - Required headers: `Content-Type`, `x-amz-*`
- [ ] R2 bucket exists and is accessible with the configured credentials
- [ ] Test: upload a track via the artist flow and verify audio + cover art land in R2

## 4. Cloudflare Workers (HLS Pipeline)

- [ ] `playback-guard` worker deployed and accessible
  - Validates JWT on every HLS segment request
  - JWT signing key matches `SUPABASE_JWT_SECRET`
- [ ] `hls-queue-producer` worker deployed
  - URL matches `HLS_QUEUE_PRODUCER_URL` secret in Supabase
  - Auth token matches `HLS_QUEUE_PRODUCER_TOKEN`
- [ ] `hls-queue-consumer` worker deployed and processing queue
- [ ] Test: play a track as a fan, verify HLS segments stream without errors

## 5. Railway (HLS Transcoder)

- [ ] `hls-transcoder` service running at expected URL
- [ ] Environment variables set: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, R2 credentials
- [ ] Transcoder processes new uploads into HLS segments in R2
- [ ] Health check: `GET /health` returns 200

## 6. Frontend Environment Variables (Vercel)

Set in Vercel project settings (or `.env` for local dev):

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ref |

## 7. Vercel Deployment

- [ ] Connected to `joylewis1234/musicexclusive` repo, `main` branch
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] `vercel.json` rewrites configured (SPA fallback to `index.html`)
- [ ] Custom domain: `www.musicexclusive.co` with valid SSL
- [ ] Preview deployments enabled for PRs

## 8. Supabase Edge Functions

- [ ] All functions deployed: `supabase functions deploy --all`
- [ ] Verify critical functions respond:
  - `create-checkout` (Stripe)
  - `charge-stream` (playback credits)
  - `validate-vault-code` (fan entry)
  - `finalize-artist-setup` (artist onboarding)
  - `stripe-webhook` (payment reconciliation)
- [ ] `supabase/config.toml` — verify `verify_jwt = false` functions have auth checks in handler code

## 9. Database (Supabase Postgres)

- [ ] All migrations applied: `supabase db push` or verify in Dashboard > Database > Migrations
- [ ] RLS policies active on all user-facing tables
- [ ] `user_roles` table has correct entries for test accounts
- [ ] Types regenerated after any schema changes: `supabase gen types typescript --linked > src/integrations/supabase/types.ts`

## 10. Smoke Tests

Run after deployment to verify critical flows:

### Fan Flow
- [ ] Fan signup via `/auth/fan` (email verification works)
- [ ] Vault code entry (`/vault/enter`) validates correctly
- [ ] Superfan subscription checkout completes via Stripe
- [ ] Credit purchase via `/fan/add-credits` works
- [ ] Discovery page loads artist tracks
- [ ] Playing a track deducts 1 credit and streams audio
- [ ] Share track modal sends to recipient

### Artist Flow
- [ ] Artist application submitted and approved
- [ ] Account setup from approval email
- [ ] Artist agreement signed
- [ ] Track upload (cover art + audio + preview) succeeds
- [ ] Track management (edit, disable/enable) works
- [ ] Stripe Connect onboarding link generates

### Admin Flow
- [ ] Admin dashboard loads (`/admin`)
- [ ] Daily report generates without errors (`/admin/reports/daily`)
- [ ] Payout aggregation creates batches
- [ ] Artist application approval/denial works

## 11. CI/CD

- [ ] GitHub Actions workflow (`.github/workflows/ci.yml`) runs on PRs to `main`
- [ ] Secrets configured in GitHub repo settings:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_SUPABASE_PROJECT_ID`
