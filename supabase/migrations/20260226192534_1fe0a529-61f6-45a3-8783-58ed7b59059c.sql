
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

CREATE POLICY "Service role can manage monitoring events"
  ON public.monitoring_events FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Admins can view monitoring events"
  ON public.monitoring_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
