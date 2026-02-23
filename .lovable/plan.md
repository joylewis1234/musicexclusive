

# Fix Ledger Concurrency in charge-stream

## Overview
Harden the `charge-stream` edge function to ensure ledger entries are only written when the credit decrement succeeds, and enforce strict idempotency.

## Changes to `supabase/functions/charge-stream/index.ts`

### 1. Idempotency gate (already exists, minor cleanup)
- The idempotencyKey validation and `stream_charges` insert already exist. On duplicate (23505), return early with `{ success: true, alreadyCharged: true }` and skip all ledger writes. Currently it falls through on non-23505 errors -- will make non-duplicate insert errors return 500 instead of continuing.

### 2. Credit decrement with row-return validation
- Add `.select("credits").maybeSingle()` to the credit update call so we can verify a row was actually updated.
- If `updatedMember` is null (no row matched due to concurrent update), return 409 "Concurrent update, retry" **without writing any ledger entries**.
- This prevents the current bug where ledger entries could be written even if the credit decrement silently affected zero rows.

### 3. Ledger writes gated on successful decrement
- Move all `credit_ledger` inserts and `stream_ledger` insert to only execute after confirming `updatedMember` is non-null.
- Use `updatedMember.credits` as the authoritative new balance in the response.

## Technical Details

Key lines changing in `charge-stream/index.ts`:

- **Idempotency duplicate handling** (~line 112): On non-23505 insert error, return 500 instead of continuing.
- **Credit deduct** (~line 125): Add `.select("credits").maybeSingle()`, check for null result (409).
- **Response** (~line 170): Use `updatedMember.credits` instead of `vaultMember.credits - 1`.

No database schema changes needed -- the existing unique index on `stream_charges.idempotency_key` and the `credits_non_negative` CHECK constraint already provide the DB-level guarantees.

