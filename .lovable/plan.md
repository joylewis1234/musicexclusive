

# Monitoring Layer: Shared Helper, Metrics Endpoint & Playback Telemetry

## Current State
- All 5 critical functions (`charge-stream`, `mint-playback-url`, `mint-playback-url-public-preview`, `verify-checkout`, `stripe-webhook`) have **inline** `logMonitoringEvent` helpers — duplicated across each file.
- No shared monitoring module exists (only `_shared/verify-admin.ts`).
- No `monitoring-metrics` or `playback-telemetry` functions exist yet.

---

## Changes

### 1. Create `supabase/functions/_shared/monitoring.ts`
Shared helper with `recordMonitoringEvent()` that:
- Creates its own service-role client (lazy singleton)
- Normalizes fields (`error_message` truncation, boolean coercion, default `0` for retry/contention counts)
- Console-logs the event payload for diagnostics
- Inserts into `monitoring_events` with error swallowing

### 2. Create `supabase/functions/monitoring-metrics/index.ts`
Admin-only endpoint using `verifyAdmin()` from `_shared/verify-admin.ts`:
- Accepts `?window=24h` (default 24h, max 7d)
- Queries `monitoring_events` for the window
- Returns aggregated metrics per function: `p95`, `p99` latency, `5xx` rate, `conflict/retry/contention` rates, `ledgerWritten` rate, status code distribution
- Add `[functions.monitoring-metrics] verify_jwt = false` to config.toml

### 3. Create `supabase/functions/playback-telemetry/index.ts`
Authenticated endpoint (validates JWT via `getUser()`):
- Accepts POST with `{ trackId, sessionId, status, latencyMs, range, cacheStatus, originStatus, originLatencyMs }`
- Validates/sanitizes all fields
- Writes to `monitoring_events` with `function_name = "playback"`, `event_type = "playback_error" | "playback_request"`
- Includes client IP, user agent, CF headers in metadata
- Add `[functions.playback-telemetry] verify_jwt = false` to config.toml

### 4. Refactor 5 existing functions to use shared helper
Replace inline `logMonitoringEvent` in each function with:
```typescript
import { recordMonitoringEvent } from "../_shared/monitoring.ts";
```
- **charge-stream**: Switch to `performance.now()`, add `stage` tracking, pass `conflict`/`retry_count`/`contention_count`/`ledger_written` fields
- **mint-playback-url**: Switch to `performance.now()`, add `stage` tracking, include `session_id`/`r2_key`/`session_ttl_seconds` in metadata
- **mint-playback-url-public-preview**: Replace `logMonitoringEvent(monitorClient, ...)` with `recordMonitoringEvent(...)`
- **verify-checkout**: Replace inline helper with shared import
- **stripe-webhook**: Replace inline helper with shared import

### 5. Update `docs/monitoring-guardrails.md`
Add documentation for:
- `monitoring-metrics` endpoint (query params, response shape)
- `playback-telemetry` endpoint (request body schema)
- Shared helper module reference

---

## Files Changed

| File | Change |
|---|---|
| `supabase/functions/_shared/monitoring.ts` | **New** — shared helper |
| `supabase/functions/monitoring-metrics/index.ts` | **New** — admin metrics endpoint |
| `supabase/functions/playback-telemetry/index.ts` | **New** — playback telemetry endpoint |
| `supabase/config.toml` | Add 2 new function entries |
| `supabase/functions/charge-stream/index.ts` | Replace inline helper with shared import |
| `supabase/functions/mint-playback-url/index.ts` | Replace inline helper with shared import |
| `supabase/functions/mint-playback-url-public-preview/index.ts` | Replace inline helper with shared import |
| `supabase/functions/verify-checkout/index.ts` | Replace inline helper with shared import |
| `supabase/functions/stripe-webhook/index.ts` | Replace inline helper with shared import |
| `docs/monitoring-guardrails.md` | Add new endpoint docs |

No database changes. No frontend changes. No new dependencies.

