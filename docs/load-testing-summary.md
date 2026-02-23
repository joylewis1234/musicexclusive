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

## Limitations

- Playback system load testing not executed (requires authenticated minting and signed URL playback).
- Ledger concurrency stress testing not executed in this run.
- Results are from light load and should be repeated at higher concurrency in a staging environment.
