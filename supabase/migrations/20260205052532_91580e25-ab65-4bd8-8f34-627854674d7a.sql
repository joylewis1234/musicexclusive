-- Ensure logged-out users can submit artist applications on the published site
BEGIN;

-- Table-level permissions required by the API role switching (anon/authenticated)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON TABLE public.artist_applications TO anon, authenticated;

-- RLS: allow INSERTs from anon/authenticated when terms are agreed
DROP POLICY IF EXISTS "Anyone can insert artist applications" ON public.artist_applications;
CREATE POLICY "Anyone can insert artist applications"
ON public.artist_applications
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (agrees_terms = true);

-- Refresh API schema cache
NOTIFY pgrst, 'reload schema';

COMMIT;