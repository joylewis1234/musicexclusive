-- Allow active Vault members (and the artist owner) to view artist profiles via the public_artist_profiles view
-- This fixes fan navigation to /artist/:artistId returning "Artist not found" due to RLS.

DROP POLICY IF EXISTS "Vault members can view artist profiles" ON public.artist_profiles;

CREATE POLICY "Vault members can view artist profiles"
ON public.artist_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.vault_members vm
    WHERE vm.email = (auth.jwt() ->> 'email')
      AND vm.vault_access_active = true
  )
);
