-- Force schema cache refresh by modifying the policy
-- This is a no-op change that should trigger PostgREST to reload

-- First, ensure we have the correct policy with a slight modification
DROP POLICY IF EXISTS "Anyone can insert artist applications" ON public.artist_applications;

CREATE POLICY "Anyone can insert artist applications"
ON public.artist_applications
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Also explicitly notify the database of changes
NOTIFY pgrst, 'reload schema';