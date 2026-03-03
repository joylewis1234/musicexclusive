# Vault Members Write Migration

## Date
2026-02-23

## Summary
Moved all `vault_members` write operations from client-side to server-side Edge Functions using `service_role`, making the client strictly read-only against this table.

## Problem
Client-side INSERTs/UPDATEs to `vault_members` were blocked by RLS policies that only permit `service_role` writes. This caused "new row violates row-level security policy" errors when new fans signed up or purchased credits.

## Solution

### New Edge Functions

#### `ensure-vault-member`
- **Path:** `supabase/functions/ensure-vault-member/index.ts`
- **Auth:** Bearer token validated via `getClaims`
- **Action:** Upserts `vault_members` by email using `service_role` client
- **Sets:** `user_id`, `display_name` (from email prefix), `vault_access_active = false`, `credits = 0`
- **Conflict handling:** On duplicate, fetches existing row and backfills `user_id` if missing
- **Returns:** The upserted or existing row

#### `apply-credit-topup`
- **Path:** `supabase/functions/apply-credit-topup/index.ts`
- **Auth:** Bearer token validated via `getClaims`
- **Accepts:** `{ credits: number, usd: number }`
- **Action:** Calls `apply_credit_purchase` RPC via `service_role`, which atomically:
  - Upserts `vault_members` balance
  - Inserts `credit_ledger` entry
- **Reference format:** `topup_{timestamp}` for idempotency
- **Returns:** `{ success: true, newBalance: number }`

### Client Changes

#### `src/hooks/useCredits.ts`
- `fetchCredits`: If no `vault_members` row exists, invokes `ensure-vault-member` instead of client-side INSERT
- `addCredits(amount, usd)`: Invokes `apply-credit-topup` edge function; no direct table writes

#### `src/pages/AddCredits.tsx`
- Removed direct `credit_ledger` INSERT
- `handlePurchase` delegates entirely to `addCredits` hook
- Removed "MVP Testing Mode" banner

## Data Flow

```
Before (broken):
  Client --INSERT--> vault_members --> RLS DENY

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

## Impact
- No database schema changes required
- No RLS policy changes required
- Client has zero write access to `vault_members` or `credit_ledger`
- All mutations are authenticated and auditable server-side
