# Launch Monitoring Checklist

Use this checklist to track progress for the monitoring + guardrail launch phase.

## Monitoring & Instrumentation
- [x] Add `monitoring_events` table + indexes + RLS (migration applied).
- [x] Add shared monitoring helper (`_shared/monitoring.ts`).
- [x] Instrument `mint-playback-url` (p95/p99, 5xx, stage/errors).
- [x] Instrument `charge-stream` (p95/p99, 5xx, retry/conflict/contention signals).
- [x] Instrument `mint-playback-url-public-preview`, `verify-checkout`, `stripe-webhook`.
- [x] Add `monitoring-metrics` edge function (admin-only).
- [x] Add `playback-telemetry` edge function (playback error/origin signals).
- [x] Wire client playback telemetry calls (if needed).

## Documentation
- [x] `docs/monitoring-guardrails.md` (endpoint docs + schemas).
- [x] `docs/monitoring-thresholds.md` (safe/warn/critical + actions).
- [x] `docs/launch-monitoring-playbook.md` (retrieval + escalation).
- [x] `docs/graceful-degradation-strategy.md` (retry/throttle/messaging).
- [x] `docs/moderate-concurrency-stress-test-report.md` (template filled).
- [x] Update `docs/load-testing-summary.md` with moderate concurrency plan + results.

## Deployment & Verification
- [x] Deploy monitoring changes to edge functions.
- [x] Verify `monitoring-metrics` endpoint with admin JWT.
- [x] Verify telemetry records appear in `monitoring_events`.
- [x] Confirm metrics for `mint-playback-url` and `charge-stream` populate.

## Moderate Concurrency Stress Test
- [x] Run `scripts/load-test-edge.js` at 100–200 concurrency.
- [x] Run `scripts/ledger-stress-test.js` at 100–200 concurrency.
- [x] Record p95/p99 latency, 5xx rate, conflict/retry rate.
- [x] Confirm ledger integrity under load.
- [x] Identify bottlenecks and max stable RPS.

## Final Deliverables
- [x] Monitoring instrumentation implemented.
- [x] Stress test results delivered.
- [x] Threshold documentation delivered.
- [x] Launch Monitoring Playbook delivered.
