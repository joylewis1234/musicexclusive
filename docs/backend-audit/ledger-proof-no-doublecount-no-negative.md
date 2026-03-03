# Proof: Ledger Cannot Double Count or Go Negative

## Claim A — Ledger entries cannot double count for the same logical event

**Reason:** A unique index enforces one ledger row per `(reference, type, user_email)`.

```sql
CREATE UNIQUE INDEX credit_ledger_ref_type_user_unique
ON public.credit_ledger (reference, type, user_email)
WHERE reference IS NOT NULL;
```

**Implication:** Any retry with the same `reference`, `type`, and `user_email` fails with a unique violation, preventing duplicate ledger rows for the same logical action.

---

## Claim B — Credits cannot go negative

**Reason:** A CHECK constraint blocks any update that would set credits below zero.

```sql
ALTER TABLE public.vault_members
ADD CONSTRAINT credits_non_negative CHECK (credits >= 0);
```

**Implication:** Even under concurrency or retries, Postgres rejects any write that would make credits < 0.

---

## Claim C — Credit purchases are atomic and consistent with the ledger

**Reason:** The credit purchase RPC writes vault credits and ledger entries in a single DB transaction.

```sql
CREATE OR REPLACE FUNCTION public.apply_credit_purchase(...)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.vault_members (...) VALUES (...)
  ON CONFLICT (email) DO UPDATE SET credits = public.vault_members.credits + EXCLUDED.credits, ...;

  INSERT INTO public.credit_ledger (...) VALUES (...);
END;
$$;
```

**Implication:** A purchase either updates credits and creates the ledger entry together, or fails completely.

---

## Supporting Idempotency — Stripe events are processed once

**Reason:** Stripe webhook logic inserts into `stripe_events` first. A unique violation indicates a duplicate event and is skipped.

**Implication:** The same Stripe event cannot apply credits multiple times.

---

## Conclusion

- **No double counting:** enforced by the unique ledger index.
- **No negative credits:** enforced by a DB CHECK constraint.
- **Atomic credit purchase updates:** enforced by transactional RPC.

These constraints provide database-level guarantees independent of application retries or client behavior.
