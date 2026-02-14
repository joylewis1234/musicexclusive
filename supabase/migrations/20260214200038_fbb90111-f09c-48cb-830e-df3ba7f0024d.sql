-- Drop the restrictive policies
DROP POLICY IF EXISTS "Artists can insert their own acceptance" ON public.artist_agreement_acceptances;
DROP POLICY IF EXISTS "Artists can view their own acceptances" ON public.artist_agreement_acceptances;

-- Recreate as PERMISSIVE policies (the default)
CREATE POLICY "Artists can insert their own acceptance"
ON public.artist_agreement_acceptances
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = artist_id);

CREATE POLICY "Artists can view their own acceptances"
ON public.artist_agreement_acceptances
FOR SELECT
TO authenticated
USING (auth.uid() = artist_id);