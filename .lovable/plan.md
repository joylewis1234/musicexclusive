

# Monitoring + Guardrail Layer Plan

## Summary
Add a `monitoring_events` table with strict service-role-only access, instrument the 5 critical edge functions with lightweight structured event logging, and create documentation.

---

## 1. Database Migration

Create `monitoring_events` table with the exact SQL from the request, plus:
- RLS enabled, all privileges revoked from `anon`/`authenticated`
- Single service-role-only policy for ALL operations
- Two indexes: `created_at DESC` and composite `(function_name, event_type, created_at DESC)`

```sql
CREATE TABLE IF NOT EXISTS public.monitoring_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  function_name text NOT NULL,
  event_type text NOT NULL,
  status integer NOT NULL,
  latency_ms integer,
  stage text,
  error_code text,
  error_message text,
  conflict boolean NOT NULL DEFAULT false,
  retry_count integer NOT NULL DEFAULT 0,
  contention_count integer NOT NULL DEFAULT 0,
  ledger_written boolean,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS monitoring_events_created_at_idx
  ON public.monitoring_events (created_at DESC);
CREATE INDEX IF NOT EXISTS monitoring_events_function_type_idx
  ON public.monitoring_events (function_name, event_type, created_at DESC);

ALTER TABLE public.monitoring_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.monitoring_events FROM anon, authenticated;

-- Service-role-only policy
CREATE POLICY "Service role can manage monitoring events"
  ON public.monitoring_events FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- Admin read-only policy
CREATE POLICY "Admins can view monitoring events"
  ON public.monitoring_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
```

---

## 2. Edge Function Instrumentation

Add a non-blocking `logMonitoringEvent()` helper call at the end of these 5 critical functions. The helper uses the existing service-role client (already present in each function) to insert one row. It is fire-and-forget (`.catch(() => {})`) so it never blocks or fails the main response.

### Functions to instrument:

| Function | Key events to capture |
|---|---|
| `charge-stream` | success, idempotency duplicate, contention/409, insufficient credits, auth failure |
| `mint-playback-url` | success, access denied, track not found, session insert error |
| `mint-playback-url-public-preview` | success, rate limited, no preview available, RPC error |
| `verify-checkout` | success, already processed, payment not completed, ledger error |
| `stripe-webhook` | checkout.session.completed, invoice.payment_succeeded, credit apply error, signature invalid |

### Helper pattern (added inline at top of each function file):
```typescript
async function logMonitoringEvent(
  client: SupabaseClient,
  event: {
    function_name: string;
    event_type: string;
    status: number;
    latency_ms?: number;
    stage?: string;
    error_code?: string;
    error_message?: string;
    conflict?: boolean;
    retry_count?: number;
    contention_count?: number;
    ledger_written?: boolean;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await client.from("monitoring_events").insert(event);
  } catch (_) { /* never block main flow */ }
}
```

Each function captures `startTime = Date.now()` at entry, then calls `logMonitoringEvent(adminClient, { ... latency_ms: Date.now() - startTime ... })` just before returning. No structural changes to the function logic.

---

## 3. Documentation

Create `docs/monitoring-guardrails.md` covering:
- Table schema and access rules
- Which functions are instrumented and what events they emit
- Example queries for ops (error rate, p50/p95 latency, contention rate, ledger write failures)
- Retention guidance (manual cleanup of rows older than 30 days)

---

## 4. Files Changed

| File | Change |
|---|---|
| `supabase/migrations/...` | New migration for `monitoring_events` table |
| `supabase/functions/charge-stream/index.ts` | Add helper + 4 event log points |
| `supabase/functions/mint-playback-url/index.ts` | Add helper + 3 event log points |
| `supabase/functions/mint-playback-url-public-preview/index.ts` | Add helper + 3 event log points |
| `supabase/functions/verify-checkout/index.ts` | Add helper + 3 event log points |
| `supabase/functions/stripe-webhook/index.ts` | Add helper + 3 event log points |
| `docs/monitoring-guardrails.md` | New documentation file |

No frontend changes. No new dependencies. No architecture changes.

