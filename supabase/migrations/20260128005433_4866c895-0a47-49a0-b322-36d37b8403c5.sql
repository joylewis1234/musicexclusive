-- Create track_likes table for fan likes
CREATE TABLE public.track_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  fan_id uuid NOT NULL REFERENCES public.vault_members(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(track_id, fan_id)
);

-- Enable RLS
ALTER TABLE public.track_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can read likes (for counting)
CREATE POLICY "Anyone can read track likes"
ON public.track_likes FOR SELECT
USING (true);

-- Vault members can insert their own likes
CREATE POLICY "Vault members can like tracks"
ON public.track_likes FOR INSERT
WITH CHECK (true);

-- Vault members can delete their own likes
CREATE POLICY "Vault members can unlike tracks"
ON public.track_likes FOR DELETE
USING (true);

-- Add index for faster like counts
CREATE INDEX idx_track_likes_track_id ON public.track_likes(track_id);
CREATE INDEX idx_track_likes_fan_id ON public.track_likes(fan_id);