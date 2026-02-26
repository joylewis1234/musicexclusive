

## Plan

### 1. Create `docs/moderate-concurrency-stress-test-report.md`

New file with full results from the 150-concurrency run:

- **Edge tests**: mint-playback-url (400 req, 150 concurrency, 200×400, p95 5030ms, p99 5940ms, 34.21 RPS) and charge-stream (400 req, 150 concurrency, 200×400, p95 3289ms, p99 6076ms, 22.32 RPS)
- **Ledger test**: 300 req, 150 concurrency, 300/300 success, 31.02 RPS, p95 4373ms, p99 5087ms, credits 1242→942 (expected 942), STREAM_DEBIT +242, stream_ledger +242
- **Investigation note**: Ledger deltas (242) lower than total requests (300); likely due to idempotency deduplication or 402 insufficient-credit responses consuming requests without writing ledger entries — needs further investigation

### 2. Append to `docs/load-testing-summary.md`

Add a new `## Moderate Concurrency Run (2026-02-26)` section at the end with:

- mint-playback-url: 400 req, concurrency 150, 200×400, p95 5030ms, p99 5940ms, 34.21 RPS
- charge-stream: 400 req, concurrency 150, 200×400, p95 3289ms, p99 6076ms, 22.32 RPS
- Ledger stress test: 300 req, concurrency 150, 300/300 success, credits matched expected (1242→942), ledger deltas +242 (lower than 300 requests — under investigation)

