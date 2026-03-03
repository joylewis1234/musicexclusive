# Moderate Concurrency Stress Test Report

## Configuration
- Date: 2026-02-27
- Environment: Local script against production/staging Supabase (from `.env`)
- Track ID: `9fad1e64-016e-41da-95b5-6f2dd154ee41`
- mint-playback-url: 400 requests @ 150 concurrency
- charge-stream: 400 requests @ 150 concurrency
- ledger-stress-test: 300 requests @ 150 concurrency (ALLOW_OVERSPEND=true)

## mint-playback-url
- Max stable RPS: ~39.52
- p95 latency: 6009 ms
- p99 latency: 6183 ms
- 5xx rate: 0%
- Status codes: 200 x 400
- Notes: Successful under moderate concurrency, but p95/p99 are elevated.

## charge-stream
- Max stable RPS: ~61.77
- p95 latency: 2981 ms
- p99 latency: 4291 ms
- 5xx rate: 0%
- Status codes: 200 x 400
- Conflict (logical 409) rate: not observed
- Retry rate: not observed
- Notes: Successful under moderate concurrency, but throughput is lower than mint-playback-url.

## Ledger Integrity
- Starting credits: 541
- Ending credits: 241
- Expected ending: 241
- STREAM_DEBIT delta: 300 (per load test result)
- stream_ledger delta: 300 (per load test result)
- Recent ledger rows (last 60 minutes): 701 STREAM_DEBIT and 701 stream_ledger rows for the test track/user.
- Consistency conclusion: credits matched expected ending; ledger writes confirmed.

## Playback Telemetry (if available)
- Playback error rate: not captured in this run
- Origin saturation signals: not captured in this run

## Bottlenecks Identified
- Test inputs are not accepted under moderate concurrency (404/500).
- `charge-stream` dependency failure prevents ledger test from running.

## Stability Conclusion
- Moderate concurrency stability could not be validated due to failures in `mint-playback-url` and `charge-stream`.
