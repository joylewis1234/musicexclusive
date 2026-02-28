

## Fix: Ambiguous `stream_id` in `debit_stream_credit` RPC

The `charge-stream` edge function is failing with error `42702: column reference "stream_id" is ambiguous`. The RPC's `RETURNS TABLE` declares `stream_id uuid` as an output column, which collides with the `stream_charges.stream_id` column name in the `UPDATE ... WHERE stream_id = v_stream_id` statement.

### Database Migration

Replace the RPC, renaming the output column from `stream_id` to `out_stream_id` to avoid the ambiguity:

```sql
CREATE OR REPLACE FUNCTION public.debit_stream_credit(...)
RETURNS TABLE (
  new_credits integer,
  already_charged boolean,
  stream_ledger_id uuid,
  out_stream_id uuid          -- renamed from stream_id
)
```

All internal logic stays the same. The final `RETURN QUERY` lines change to use the new alias:
- `RETURN QUERY SELECT updated_credits, true, NULL::uuid, NULL::uuid;` (unchanged)
- `RETURN QUERY SELECT updated_credits, false, v_stream_ledger_id, v_stream_id;` (unchanged)

### Edge Function Update

In `charge-stream/index.ts`, update the RPC result field access from `rpcData.stream_id` to `rpcData.out_stream_id` (line 230).

### Validation After Fix

1. Call `charge-stream` with a test idempotency key — expect 200 with `hlsUrl`
2. Verify exactly 1 new `playback_sessions` row and 1 new `playback_tokens` row
3. Verify `stream_ledger` incremented by 1
4. Verify credits decremented by 1

