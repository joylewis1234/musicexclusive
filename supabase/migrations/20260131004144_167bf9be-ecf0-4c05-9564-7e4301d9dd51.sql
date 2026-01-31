-- Fix the tracks UPDATE policy with proper type casting
-- artist_id is TEXT but stores UUID values, auth.uid() returns UUID

DROP POLICY IF EXISTS "Artists can update their own tracks" ON public.tracks;

CREATE POLICY "Artists can update their own tracks"
  ON public.tracks
  FOR UPDATE
  TO authenticated
  USING (artist_id = auth.uid()::text)
  WITH CHECK (artist_id = auth.uid()::text);