# Monitoring & Guardrail Layer

## Overview

Lightweight, non-blocking structured event logging for critical backend functions. Events are stored in `monitoring_events` and accessible only to service-role and admin users. All functions use the shared `_shared/monitoring.ts` helper.

---

## Shared Helper Module

**File:** `supabase/functions/_shared/monitoring.ts`

```typescript
import { recordMonitoringEvent } from "../_shared/monitoring.ts";

// Fire-and-forget — never blocks the response
recordMonitoringEvent({
  function_name: "my-function",
  event_type: "success",
  status: 200,
  latency_ms: 42,
  stage: "done",
  metadata: { key: "value" },
}).catch(() => {});
```

Features:
- **Lazy singleton** service-role client (created on first call)
- **Field normalization**: `error_message` truncated to 500 chars, booleans coerced, defaults for `retry_count`/`contention_count` (0)
- **Console logging**: Every event is `console.log`'d as JSON for Edge Function log visibility
- **Error swallowing**: Insert failures are logged but never propagate

---

## Table Schema

```sql
CREATE TABLE public.monitoring_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  function_name text NOT NULL,
  event_type    text NOT NULL,
  status        integer NOT NULL,
  latency_ms    integer,
  stage         text,
  error_code    text,
  error_message text,
  conflict      boolean DEFAULT false,
  retry_count   integer DEFAULT 0,
  contention_count integer DEFAULT 0,
  ledger_written boolean,
  metadata      jsonb
);
```

### Access Control
- RLS enabled
- `anon` and `authenticated` roles have **zero** access (REVOKE ALL)
- Service-role: full CRUD (for edge function inserts)
- Admin: read-only (for dashboard queries)

---

## Instrumented Functions

### 1. `charge-stream`
Uses `performance.now()` for precise latency. Tracks `stage` through the request lifecycle.

| Event Type | Status | When |
|---|---|---|
| `request` (stage=done) | 200 | Stream charged, ledger written |
| `request` (conflict=true) | 200 | Duplicate idempotency key detected |
| `request` (stage=auth) | 401 | Invalid/missing JWT |
| `request` (stage=vault_check) | 402 | Fan has 0 credits |
| `request` (stage=debit) | 409/500 | RPC retries exhausted |
| `unhandled_error` | 500 | Uncaught exception |

### 2. `mint-playback-url`
Uses `performance.now()` for precise latency. Tracks `stage` and includes `session_id`, `r2_key`, `session_ttl_seconds` in metadata.

| Event Type | Status | When |
|---|---|---|
| `request` (stage=done) | 200 | Signed URL + session minted |
| `request` (stage=auth) | 401 | Invalid JWT |
| `request` (stage=access_check) | 404 | Track ID doesn't exist |
| `request` (stage=access_check) | 403 | Not admin/artist/vault member |
| `request` (stage=session_insert) | 500 | DB insert for playback_sessions failed |
| `unhandled_error` | 500 | Uncaught exception |

### 3. `mint-playback-url-public-preview`
| Event Type | Status | When |
|---|---|---|
| `success` | 200 | Preview signed URL returned |
| `rate_limited` | 429 | IP exceeded 10 req / 10 min |
| `no_preview_available` | 404 | Track has no preview_audio_key |
| `rpc_error` | 500 | get_public_preview_audio_key RPC failed |

### 4. `verify-checkout`
| Event Type | Status | When |
|---|---|---|
| `success` | 200 | Credits applied, ledger written |
| `already_processed` | 200 | Idempotency check caught duplicate |
| `payment_not_completed` | 400 | Stripe session not paid/complete |
| `ledger_error` | 200 | Credits applied but ledger insert failed |
| `error` | 500 | Unhandled exception |

### 5. `stripe-webhook`
| Event Type | Status | When |
|---|---|---|
| `checkout.session.completed` | 200 | Credits applied via webhook |
| `invoice.payment_succeeded` | 200 | Subscription renewal credits applied |
| `signature_missing` | 403 | No stripe-signature header |
| `signature_invalid` | 400 | Webhook signature verification failed |
| `credit_apply_error` | 500 | apply_credit_purchase RPC failed |
| `error` | 500 | Unhandled exception |

