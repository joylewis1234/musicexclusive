-- Add upload status to tracks to support DB-first upload workflow
ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ready';

-- Optional: allow quick filtering by status
CREATE INDEX IF NOT EXISTS idx_tracks_status ON public.tracks (status);