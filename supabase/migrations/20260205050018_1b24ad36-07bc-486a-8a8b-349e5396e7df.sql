-- Reduce overly-permissive INSERT policies without breaking public onboarding

BEGIN;

-- artist_applications: keep public inserts, but require agrees_terms=true
DROP POLICY IF EXISTS "Anyone can insert artist applications" ON public.artist_applications;
CREATE POLICY "Anyone can insert artist applications"
ON public.artist_applications
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (agrees_terms = true);

-- agreement_acceptances: allow public inserts, but require non-empty core fields
DROP POLICY IF EXISTS "Anyone can insert agreement acceptances" ON public.agreement_acceptances;
CREATE POLICY "Anyone can insert agreement acceptances"
ON public.agreement_acceptances
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(trim(email)) > 3
  AND position('@' in email) > 1
  AND length(trim(name)) > 0
  AND length(trim(privacy_version)) > 0
  AND length(trim(terms_version)) > 0
);

-- report_email_logs: should be system/admin-only inserts (not public)
DROP POLICY IF EXISTS "System can insert report logs" ON public.report_email_logs;
CREATE POLICY "System can insert report logs"
ON public.report_email_logs
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt() ->> 'role') = 'service_role'
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Ask API layer to reload schema/privileges cache
NOTIFY pgrst, 'reload schema';

COMMIT;