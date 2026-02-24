

# Add High-Concurrency Ledger Stress Test Results

## What Changes

Update `docs/load-testing-summary.md` in two ways:

1. **Insert new sections after line 60** (after "Ledger Concurrency Stress Test -- Final Run"): Add the two blocks you provided verbatim:
   - "Ledger Concurrency Stress Test (High Concurrency Run)" with the actual metrics
   - "Ledger Findings (High Concurrency Run)" with observations

2. **Fill in the placeholder at lines 116-122** ("Ledger Stress Test (200 req, concurrency 25)"): Replace the `_TBD_` values with the real results:
   - Status codes: 200 x 37, 409 x 163
   - Credits before/after: 1999 / 1962
   - Ledger delta: STREAM_DEBIT +37, stream_ledger +37
   - Integrity: OK -- credits match ledger deltas exactly; no overspend, no 500s

## Technical Details

Two edits to `docs/load-testing-summary.md`:

**Edit 1 -- Insert after line 60:**
```
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
```

**Edit 2 -- Replace lines 116-122 placeholder with actual results:**
```
### Ledger Stress Test (200 req, concurrency 25)

- Total requests: 200
- Status codes: 200 x 37, 409 x 163
- Credits before/after: 1999 / 1962
- Ledger delta: STREAM_DEBIT +37, stream_ledger +37
- Integrity: **OK** -- credits match ledger deltas exactly; no overspend, no 500s observed
```

No other files are changed.

