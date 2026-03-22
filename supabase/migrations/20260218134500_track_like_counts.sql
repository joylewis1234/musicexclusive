-- Track like counts + restricted track_likes reads

ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

UPDATE public.tracks t
SET like_count = (
  SELECT count(*)::int FROM public.track_likes tl
  WHERE tl.track_id = t.id
);

CREATE OR REPLACE FUNCTION public.update_track_like_count()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tracks SET like_count = like_count + 1 WHERE id = NEW.track_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tracks SET like_count = like_count - 1 WHERE id = OLD.track_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_track_like_count ON public.track_likes;
CREATE TRIGGER trg_track_like_count
  AFTER INSERT OR DELETE ON public.track_likes
  FOR EACH ROW
  EXECUTE PROCEDURE public.update_track_like_count();

DROP POLICY IF EXISTS "Anyone can read track likes" ON public.track_likes;
DROP POLICY IF EXISTS "Users can read their own likes" ON public.track_likes;
CREATE POLICY "Users can read their own likes"
  ON public.track_likes
  FOR SELECT
  USING (
    (auth.jwt() ->> 'role') = 'service_role'
    OR has_role(auth.uid(), 'admin'::app_role)
    OR fan_id IN (
      SELECT id FROM public.vault_members
      WHERE email = (auth.jwt() ->> 'email')
    )
  );
