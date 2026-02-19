
-- 1) Remove anonymous INSERT policies
DROP POLICY IF EXISTS "Anyone can insert agreement acceptances" ON public.agreement_acceptances;
DROP POLICY IF EXISTS "Anyone can insert artist applications" ON public.artist_applications;

-- 2) Service-role-only INSERTs
DROP POLICY IF EXISTS "Service role can insert agreement acceptances" ON public.agreement_acceptances;
CREATE POLICY "Service role can insert agreement acceptances"
  ON public.agreement_acceptances
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

DROP POLICY IF EXISTS "Service role can insert artist applications" ON public.artist_applications;
CREATE POLICY "Service role can insert artist applications"
  ON public.artist_applications
  FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- 3) Rate limit tracking table
CREATE TABLE IF NOT EXISTS public.request_rate_limits (
  id bigserial PRIMARY KEY,
  key text NOT NULL,
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS request_rate_limits_key_idx
  ON public.request_rate_limits (key, endpoint, window_start);

-- Enable RLS
ALTER TABLE public.request_rate_limits ENABLE ROW LEVEL SECURITY;

-- Service-role-only access
CREATE POLICY "Service role can manage rate limits"
  ON public.request_rate_limits
  FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
