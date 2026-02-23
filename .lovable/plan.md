

## Move vault_members Writes to Edge Functions

### Problem
The client currently tries to INSERT/UPDATE `vault_members` directly, but RLS only allows `service_role` writes. This causes "new row violates row-level security policy" errors for new fans.

### Changes

**1. New Edge Function: `ensure-vault-member`**
- File: `supabase/functions/ensure-vault-member/index.ts`
- Requires Bearer token (validates via `getClaims`)
- Uses `service_role` client to upsert `vault_members` by email
- Sets `user_id`, `display_name`, `vault_access_active = false`, `credits = 0`
- Returns the upserted row
- Add config entry in `supabase/config.toml`

**2. New Edge Function: `apply-credit-topup`**
- File: `supabase/functions/apply-credit-topup/index.ts`
- Requires Bearer token (validates via `getClaims`)
- Accepts `{ credits, usd }` in body
- Uses `service_role` to call existing `apply_credit_purchase` RPC (which atomically upserts `vault_members` and inserts `credit_ledger`)
- Reference format: `topup_{timestamp}` for idempotency
- Returns `{ success, newBalance }`
- Add config entry in `supabase/config.toml`

**3. Update `src/hooks/useCredits.ts`**
- `fetchCredits`: Remove the client-side INSERT block (lines 30-44). Replace with a call to `supabase.functions.invoke("ensure-vault-member")` when no row exists.
- `addCredits`: Remove entirely (all client-side INSERT/UPDATE of `vault_members`). Replace with a call to `supabase.functions.invoke("apply-credit-topup", { body: { credits, usd } })`.
- Return signature stays the same.

**4. Update `src/pages/AddCredits.tsx`**
- Remove the direct `credit_ledger` INSERT (lines 52-58) since the edge function handles it atomically.
- `handlePurchase` just calls `addCredits(option.credits)` which now invokes the edge function.
- Remove the "MVP Testing Mode" banner since credits now go through the proper server-side path.

### Technical Details

```text
Before (broken):
  Client --INSERT--> vault_members  --> RLS DENY (service_role only)

After:
  Client --Bearer--> ensure-vault-member (edge fn)
                        |
                        v
                     service_role --UPSERT--> vault_members --> OK

  Client --Bearer--> apply-credit-topup (edge fn)
                        |
                        v
                     service_role --RPC--> apply_credit_purchase
                        |
                        v
                     vault_members + credit_ledger (atomic)
```

No database schema changes needed. No RLS policy changes. The existing `apply_credit_purchase` RPC already handles the atomic credit grant correctly.
