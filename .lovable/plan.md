

# Harden charge-stream Edge Function for Serialization/Deadlock Retries

## Summary

The `debit_stream_credit` RPC and idempotency unique index are already deployed. The remaining work is updating the `charge-stream` edge function to retry on PostgreSQL serialization (40001) and deadlock (40P01) errors from the RPC, and to properly return `alreadyCharged` when the idempotency key is reused.

## What Changes

### 1. `supabase/functions/charge-stream/index.ts`

Update the RPC error handling block (lines 161-175) to:

- **Retry on serialization/deadlock**: If the RPC returns error code `40001` (serialization failure) or `40P01` (deadlock detected), retry the RPC call up to 3 times with short delays (50ms, 100ms, 200ms) instead of immediately returning 500.
- **Return 409 only after retries exhausted**: If all retries fail due to contention, return the existing 409 response.
- **Preserve existing alreadyCharged path**: The idempotency duplicate check (line 132, error code `23505`) already returns `{ success: true, alreadyCharged: true }` -- no change needed there.
- **Use RPC result for newCredits**: Already done (line 178) -- no change needed.

### Technical Detail

The retry loop wraps only the `adminClient.rpc("debit_stream_credit", ...)` call (not the full request). The idempotency insert happens once before the loop. Structure:

```text
1. Auth check (unchanged)
2. Track lookup (unchanged)
3. Vault pre-check (unchanged)
4. Idempotency insert (unchanged -- returns alreadyCharged on 23505)
5. RPC call with retry loop (NEW):
   for attempt = 0..2:
     call debit_stream_credit
     if success -> return 200
     if rpcResult.success == false -> return 409
     if error code in (40001, 40P01) -> sleep & retry
     else -> return 500
   return 409 (retries exhausted)
```

No migration needed -- the RPC and unique index are already deployed.

