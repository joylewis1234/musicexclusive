-- Ensure artist application submission works for both logged-out and logged-in users
-- by using an explicit PERMISSIVE INSERT policy.

ALTER TABLE public.artist_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert artist applications" ON public.artist_applications;

CREATE POLICY "Anyone can insert artist applications"
ON public.artist_applications
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
