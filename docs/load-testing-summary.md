# Load Testing Summary

## Scope

This summary covers edge function load tests executed against safe, public endpoints. Playback load testing and ledger stress tests are not included here.

## Test Configuration

- Tool: node script `scripts/load-test-edge.js`
- Date: 2026-02-23
- Concurrency: 6
- Requests per endpoint: 120

## Endpoints Tested

- validate-fan-invite (invalid token)
- validate-vault-code (lookup, non-existent email/code)

## Results

### validate-fan-invite (invalid token)

- Total requests: 120
- Status codes: 200 x 120
- Throughput: ~16.41 RPS
- Latency (ms): p50 302, p95 654, p99 889, max 1284

### validate-vault-code (lookup, non-existent)

- Total requests: 120
- Status codes: 404 x 120 (expected for invalid lookup)
- Throughput: ~11.01 RPS
- Latency (ms): p50 431, p95 705, p99 1102, max 2508

## Observations

- validate-fan-invite returned consistent 200 responses under light load.
- validate-vault-code returned expected 404 responses for invalid lookups; latency was higher but stable.

## Ledger Concurrency Hardening (2026-02-23)

The `charge-stream` edge function was hardened to eliminate ledger concurrency bugs:

1. **Idempotency gate**: Non-duplicate `stream_charges` insert errors now return 500 (previously fell through silently).
2. **Credit decrement validation**: `.select("credits").maybeSingle()` confirms a row was actually updated. If no row matched (concurrent update race), the function returns 409 without writing any ledger entries.
3. **Gated ledger writes**: All `credit_ledger` and `stream_ledger` inserts execute only after confirmed credit decrement.
4. **Authoritative balance**: Response uses the DB-returned `updatedMember.credits` instead of client-side arithmetic.

These changes close the gap where ledger entries could be written even if the credit decrement affected zero rows due to a concurrent update.

## Ledger Concurrency Stress Test — Final Run (2026-02-23)

- Tool: `scripts/ledger-stress-test.js`
- Total requests: 40
- Concurrency: 5
- Status codes: 200 x 10, 402 x 13, 409 x 17
- Credits: starting 10, ending 0 (expected 0)
- Ledger delta: STREAM_DEBIT +10, stream_ledger +10
- Integrity: **OK** — credits consumed matches ledger deltas exactly; no negatives, no orphaned entries.
- 402 (insufficient credits) and 409 (concurrent update, retry) are expected under contention and confirm the hardened logic is working correctly.

## Limitations

- Playback system load testing not executed (requires authenticated minting and signed URL playback).
- Results are from light load and should be repeated at higher concurrency in a staging environment.