### 6. `playback` (via `playback-telemetry` endpoint)
| Event Type | Status | When |
|---|---|---|
| `playback_request` | varies | Client reports successful playback segment |
| `playback_error` | ≥400 | Client reports playback error |

Metadata includes: `track_id`, `session_id`, `range`, `cache_status`, `origin_status`, `origin_latency_ms`, `user_id`, `client_ip`, `user_agent`, `cf_ray`, `colo`.

---

## Endpoints

### `monitoring-metrics` (Admin-only)

**GET** `/functions/v1/monitoring-metrics?window=24h`

Requires admin JWT. Returns aggregated metrics per function.

**Query params:**
| Param | Default | Description |
|---|---|---|
| `window` | `24h` | Time window (e.g. `1h`, `72h`, max `168h` / 7 days) |

**Response shape:**
```json
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

### `playback-telemetry` (Authenticated)

**POST** `/functions/v1/playback-telemetry`

Requires user JWT. Accepts client-side playback telemetry.

**Request body:**
```json
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

All fields are optional and sanitized server-side. Events with `status >= 400` are classified as `playback_error`, others as `playback_request`.

---

## Example Queries

### Error rate (last 24h)
```sql
SELECT
  function_name,
  COUNT(*) FILTER (WHERE status >= 400) AS errors,
  COUNT(*) AS total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status >= 400) / NULLIF(COUNT(*), 0), 2) AS error_pct
FROM monitoring_events
WHERE created_at > now() - interval '24 hours'
GROUP BY function_name
ORDER BY error_pct DESC;
```

### P50/P95 latency
```sql
SELECT
  function_name,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY latency_ms) AS p50_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_ms
FROM monitoring_events
WHERE created_at > now() - interval '24 hours'
  AND latency_ms IS NOT NULL
GROUP BY function_name;
```

### Contention rate (charge-stream)
```sql
SELECT
  COUNT(*) FILTER (WHERE conflict = true) AS contention_events,
  COUNT(*) AS total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE conflict = true) / NULLIF(COUNT(*), 0), 2) AS contention_pct
FROM monitoring_events
WHERE function_name = 'charge-stream'
  AND created_at > now() - interval '24 hours';
```

### Ledger write failures
```sql
SELECT *
FROM monitoring_events
WHERE ledger_written = false
  AND created_at > now() - interval '7 days'
ORDER BY created_at DESC;
```

### Recent errors by function
```sql
SELECT created_at, function_name, event_type, status, error_message
FROM monitoring_events
WHERE status >= 400
ORDER BY created_at DESC
LIMIT 50;
```

### Playback error rate
```sql
SELECT
  COUNT(*) FILTER (WHERE event_type = 'playback_error') AS errors,
  COUNT(*) AS total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE event_type = 'playback_error') / NULLIF(COUNT(*), 0), 2) AS error_pct
FROM monitoring_events
WHERE function_name = 'playback'
  AND created_at > now() - interval '24 hours';
```

---

## Retention

Events accumulate over time. Recommended cleanup:

```sql
DELETE FROM monitoring_events
WHERE created_at < now() - interval '30 days';
```

Run this manually or via a scheduled cron function.

---

## Architecture Notes

- **Non-blocking**: All monitoring inserts are fire-and-forget (`.catch(() => {})`)
- **Shared module**: `_shared/monitoring.ts` — lazy singleton client, field normalization
- **Precise timing**: `charge-stream` and `mint-playback-url` use `performance.now()` for sub-ms accuracy
- **Stage tracking**: Request lifecycle stages captured for debugging (auth → parse → lookup → debit → done)
- **No frontend changes**: Purely backend instrumentation
- **No performance impact**: Single async INSERT, never awaited in the response path
