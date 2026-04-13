-- Tighten shared_tracks INSERT policy to verify track ownership.
-- Previously, any vault member could insert a shared_tracks row with
-- arbitrary track_id and artist_id values. This adds a subquery check
-- to ensure the referenced track actually exists and belongs to the
-- specified artist.

DROP POLICY IF EXISTS "Users can share tracks as themselves" ON public.shared_tracks;
CREATE POLICY "Users can share tracks as themselves" ON public.shared_tracks
FOR INSERT TO authenticated WITH CHECK (
  sender_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email'))
  AND EXISTS (
    SELECT 1 FROM public.tracks
    WHERE tracks.id = shared_tracks.track_id
      AND tracks.artist_id = shared_tracks.artist_id
  )
);
