# Concurrency-Safe Ledger Strategy

## Goal
Prevent double counting, maintain consistent balances, and keep ledger entries aligned with credits under concurrent or retried requests.

## Strategy Summary
The platform relies on database-enforced guarantees plus idempotent event handling to ensure consistency:

1) **Idempotency gate at the edge (Stripe)**
   - Stripe webhooks insert into `stripe_events` first.
   - Duplicate events are rejected at insert time and skipped.

2) **Atomic credit application (DB RPC)**
   - `apply_credit_purchase` performs credit updates and ledger insert in a single transaction.
   - This ensures credits and ledger entries are always consistent for purchases.

3) **Ledger dedupe at the DB level**
   - `credit_ledger` uses a unique index on `(reference, type, user_email)`.
   - Retries cannot create duplicate ledger rows for the same logical event.

4) **Non-negative credits enforced by constraint**
   - `vault_members` has a CHECK constraint preventing negative balances.
   - Even under concurrency, invalid writes are rejected.

5) **Optimistic concurrency for stream charges**
   - Stream charge flow updates credits with a compare-and-set condition (`credits = previous`).
   - This prevents concurrent double-deducts from succeeding.

6) **Payout batching uniqueness**
   - `payout_batches` enforces uniqueness per artist/week.
   - `artist_payouts` enforces one row per batch/artist.

## Result
These mechanisms collectively provide a concurrency-safe ledger strategy:
- **No double counting:** unique ledger index blocks duplicates.
- **No negative balances:** CHECK constraint prevents invalid credit state.
- **Atomic purchase updates:** RPC transaction keeps credits and ledger in sync.
- **Retry safety:** idempotency at Stripe event ingestion avoids reprocessing.

## Known Hardening Target
Stream charges currently span multiple DB calls. For full transactional safety,
move the stream charge flow into a single Postgres RPC (single transaction).
