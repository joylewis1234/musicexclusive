# Launch Monitoring Playbook

## How to Fetch Metrics
Use `monitoring-metrics` (admin-only):
- GET `https://<project-ref>.functions.supabase.co/monitoring-metrics?window=1h`
- Header: `Authorization: Bearer <admin-jwt>`

Response includes `functions` with p95/p99, 5xx, conflict/retry rates.

## Daily Launch Routine
- Morning and evening: pull 1h metrics.
- If any warning threshold is hit, reduce spend and watch for 30–60 minutes.
- If any critical threshold is hit, pause spend and investigate.

## Incident Checklist
1) Identify failing function + stage from `monitoring_events`.
2) Inspect error codes and recent deploys.
3) Reduce concurrency or pause paid spend.
4) Verify recovery using `monitoring-metrics`.

## Notes
- `charge-stream` contention is expected under high concurrency; use conflict/retry rates for decisions.
