-- Simplified permissive INSERT for artist_applications 
-- (required fields are enforced by NOT NULL constraints at the table level)

DROP POLICY IF EXISTS "Anyone can insert artist applications" ON public.artist_applications;

CREATE POLICY "Anyone can insert artist applications"
ON public.artist_applications
AS PERMISSIVE
FOR INSERT
TO public  -- includes anon + authenticated
WITH CHECK (true);
