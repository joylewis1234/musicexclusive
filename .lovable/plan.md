

## Add Required Idempotency Key to charge-stream

### Overview
Enforce a client-generated `idempotencyKey` on every stream charge request. The edge function validates its presence, writes it to `stream_charges.idempotency_key`, and short-circuits on duplicate (Postgres error code 23505) instead of double-charging.

### No Database Changes Needed
The `stream_charges` table already has a partial unique index `stream_charges_idempotency_unique` on `idempotency_key WHERE idempotency_key IS NOT NULL`. Once the field is always populated, duplicates will be caught automatically.

### Edge Function: `supabase/functions/charge-stream/index.ts`

**Body parse (line 48)**: Destructure `idempotencyKey` alongside `trackId`. Add a 400 guard if `idempotencyKey` is missing or not a string.

**Idempotency insert (lines 112-128)**: Add `idempotency_key: idempotencyKey` to the insert payload. On error code `23505`, fetch current credits and return `{ success: true, alreadyCharged: true, newCredits }` (200). All other insert errors remain non-fatal log-and-continue.

### Frontend Hook: `src/hooks/useStreamCharge.ts`

**`chargeStream` call (line 26-28)**: Generate `idempotencyKey` via `crypto.randomUUID()` and include it in the request body.

**Result interface (lines 5-10)**: Add optional `alreadyCharged?: boolean` to `StreamChargeResult`.

**Success handler (lines 59-67)**: If `data.alreadyCharged` is true, skip the "1 credit used" toast (the charge was already processed).

### Files Modified

| File | Change |
|------|--------|
| `supabase/functions/charge-stream/index.ts` | Require `idempotencyKey`, write to insert, short-circuit on 23505 |
| `src/hooks/useStreamCharge.ts` | Generate and send `idempotencyKey`, handle `alreadyCharged` response |

