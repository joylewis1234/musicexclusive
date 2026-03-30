-- Align fan_playlists RLS with vault_members: JWT email casing and user_id must not block
-- legitimate inserts/selects. Also stop removing playlist rows when a track temporarily
-- leaves `ready` (e.g. processing); only clear playlists when a track is disabled.

-- ── RLS: case-insensitive vault_members match + user_id (same idea as vault_members policies) ──

DROP POLICY IF EXISTS "Fans can view their own playlist" ON public.fan_playlists;
DROP POLICY IF EXISTS "Fans can add to their own playlist" ON public.fan_playlists;
DROP POLICY IF EXISTS "Fans can delete from their own playlist" ON public.fan_playlists;

CREATE POLICY "Fans can view their own playlist"
ON public.fan_playlists
FOR SELECT
USING (
  fan_id IN (
    SELECT vm.id
    FROM public.vault_members vm
    WHERE vm.user_id = auth.uid()
       OR lower(vm.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

CREATE POLICY "Fans can add to their own playlist"
ON public.fan_playlists
FOR INSERT
WITH CHECK (
  fan_id IN (
    SELECT vm.id
    FROM public.vault_members vm
    WHERE vm.user_id = auth.uid()
       OR lower(vm.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

CREATE POLICY "Fans can delete from their own playlist"
ON public.fan_playlists
FOR DELETE
USING (
  fan_id IN (
    SELECT vm.id
    FROM public.vault_members vm
    WHERE vm.user_id = auth.uid()
       OR lower(vm.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

-- ── Playlist cleanup: only when track becomes disabled (not ready → processing/uploading) ──

DROP TRIGGER IF EXISTS trg_cleanup_playlist_on_track_change ON public.tracks;

CREATE OR REPLACE FUNCTION public.cleanup_playlist_on_track_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'disabled' THEN
    DELETE FROM public.fan_playlists WHERE track_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_cleanup_playlist_on_track_change
AFTER UPDATE OF status ON public.tracks
FOR EACH ROW
WHEN (NEW.status = 'disabled' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.cleanup_playlist_on_track_change();

COMMENT ON FUNCTION public.cleanup_playlist_on_track_change() IS
  'Removes fan_playlists rows when a track is disabled. Transitions away from ready (e.g. processing) no longer wipe playlists.';
