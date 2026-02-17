

## Three Database Hardening Changes

### What we're doing
Adding three layers of protection against data integrity issues: preventing negative credit balances, preventing duplicate ledger entries, and adding an idempotency tracking table for stream charges.

### Pre-requisite: Clean up existing duplicate
There is one existing duplicate in `credit_ledger` that will block the unique index creation:
- **Payment intent** `pi_3T0ToPKICFkRzPC40a3YujJL` has two identical `CREDITS_PURCHASE` rows for `joylewismusic+fan1@gmail.com` (25 credits each, 265ms apart -- a webhook/verify-checkout race condition).
- We will delete the newer duplicate (`d75dfc48-...`) before creating the index.
- No credit adjustment is needed on `vault_members` since the fan was already double-credited; this is a data cleanup you should verify manually.

### Migration SQL (single migration)

**1. Delete the duplicate ledger entry**

**2. Add `credits >= 0` CHECK constraint on `vault_members`**
- Current minimum is 0, so no existing rows violate this.

**3. Create unique index on `credit_ledger(reference, type, user_email)`**
- Prevents the exact race condition found above from ever happening again.
- Filtered to `WHERE reference IS NOT NULL` (though `reference` is now NOT NULL, this is defensive).

**4. Create `stream_charges` idempotency table**
- Columns: `stream_id` (PK), `fan_email`, `track_id`, `stream_ledger_id`, `created_at`
- RLS enabled with policies: service role can insert/select, admins can select.

### Technical Details

**Migration SQL:**
```sql
-- 0) Remove duplicate ledger entry
DELETE FROM public.credit_ledger
WHERE id = 'd75dfc48-b1eb-408f-97bd-f43217f9c08a';

-- 1) Prevent negative credits
ALTER TABLE public.vault_members
ADD CONSTRAINT credits_non_negative CHECK (credits >= 0);

-- 2) Ledger dedupe index
CREATE UNIQUE INDEX credit_ledger_ref_type_user_unique
ON public.credit_ledger (reference, type, user_email)
WHERE reference IS NOT NULL;

-- 3) Idempotency tracking table
CREATE TABLE public.stream_charges (
  stream_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_email text NOT NULL,
  track_id uuid NOT NULL,
  stream_ledger_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stream_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage stream charges"
  ON public.stream_charges FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Admins can view stream charges"
  ON public.stream_charges FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
```

**Edge function update (`charge-stream`):**
- After creating the `stream_charges` table, update the edge function to insert into `stream_charges` before deducting credits, using `ON CONFLICT` to catch duplicate attempts.

### Impact
- No downtime. All changes are additive.
- The duplicate fan (`joylewismusic+fan1@gmail.com`) received 25 extra credits ($5.00) from the race condition. You may want to manually adjust their `vault_members.credits` down by 25.
