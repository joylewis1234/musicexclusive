# Load Testing Summary

## Scope

This summary covers edge function load tests, playback load tests, and ledger concurrency stress tests.

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

## Ledger Concurrency Stress Test (High Concurrency Run)

- Tool: scripts/ledger-stress-test.js
- Date: 2026-02-24
- Concurrency: 25
- Requests: 200
- Status codes: 200 x 37, 409 x 163
- Throughput: ~8.93 RPS
- Latency (ms): p50 1566, p95 3056, p99 8328, max 10671
- Credits: starting 1999, ending 1962, expected ending 1962
- Ledger delta: STREAM_DEBIT +37, stream_ledger +37

## Ledger Findings (High Concurrency Run)

- Credits and ledger deltas match successful deductions (no overspend observed).
- High 409 rate indicates contention on concurrent update; retry/backoff is needed for higher success rates.
- No 500s observed in this run.

## mint-playback-url Load Test (High Concurrency Run)

- Tool: scripts/load-test-edge.js
- Date: 2026-02-24
- Concurrency: 25
- Requests: 200
- Status codes: 200 x 200
- Throughput: ~10.68 RPS
- Latency (ms): p50 1005, p95 3301, p99 4876, max 8025

## Playback Load Test (2026-02-23)

- Tool: `scripts/load-test-playback.js`
- Date: 2026-02-23
- Total requests: 20
- Concurrency: 5
- Status codes: 200 x 20
- Throughput: ~0.10 RPS (duration ~193.6s)
- Latency (ms): p50 45,616, p95 61,095, p99 66,191, max 66,191

## Limitations

- Results are from light load and should be repeated at higher concurrency in a staging environment.

---

## Higher-Concurrency Load Tests (2026-02-24)

### validate-fan-invite (200 req, concurrency 20)

- Total requests: 200
- Status codes: _TBD_
- Throughput: _TBD_ RPS
- Latency (ms): p50 _TBD_, p95 _TBD_, p99 _TBD_, max _TBD_

### validate-vault-code (200 req, concurrency 20)

- Total requests: 200
- Status codes: _TBD_
- Throughput: _TBD_ RPS
- Latency (ms): p50 _TBD_, p95 _TBD_, p99 _TBD_, max _TBD_

### mint-playback-url (200 req, concurrency 25)

- Total requests: 200
- Status codes: 200 x 200
- Throughput: ~10.68 RPS
- Latency (ms): p50 1005, p95 3301, p99 4876, max 8025

### charge-stream (80 req, concurrency 20)

- Total requests: 80
- Status codes: _TBD_
- Throughput: _TBD_ RPS
- Latency (ms): p50 _TBD_, p95 _TBD_, p99 _TBD_, max _TBD_
- Ledger deltas: _TBD_

### Playback Load Test (200 req, concurrency 20)

- Total requests: 200
- Status codes: _TBD_
- Throughput: _TBD_ RPS
- Latency (ms): p50 _TBD_, p95 _TBD_, p99 _TBD_, max _TBD_

### Ledger Stress Test (200 req, concurrency 25)

- Total requests: 200
- Status codes: 200 x 37, 409 x 163
- Credits before/after: 1999 / 1962
- Ledger delta: STREAM_DEBIT +37, stream_ledger +37
- Integrity: **OK** -- credits match ledger deltas exactly; no overspend, no 500s observed

## Moderate Concurrency Run (2026-02-26)

### mint-playback-url (400 req, concurrency 150)

- Total requests: 400
- Status codes: 200 x 400
- Throughput: ~34.21 RPS
- Latency (ms): p95 5030, p99 5940

### charge-stream (400 req, concurrency 150)

- Total requests: 400
- Status codes: 200 x 400
- Throughput: ~22.32 RPS
- Latency (ms): p95 3289, p99 6076

### Ledger Stress Test (300 req, concurrency 150)

- Total requests: 300
- Success: 300/300
- Throughput: ~31.02 RPS
- Latency (ms): p95 4373, p99 5087
- Credits before/after: 1242 / 942 (expected 942)
- Ledger test completed: 300/300 success; credits matched expected; ledger writes confirmed (701 rows in last 60 min for test track/user).
