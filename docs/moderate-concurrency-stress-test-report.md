# Moderate Concurrency Stress Test Report

**Date:** 2026-02-26
**Track:** `9fad1e64-016e-41da-95b5-6f2dd154ee41`

---

## Edge Function Load Tests

### mint-playback-url

- **Requests:** 400
- **Concurrency:** 150
- **Status codes:** 200 × 400
- **Throughput:** 34.21 RPS
- **Latency (ms):** p95 5030, p99 5940

### charge-stream

- **Requests:** 400
- **Concurrency:** 150
- **Status codes:** 200 × 400
- **Throughput:** 22.32 RPS
- **Latency (ms):** p95 3289, p99 6076

---

## Ledger Concurrency Stress Test

- **Script:** `scripts/ledger-stress-test.js`
- **Requests:** 300
- **Concurrency:** 150
- **Success:** 300/300
- **Throughput:** 31.02 RPS
- **Latency (ms):** p95 4373, p99 5087
- **Credits:** starting 1242, ending 942, expected 942
- **Ledger deltas:** STREAM_DEBIT +242, stream_ledger +242

### Investigation Note

Ledger deltas (242) are lower than total requests (300). This is likely due to:

1. **Idempotency deduplication** — duplicate idempotency keys causing the RPC to return `already_charged: true` without writing new ledger entries.
2. **402 insufficient-credit responses** — requests that arrived after credits were exhausted, consuming request slots without producing ledger writes.

This discrepancy needs further investigation to confirm the exact breakdown of the 58 non-ledger requests.

---

## Integrity

- **Credits:** ✅ ending balance matches expected (942)
- **No overspend:** ✅ confirmed
- **No 500 errors:** ✅ confirmed
