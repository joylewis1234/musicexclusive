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

### 5) Stream charges use optimistic concurrency

The per-stream charge flow updates credits with a compare-and-set style condition (`credits = previous`) to avoid double-deducting when concurrent calls occur. The CHECK constraint blocks negatives.

### 6) Payout batching uniqueness

`payout_batches` enforces uniqueness per artist/week, and `artist_payouts` enforces one row per batch/artist. This prevents duplicate payout records when batch jobs are retried.

## Consistency Guarantees (Current)

- Stripe credits are atomic and idempotent.

- Ledger entries can't duplicate per reference/type/user.

- Credits cannot go negative.

- Payout batches are unique per artist/week.

## Known Gaps / Hardening Targets

1) **Stream charge transactionality**

   - The stream charge flow performs multiple DB calls without a single DB transaction.

   - Target: move the entire stream charge into a Postgres RPC (single transaction).

2) **Stream charge idempotency scope**

   - `stream_charges` exists, but no unique idempotency key tied to client retries.

   - Target: enforce a unique `idempotency_key` per user+track+session or similar.

3) **Payout aggregation race safety**

   - Aggregation reads "unbatched" streams and then writes batches separately.

   - Target: wrap aggregation + update in a DB transaction or use advisory locks per week.

## Summary

The system relies on database-enforced constraints, idempotency tables, and atomic RPCs to prevent duplicates and ensure credit consistency. The remaining hardening work is to make stream charges and payout batching fully transactional and idempotent at the DB level.
