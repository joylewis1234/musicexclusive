# Load Testing Summary

## Scope
This summary covers edge function load tests executed against safe, public endpoints, along with playback load testing and ledger stress tests.

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

## Limitations
- Results are from light load and should be repeated at higher concurrency in a staging environment.

## Playback Load Test (Signed URL)
- Tool: scripts/load-test-playback.js
- Date: 2026-02-23
- Requests: 20
- Concurrency: 5
- Status codes: 200 x 20
- Throughput: ~0.10 RPS (duration ~193.6s)
- Latency (ms): p50 45616, p95 61095, p99 66191, max 66191

## Ledger Concurrency Stress Test (Initial Run)
- Tool: scripts/ledger-stress-test.js
- Concurrency: 5
- Requests: 40
- Status codes: 200 x 40
- Latency (ms): p50 1531, p95 1983, p99 2378, max 2378
- Credits: starting 99, ending 77, expected ending 59
- Ledger: STREAM_DEBIT rows 40, stream_ledger rows 41

## Ledger Findings (Initial Run)
- Successful responses did not align with credit deductions.
- Ledger entries exceeded the actual credit decrement.
- This indicates a concurrency integrity issue in the debit flow that must be addressed.

## Ledger Concurrency Stress Test (Post-Fix Run)
- Tool: scripts/ledger-stress-test.js
- Concurrency: 5
- Requests: 40
- Status codes: 200 x 20, 500 x 20
- Latency (ms): p50 1391, p95 1832, p99 1935, max 1935
- Credits: starting 76, ending 56, expected ending 56
- Ledger: STREAM_DEBIT rows 20, stream_ledger rows 21

## Ledger Findings (Post-Fix Run)
- Credit balance now matches successful deductions.
- 500 errors occurred under concurrent load and require investigation.
- stream_ledger rows exceeded STREAM_DEBIT by 1, which still suggests an integrity issue.

## Ledger Concurrency Stress Test (Final Run)
- Tool: scripts/ledger-stress-test.js
- Concurrency: 5
- Requests: 40
- Status codes: 200 x 10, 402 x 13, 409 x 17
- Latency (ms): p50 818, p95 1599, p99 1682, max 1682
- Credits: starting 10, ending 0, expected ending 0
- Ledger delta: STREAM_DEBIT +10, stream_ledger +10

## Ledger Findings (Final Run)
- Ledger deltas match successful deductions and credits.
- 402 errors occurred when credits ran out; 409 errors occurred on concurrent update.
- No integrity mismatch observed in the final run.

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

## Playback Load Test (High Concurrency Run)
- Tool: scripts/load-test-playback.js
- Date: 2026-02-24
- Concurrency: 20
- Requests: 200
- Status codes: 200 x 47, 0 x 153
- Throughput: ~0.04 RPS
- Latency (ms): p50 647, p95 2263391, p99 2756991, max 2986172
- Errors: 0:network_error x 153

## Overall Summary (Latest)
- mint-playback-url handled high concurrency with full success and p95/p99 under 5s.
- charge-stream remained consistent for ledger integrity but showed high 409 contention under load.
- playback signed URL load testing under high concurrency showed significant network-level failures (status 0) and extreme p95/p99 latency, indicating request saturation or upstream limits.

## Moderate Concurrency Run (2026-02-27)
- Tool: `scripts/load-test-edge.js` @ 150 concurrency, 400 requests per endpoint (track `9fad1e64-016e-41da-95b5-6f2dd154ee41`).
- mint-playback-url: 200 x 400; p95 6009ms, p99 6183ms; success but elevated latency.
- charge-stream: 200 x 400; p95 2981ms, p99 4291ms; success with lower throughput.
- Tool: `scripts/ledger-stress-test.js` @ 150 concurrency, 300 requests.
- Ledger test completed: 300/300 success; credits matched expected; ledger writes confirmed (701 rows in last 60 min for test track/user).
