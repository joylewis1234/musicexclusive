
-- Create fan_playlists table
CREATE TABLE public.fan_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fan_id UUID NOT NULL,
  track_id UUID NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint: a fan can only add a track once
CREATE UNIQUE INDEX idx_fan_playlists_fan_track ON public.fan_playlists(fan_id, track_id);

-- Index for fast lookup by fan
CREATE INDEX idx_fan_playlists_fan_id ON public.fan_playlists(fan_id);

-- Enable RLS
ALTER TABLE public.fan_playlists ENABLE ROW LEVEL SECURITY;

-- Fans can view their own playlist
CREATE POLICY "Fans can view their own playlist"
ON public.fan_playlists
FOR SELECT
USING (fan_id IN (
  SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email'::text)
));

-- Fans can add to their own playlist
CREATE POLICY "Fans can add to their own playlist"
ON public.fan_playlists
FOR INSERT
WITH CHECK (fan_id IN (
  SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email'::text)
));

-- Fans can remove from their own playlist
CREATE POLICY "Fans can delete from their own playlist"
ON public.fan_playlists
FOR DELETE
USING (fan_id IN (
  SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email'::text)
));

-- Admins can view all playlists
CREATE POLICY "Admins can view all playlists"
ON public.fan_playlists
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Auto-cleanup trigger: when a track is disabled/deleted, remove from playlists
CREATE OR REPLACE FUNCTION public.cleanup_playlist_on_track_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status <> 'ready' THEN
    DELETE FROM public.fan_playlists WHERE track_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_cleanup_playlist_on_track_change
AFTER UPDATE OF status ON public.tracks
FOR EACH ROW
WHEN (OLD.status = 'ready' AND NEW.status <> 'ready')
EXECUTE FUNCTION public.cleanup_playlist_on_track_change();
