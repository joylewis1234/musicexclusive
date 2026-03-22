# Edge Function Secrets Setup Guide

## Overview

This guide will help you set up all the required secrets for your edge functions in your new Supabase project.

## Prerequisites

1. ✅ Supabase CLI installed
2. ✅ Linked to your new project:
   ```bash
   supabase link --project-ref esgpsapstljgsqpmezzf
   ```

## Quick Setup

1. **Edit `supabase/export/setup-secrets.sh`** and replace all `<PLACEHOLDER>` values with your actual secrets
2. **Run the script:**
   ```bash
   bash supabase/export/setup-secrets.sh
   ```
3. **Verify:**
   ```bash
   supabase secrets list
   ```

## Where to Get Each Secret

### New Values (From Your New Supabase Project)

#### SUPABASE_URL
- **Value:** `https://esgpsapstljgsqpmezzf.supabase.co`
- **Location:** Already set in the script

#### SUPABASE_ANON_KEY
- **Location:** Supabase Dashboard → Settings → API → anon/public key
- **Copy the entire key** (starts with `eyJ...`)

#### SUPABASE_SERVICE_ROLE_KEY
- **Location:** Supabase Dashboard → Settings → API → service_role key
- **⚠️ Keep this secret!** Never expose it in client-side code
- **Copy the entire key** (starts with `eyJ...`)

#### SUPABASE_DB_URL
- **Format:** `postgresql://postgres:[PASSWORD]@db.esgpsapstljgsqpmezzf.supabase.co:5432/postgres`
- **Password:** The database password you set when creating the project
- **If you forgot:** Reset it in Supabase Dashboard → Settings → Database

### Existing Values (From Your Current Services)

#### Stripe Secrets
- **STRIPE_SECRET_KEY:** Stripe Dashboard → Developers → API keys → Secret key
- **STRIPE_WEBHOOK_SECRET:** Stripe Dashboard → Developers → Webhooks → Your webhook → Signing secret

#### Cloudflare R2
- **R2_ACCESS_KEY_ID:** Cloudflare Dashboard → R2 → Manage R2 API Tokens
- **R2_SECRET_ACCESS_KEY:** Same location (shown only once when created)
- **R2_ACCOUNT_ID:** Cloudflare Dashboard → Right sidebar → Account ID
- **R2_BUCKET_NAME:** Your R2 bucket name
- **R2_PUBLIC_BASE_URL:** Your R2 public URL (e.g., `https://pub-xxxxx.r2.dev`)

#### Resend
- **RESEND_API_KEY:** Resend Dashboard → API Keys → Create API Key

#### Playback Security
- **PLAYBACK_JWT_SECRET:** Generate a secure random string (32+ characters)
  ```bash
  # Generate on Linux/Mac:
  openssl rand -hex 32
  
  # Or use an online generator
  ```
- **PLAYBACK_WATERMARK_SALT:** Another secure random string

#### Cloudflare HLS Workers
- **HLS_QUEUE_PRODUCER_TOKEN:** Your Cloudflare Workers token
- **HLS_QUEUE_PRODUCER_URL:** Your queue producer URL
- **HLS_WORKER_BASE_URL:** Your HLS worker base URL

#### ElevenLabs
- **ELEVENLABS_API_KEY:** ElevenLabs Dashboard → Profile → API Keys

#### Lovable (Optional)
- **LOVABLE_API_KEY:** Only needed if you're still using Lovable services
- Can be commented out if not needed

## Manual Setup (Alternative)

If you prefer to set secrets one by one or use PowerShell:

```powershell
# Supabase
supabase secrets set SUPABASE_URL="https://esgpsapstljgsqpmezzf.supabase.co"
supabase secrets set SUPABASE_ANON_KEY="your-anon-key-here"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
supabase secrets set SUPABASE_DB_URL="postgresql://postgres:password@db.esgpsapstljgsqpmezzf.supabase.co:5432/postgres"

# Stripe
supabase secrets set STRIPE_SECRET_KEY="sk_..."
supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."

# R2
supabase secrets set R2_ACCESS_KEY_ID="..."
supabase secrets set R2_SECRET_ACCESS_KEY="..."
# ... etc
```

## Verification

After setting all secrets, verify they're configured:

```bash
supabase secrets list
```

You should see all 19 secrets listed.

## Troubleshooting

### "Project not linked"
```bash
supabase link --project-ref esgpsapstljgsqpmezzf
```

### "Permission denied" when running script
On Windows, use Git Bash or WSL:
```bash
bash supabase/export/setup-secrets.sh
```

Or set secrets manually using PowerShell.

### "Secret already exists"
That's fine - it will update the existing secret.

## Next Steps

After setting all secrets:

1. ✅ Deploy edge functions:
   ```bash
   supabase functions deploy
   ```

2. ✅ Test critical functions:
   - `stripe-webhook`
   - `charge-stream`
   - `mint-playback-url`

3. ✅ Update webhook URLs in external services:
   - Stripe webhooks → point to your new Supabase function URL
   - Any other webhooks

## Security Notes

- ⚠️ Never commit secrets to git
- ⚠️ Never expose service_role keys in client code
- ⚠️ Rotate secrets periodically
- ⚠️ Use environment-specific secrets for dev/staging/prod
