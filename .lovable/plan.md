

## Plan: Add Superfan Cancellation to Fan Profile

### What changes

**`src/pages/FanProfile.tsx`** — All changes in this one file:

1. **Enhanced superfan detection** (replace lines 181-199): Query `vault_members` for `superfan_active` and `subscription_cancel_at` (new column — see backend steps below). This gives three states:
   - `isSuperfan = true` + no `cancelAt` → active, show cancel button
   - `isSuperfan = true` + `cancelAt` set → cancellation scheduled, show badge + expiry date
   - `isSuperfan = false` → no cancel UI

2. **New state**: `isCancelling` (loading), `showCancelDialog` (modal), `cancelAt` (Date | null)

3. **Cancel handler**: Calls `supabase.functions.invoke("cancel-superfan")`. On success, sets `cancelAt` from response. On error, shows real error toast.

4. **Confirmation dialog** (using existing `AlertDialog` from `@/components/ui/alert-dialog.tsx`):
   - Title: "Cancel Superfan Membership?"
   - Body: Explains access stays until billing period end, then downgrade to Pay As You Go, cannot be undone
   - Buttons: "Keep Membership" / "Yes, Cancel Membership"
   - Loading spinner on confirm button while `isCancelling`

5. **Badge area update** (lines 310-314): When `cancelAt` is set, replace "Superfan" badge with "Cancellation Scheduled" badge + expiry date text + reminder about Pay Per Stream

6. **Cancel button placement**: After the Wallet Balance Card section (~line 434), only visible when `isSuperfan && !cancelAt`

### Files changed

| File | Action |
|------|--------|
| `src/pages/FanProfile.tsx` | Add cancel dialog, enhanced superfan detection, cancellation scheduled UI |

### Backend steps you will need to do manually after frontend is done

**1. Add column to `vault_members`:**
```sql
ALTER TABLE public.vault_members 
ADD COLUMN IF NOT EXISTS subscription_cancel_at timestamptz DEFAULT NULL;
```

**2. Create edge function `supabase/functions/cancel-superfan/index.ts`:**
- Auth: extract user from JWT via `supabase.auth.getUser(token)`
- Look up Stripe customer by email: `stripe.customers.list({ email, limit: 1 })`
- Find active subscription: `stripe.subscriptions.list({ customer: customerId, status: "active", limit: 1 })`
- Cancel at period end: `stripe.subscriptions.update(subId, { cancel_at_period_end: true })`
- Update vault_members: `SET subscription_cancel_at = to_timestamp(current_period_end)`
- Return: `{ success: true, cancel_at: "<ISO date>" }`
- Use `Stripe@18.5.0`, CORS headers, `STRIPE_SECRET_KEY` secret

**3. Add to `supabase/config.toml`:**
```toml
[functions.cancel-superfan]
verify_jwt = false
```

**4. Update `stripe-webhook` edge function** — in the `customer.subscription.updated` handler:
- When `cancel_at_period_end === true`: set `vault_members.subscription_cancel_at`
- Add `customer.subscription.deleted` handler: set `superfan_active = false`, `membership_type = 'pay_as_you_go'`, `subscription_cancel_at = null`

**5. Add `customer.subscription.deleted`** to your Stripe webhook event list in the Stripe Dashboard.

