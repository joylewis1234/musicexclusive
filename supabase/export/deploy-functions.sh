#!/bin/bash
# Edge Function Deployment Script
# Prerequisites: supabase CLI installed and linked to your new project
#   supabase link --project-ref <your-new-ref>
#
# Usage: bash supabase/export/deploy-functions.sh

set -e

echo "🚀 Deploying 48 edge functions..."

FUNCTIONS=(
  aggregate-weekly-earnings
  apply-credit-topup
  approve-artist
  approve-bonus-payout
  approve-waitlist-artist
  backfill-vault-user-ids
  charge-stream
  check-bonus-milestones
  check-exclusivity
  cleanup-accounts
  close-annual-cycle
  complete-multipart-upload
  create-checkout
  create-connect-account
  create-subscription-checkout
  create-test-artist
  create-test-fan
  create-track-draft
  delete-test-application
  disqualify-bonus
  disqualify-charts-artist
  elevenlabs-sfx
  ensure-vault-member
  finalize-artist-setup
  generate-fan-invite
  generate-promo-captions
  generate-superfan-invite
  generate-vault-code
  handle-application-action
  initiate-multipart-upload
  lookup-artist-application
  mint-playback-url
  mint-playback-url-public-preview
  monitoring-metrics
  notify-new-application
  playback-telemetry
  process-payouts
  reject-waitlist-artist
  reset-test-password
  send-artist-invite
  send-daily-report
  send-password-reset
  send-payout-notification
  send-superfan-welcome-email
  send-vault-lose-email
  send-vault-resend-email
  send-vault-retry-win-email
  send-vault-win-email
  sign-upload-part
  storage-health-check
  stripe-webhook
  submit-agreement-acceptance
  submit-artist-application
  submit-fan-waitlist
  submit-waitlist-application
  update-charts-standings
  upload-avatar
  upload-fan-avatar
  upload-part-proxy
  upload-track-cover
  upload-track-media
  uploadTrackAssets
  validate-fan-invite
  validate-vault-code
  verify-checkout
  verify-connect-status
  verify-r2-objects
)

TOTAL=${#FUNCTIONS[@]}
COUNT=0

for fn in "${FUNCTIONS[@]}"; do
  COUNT=$((COUNT + 1))
  echo "[$COUNT/$TOTAL] Deploying $fn..."
  supabase functions deploy "$fn" --no-verify-jwt
  echo "  ✅ $fn deployed"
done

echo ""
echo "🎉 All $TOTAL edge functions deployed successfully!"
echo ""
echo "Note: The _shared/ modules (monitoring.ts, verify-admin.ts) are bundled"
echo "automatically with functions that import them — no separate deploy needed."
