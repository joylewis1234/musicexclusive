import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.91.1";

export interface MonitoringEvent {
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

// Lazy singleton service-role client
let _adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (!_adminClient) {
    _adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
  }
  return _adminClient;
}

function normalizeString(val: string | undefined | null, maxLen = 500): string | null {
  if (val == null) return null;
  return String(val).slice(0, maxLen);
}

/**
 * Fire-and-forget structured event insert into monitoring_events.
 * Never throws, never blocks the main response.
 */
export async function recordMonitoringEvent(event: MonitoringEvent): Promise<void> {
  const payload = {
    function_name: event.function_name,
    event_type: event.event_type,
    status: event.status,
    latency_ms: event.latency_ms ?? null,
    stage: normalizeString(event.stage),
    error_code: normalizeString(event.error_code),
    error_message: normalizeString(event.error_message),
    conflict: Boolean(event.conflict),
    retry_count: event.retry_count ?? 0,
    contention_count: event.contention_count ?? 0,
    ledger_written: event.ledger_written ?? null,
    metadata: event.metadata ?? null,
  };

  console.log(`[monitoring] ${JSON.stringify(payload)}`);

  try {
    const { error } = await getAdminClient().from("monitoring_events").insert(payload);
    if (error) {
      console.error("[monitoring] insert failed:", error.message);
    }
  } catch (err) {
    console.error("[monitoring] insert error:", err);
  }
}
