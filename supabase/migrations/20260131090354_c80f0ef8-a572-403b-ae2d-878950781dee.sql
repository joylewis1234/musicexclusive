-- Fix stream_ledger RLS policy: artist_id is artist_profiles.id, not auth.uid()
DROP POLICY IF EXISTS "Artists can view their own track streams" ON public.stream_ledger;

CREATE POLICY "Artists can view their own track streams"
ON public.stream_ledger
FOR SELECT
USING (
  artist_id IN (
    SELECT id::text FROM public.artist_profiles WHERE user_id = auth.uid()
  )
);

-- Also fix tracks RLS policy for update (artist_id is artist_profiles.id)
DROP POLICY IF EXISTS "Artists can update their own tracks" ON public.tracks;

CREATE POLICY "Artists can update their own tracks"
ON public.tracks
FOR UPDATE
USING (
  artist_id IN (
    SELECT id::text FROM public.artist_profiles WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  artist_id IN (
    SELECT id::text FROM public.artist_profiles WHERE user_id = auth.uid()
  )
);