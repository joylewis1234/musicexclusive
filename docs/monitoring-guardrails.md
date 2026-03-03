# Monitoring & Guardrail Layer

## Overview
This document describes the minimum viable monitoring and guardrail layer used to validate a safe paid marketing launch. It focuses on structured visibility, simple callable metrics, and contention signals under moderate load.

## Shared Helper Module
All monitoring events are written via `recordMonitoringEvent()` in `_shared/monitoring.ts`. The helper:
- Uses a lazy singleton service-role client
- Normalizes fields (including error truncation)
- Logs every event as JSON
- Swallows insert errors to avoid breaking requests

## Table Schema
Events are stored in `public.monitoring_events` with fields:
- `function_name`, `event_type`, `status`, `latency_ms`
- `stage`, `error_code`, `error_message`
- `conflict`, `retry_count`, `contention_count`, `ledger_written`
- `metadata` (jsonb)

## Instrumented Functions
### 1. charge-stream
Tracks latency, errors, retry frequency, contention signals, and ledger write outcomes.

### 2. mint-playback-url
Tracks latency, auth/validation failures, session creation steps, and presign timing.

### 3. mint-playback-url-public-preview
Tracks preview availability and error outcomes for public preview flows.

### 4. verify-checkout
Tracks successful checkout verification, already-processed responses, and ledger errors.

### 5. stripe-webhook
Tracks webhook signature failures, credit application errors, and success flows.

### 6. playback (via playback-telemetry)
Tracks playback error rates, latency, and origin saturation signals.

## Endpoints
### monitoring-metrics (Admin-only)
Returns per-function aggregates for a given window. Example response:
```
{
  "windowHours": 24,
  "since": "2026-02-25T19:00:00.000Z",
  "totalEvents": 1234,
  "functions": {
    "charge-stream": {
      "total": 500,
      "latency": { "p95Ms": 120, "p99Ms": 250 },
      "rates": {
        "error5xx": 0.002,
        "conflict": 0.01,
        "retry": 0.005,
        "contention": 0.003,
        "ledgerWritten": 0.95
      },
      "statusCounts": { "200": 490, "402": 5, "409": 3, "500": 2 }
    }
  }
}
```

### playback-telemetry (Authenticated)
Client POST request body:
```
{
  "trackId": "uuid",
  "sessionId": "uuid",
  "status": 200,
  "latencyMs": 45.2,
  "range": "bytes=0-1024",
  "cacheStatus": "HIT",
  "originStatus": 200,
  "originLatencyMs": 120.5
}
```

## Example Queries
```sql
-- 5xx error rate in last hour
select
  count(*) filter (where status >= 500)::float / nullif(count(*), 0) as error5xx_rate
from monitoring_events
where created_at >= now() - interval '1 hour';

-- p95/p99 latency per function
select
  function_name,
  percentile_cont(0.95) within group (order by latency_ms) as p95_ms,
  percentile_cont(0.99) within group (order by latency_ms) as p99_ms
from monitoring_events
where created_at >= now() - interval '1 hour'
group by function_name;

-- contention rate proxy (retry_count > 0)
select
  function_name,
  count(*) filter (where retry_count > 0)::float / nullif(count(*), 0) as retry_rate
from monitoring_events
where created_at >= now() - interval '1 hour'
group by function_name;

-- playback error rate
select
  count(*) filter (where event_type = 'playback_error')::float / nullif(count(*), 0) as playback_error_rate
from monitoring_events
where function_name = 'playback'
  and created_at >= now() - interval '1 hour';
```

## Retention
Retention should align with operational needs (at least 7-14 days for launch). Consider periodic cleanup if volumes grow.

## Architecture Notes
This layer is designed for minimal architectural changes and fast visibility. It is intentionally lightweight, emphasizing operational observability rather than deep analytics.
