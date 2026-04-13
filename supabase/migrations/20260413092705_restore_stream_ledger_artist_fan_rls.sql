-- Restore missing RLS policies on stream_ledger for artist and fan SELECT access.
-- The artist and fan policies were lost (likely replaced via Dashboard/Lovable).
-- Current state: only "Admins can view stream ledger" and "Service role can manage stream ledger" exist.
-- This causes the artist earnings dashboard to show $0 even when stream data exists.

-- Artist policy: artists can view streams where artist_id matches their artist_profiles.id
DROP POLICY IF EXISTS "Artists can view their own track streams" ON public.stream_ledger;

CREATE POLICY "Artists can view their own track streams"
ON public.stream_ledger
FOR SELECT
USING (
  artist_id IN (
    SELECT id::text FROM public.artist_profiles WHERE user_id = auth.uid()
  )
);

-- Fan policy: fans can view their own stream history
DROP POLICY IF EXISTS "Fans can view their own streams" ON public.stream_ledger;

CREATE POLICY "Fans can view their own streams"
ON public.stream_ledger
FOR SELECT
USING (fan_id = auth.uid());
