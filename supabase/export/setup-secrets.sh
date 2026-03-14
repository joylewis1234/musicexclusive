#!/bin/bash
# Edge Function Secrets Setup Script
# Replace each <PLACEHOLDER> with your actual value before running.
#
# Prerequisites: supabase CLI installed and linked to your new project
#   supabase link --project-ref <your-new-ref>
#
# Usage: bash supabase/export/setup-secrets.sh

set -e

echo "🔐 Setting edge function secrets..."

# ── Auth & Database ──────────────────────────────────────────────
supabase secrets set SUPABASE_URL="<YOUR_SUPABASE_URL>"
supabase secrets set SUPABASE_ANON_KEY="<YOUR_SUPABASE_ANON_KEY>"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<YOUR_SUPABASE_SERVICE_ROLE_KEY>"
supabase secrets set SUPABASE_DB_URL="<YOUR_SUPABASE_DB_URL>"

# ── Stripe Payments ─────────────────────────────────────────────
supabase secrets set STRIPE_SECRET_KEY="<YOUR_STRIPE_SECRET_KEY>"
supabase secrets set STRIPE_WEBHOOK_SECRET="<YOUR_STRIPE_WEBHOOK_SECRET>"

# ── Cloudflare R2 Storage ───────────────────────────────────────
supabase secrets set R2_ACCESS_KEY_ID="<YOUR_R2_ACCESS_KEY_ID>"
supabase secrets set R2_SECRET_ACCESS_KEY="<YOUR_R2_SECRET_ACCESS_KEY>"
supabase secrets set R2_ACCOUNT_ID="<YOUR_R2_ACCOUNT_ID>"
supabase secrets set R2_BUCKET_NAME="<YOUR_R2_BUCKET_NAME>"
supabase secrets set R2_PUBLIC_BASE_URL="<YOUR_R2_PUBLIC_BASE_URL>"

# ── Resend Email ─────────────────────────────────────────────────
supabase secrets set RESEND_API_KEY="<YOUR_RESEND_API_KEY>"

# ── Playback Security ───────────────────────────────────────────
supabase secrets set PLAYBACK_JWT_SECRET="<YOUR_PLAYBACK_JWT_SECRET>"
supabase secrets set PLAYBACK_WATERMARK_SALT="<YOUR_PLAYBACK_WATERMARK_SALT>"

# ── Cloudflare HLS Workers ──────────────────────────────────────
supabase secrets set HLS_QUEUE_PRODUCER_TOKEN="<YOUR_HLS_QUEUE_PRODUCER_TOKEN>"
supabase secrets set HLS_QUEUE_PRODUCER_URL="<YOUR_HLS_QUEUE_PRODUCER_URL>"
supabase secrets set HLS_WORKER_BASE_URL="<YOUR_HLS_WORKER_BASE_URL>"

# ── AI / External APIs ──────────────────────────────────────────
supabase secrets set ELEVENLABS_API_KEY="<YOUR_ELEVENLABS_API_KEY>"
supabase secrets set LOVABLE_API_KEY="<YOUR_LOVABLE_API_KEY>"

echo ""
echo "✅ All 19 secrets configured!"
echo ""
echo "Verify with: supabase secrets list"
