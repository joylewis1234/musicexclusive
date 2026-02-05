-- Drop and recreate with explicit anon + authenticated targeting
-- The previous 'TO public' may not be working as expected

DROP POLICY IF EXISTS "Anyone can insert artist applications" ON public.artist_applications;

-- Create policy explicitly for anon and authenticated roles
CREATE POLICY "Anyone can insert artist applications"
ON public.artist_applications
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (true);