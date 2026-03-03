# Locking & Consistency Strategy (Financial + Ledger)

## Scope

This document describes how Music Exclusive prevents double charges, inconsistent credit balances, and duplicate payouts across:

- Stripe credit purchases

- Stream charges (per-play)

- Ledger entries and payout batching

## Core Invariants

- Credits must never go negative.

- A Stripe event must be processed once.

- A ledger entry must not be duplicated for the same logical reference.

- A payout batch must be unique per artist/week.

## Current Consistency Mechanisms

### 1) Stripe event idempotency (edge + DB)

Stripe webhooks insert the event into `stripe_events` first. If the insert fails with a unique violation, the event is treated as already processed and skipped. This provides a "claim-first" idempotency gate before any credit changes are applied.

### 2) Atomic credit purchase application (DB RPC)

The `apply_credit_purchase` RPC performs:

- upsert into `vault_members`

- ledger insert into `credit_ledger`

in a single database transaction, so credits and ledger entries are atomically consistent.

### 3) Ledger dedupe via unique index

`credit_ledger` enforces a uniqueness constraint on `(reference, type, user_email)` so retries won't double-count for the same logical action.

### 4) Non-negative credits enforced in DB

Credits are guarded by a CHECK constraint to prevent any write that would take the balance below zero.

### 5) Stream charges use optimistic concurrency with row-return validation

The per-stream charge flow updates credits with a compare-and-set style condition (`credits = previous`) and uses `.select("credits").maybeSingle()` to confirm a row was actually updated. If no row matched (concurrent update), the function returns 409 without writing any ledger entries. The CHECK constraint blocks negatives. All ledger writes are gated on confirmed credit decrement.

### 6) Payout batching uniqueness

`payout_batches` enforces uniqueness per artist/week, and `artist_payouts` enforces one row per batch/artist. This prevents duplicate payout records when batch jobs are retried.

## Consistency Guarantees (Current)

- Stripe credits are atomic and idempotent.

- Ledger entries can't duplicate per reference/type/user.

- Credits cannot go negative.

- Payout batches are unique per artist/week.

- Stream charge ledger writes only occur after confirmed credit decrement (no orphaned ledger entries).

## Known Gaps / Hardening Targets

1) **Stream charge transactionality** — ADDRESSED (2026-02-24)

   - Fully transactional via `debit_stream_credit` RPC: credit decrement, ledger writes, and stream recording in a single Postgres transaction.

   - Reference uses deterministic format `stream_<trackId>_<idempotencyKey>` for ledger deduplication.

   - Ledger inserts use `ON CONFLICT (reference, type, user_email) DO NOTHING`; if duplicate detected, credit deduction is rolled back and `alreadyCharged` is returned.

   - Server-side retry loop (3 attempts) handles serialization (40001) and deadlock (40P01) errors.

2) **Stream charge idempotency scope** — ADDRESSED

   - `stream_charges` enforces a unique `idempotency_key`. Duplicate keys return early with `{ success: true, alreadyCharged: true }`.

3) **Payout aggregation race safety**

   - Aggregation reads "unbatched" streams and then writes batches separately.

   - Target: wrap aggregation + update in a DB transaction or use advisory locks per week.

## Summary

The system relies on database-enforced constraints, idempotency tables, and atomic RPCs to prevent duplicates and ensure credit consistency. Stream charge ledger writes are now gated on confirmed credit decrement. The remaining hardening work is to make stream charges fully transactional via a single DB RPC and to wrap payout batching in a transaction.
