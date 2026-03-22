-- Restore artist self-read access for artist-issued fan invites.
-- This keeps invite visibility scoped to the authenticated artist who owns the
-- matching artist_profiles row and does not widen access to superfan invites.

DROP POLICY IF EXISTS "Artists can view own invites" ON public.fan_invites;

CREATE POLICY "Artists can view own invites"
ON public.fan_invites
FOR SELECT
TO authenticated
USING (
  inviter_type = 'artist'
  AND EXISTS (
    SELECT 1
    FROM public.artist_profiles ap
    WHERE ap.id::text = fan_invites.inviter_id
      AND ap.user_id = auth.uid()
  )
);
