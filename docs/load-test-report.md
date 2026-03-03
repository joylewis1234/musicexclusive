# Load/Stress Test Report + Fix Plan (Milestone 4)

## Findings

### 1) mint-playback-url (High Concurrency)
- 200 requests @ 25 concurrency
- 100% success, 10.68 RPS
- Latency: p50 1005ms, p95 3301ms, p99 4876ms
- Conclusion: Stable under load.

### 2) charge-stream (High Concurrency)
- 200 requests @ 25 concurrency
- 37 success / 163 retries (409)
- 8.93 RPS
- Latency: p50 1566ms, p95 3056ms, p99 8328ms
- Ledger integrity: Credits and ledger deltas matched successful deductions (no overspend).
- Conclusion: Correctness OK, contention is high (409s).

### 3) Playback signed URL load (High Concurrency)
- 200 requests @ 20 concurrency
- 47 success / 153 network failures
- RPS: 0.04
- Latency: p50 647ms, p95 2263391ms, p99 2756991ms
- Errors: 0:network_error dominant
- Conclusion: Playback requests saturate or hit upstream limits at high concurrency.

## Bottlenecks Identified
- charge-stream contention on concurrent credit updates (409 retry required).
- Playback signed URL saturation under high concurrency.

## Fix Plan

### A) charge-stream reliability
1) Add retry with exponential backoff for 409 responses (100ms, 250ms, 500ms, 1s, max 5 attempts).
2) Transactional debit RPC to reduce race conditions:
   - Single SQL function: update credits only if credits >= 1, then insert ledger rows in the same transaction.

### B) Playback performance
1) Prefer HLS path for playback (already integrated in client).
2) Reduce signed URL reliance and refresh only near expiry.
3) Scale via Worker-served HLS segments instead of full-file URLs under concurrency.
