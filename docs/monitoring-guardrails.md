# Monitoring & Guardrail Layer

## Overview

Lightweight, non-blocking structured event logging for the 5 critical backend functions. Events are stored in `monitoring_events` and accessible only to service-role and admin users.

---

## Table Schema

```sql
CREATE TABLE public.monitoring_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  function_name text NOT NULL,        -- e.g. "charge-stream"
  event_type    text NOT NULL,        -- e.g. "success", "auth_failure"
  status        integer NOT NULL,     -- HTTP status code
  latency_ms    integer,              -- end-to-end latency
  stage         text,                 -- optional processing stage
  error_code    text,                 -- e.g. Postgres error code "40001"
  error_message text,
  conflict      boolean DEFAULT false,-- idempotency/contention detected
  retry_count   integer DEFAULT 0,
  contention_count integer DEFAULT 0,
  ledger_written boolean,             -- was credit_ledger written?
  metadata      jsonb                 -- function-specific context
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
| Event Type | Status | When |
|---|---|---|
| `success` | 200 | Stream charged, ledger written |
| `idempotency_duplicate` | 200 | Duplicate idempotency key detected |
| `auth_failure` | 401 | Invalid/missing JWT |
| `insufficient_credits` | 402 | Fan has 0 credits |
| `contention_exhausted` | 409/500 | RPC retries exhausted |
| `debit_failed` | 409 | Atomic debit returned false |

### 2. `mint-playback-url`
| Event Type | Status | When |
|---|---|---|
| `success` | 200 | Signed URL + session minted |
| `auth_failure` | 401 | Invalid JWT |
| `track_not_found` | 404 | Track ID doesn't exist |
| `access_denied` | 403 | Not admin/artist/vault member |
| `session_insert_error` | 500 | DB insert for playback_sessions failed |

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

---

## Retention

Events accumulate over time. Recommended cleanup:

```sql
-- Delete events older than 30 days
DELETE FROM monitoring_events
WHERE created_at < now() - interval '30 days';
```

Run this manually or via a scheduled cron function.

---

## Architecture Notes

- **Non-blocking**: All monitoring inserts are fire-and-forget (`.catch(() => {})`)
- **No dependencies**: Uses existing service-role client already present in each function
- **No frontend changes**: Purely backend instrumentation
- **No performance impact**: Single async INSERT, never awaited in the response path
