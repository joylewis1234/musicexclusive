

## Atomic Credit Purchase RPC + Stripe Webhook Hardening

### Overview
Two changes to make credit fulfillment atomic and the webhook more robust:

1. **New database function `apply_credit_purchase`** -- wraps the vault_members upsert and credit_ledger insert into a single transaction, eliminating the window where credits could be granted but the ledger entry fails (or vice versa).

2. **Rewritten `stripe-webhook` edge function** with these improvements:
   - Mandatory signature verification (no more legacy/unsigned mode)
   - Insert-first idempotency (insert into `stripe_events` before processing, not after)
   - Rollback on failure (delete the `stripe_events` row if `apply_credit_purchase` fails, so Stripe can retry)
   - Uses the new `apply_credit_purchase` RPC instead of separate select/update/insert steps
   - Removes the redundant event insert at the end (already done up front)

### Technical Details

**Migration SQL:**
- Creates `apply_credit_purchase(p_email, p_credits, p_ledger_type, p_reference, p_usd, p_set_superfan, p_set_superfan_since)` as a `SECURITY DEFINER` function
- Uses `INSERT ... ON CONFLICT (email) DO UPDATE` for vault_members upsert
- Inserts into credit_ledger in the same transaction
- Grants EXECUTE only to `service_role`

**Edge function changes:**
- Requires `STRIPE_WEBHOOK_SECRET` (returns 500 if missing, no fallback)
- Requires `stripe-signature` header (returns 403 if missing)
- Inserts `stripe_events` row immediately after signature verification; if duplicate (code 23505), returns 200 with `duplicate: true`
- Calls `supabaseAdmin.rpc("apply_credit_purchase", {...})` for both `checkout.session.completed` and `invoice.payment_succeeded`
- On RPC failure, rolls back the `stripe_events` row so Stripe will retry
- All other handlers (subscription events, account.updated, payment_intent.succeeded) remain unchanged
- Fire-and-forget side effects (welcome email, invite consumption, monthly invite) unchanged

### Sequence of changes
1. Apply the database migration (creates the RPC function)
2. Replace the stripe-webhook edge function code
3. Deploy the updated edge function

