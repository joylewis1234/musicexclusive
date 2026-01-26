-- Add genre column to tracks table for filtering
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS genre TEXT;

-- Update existing tracks with genres based on artist
UPDATE public.tracks SET genre = 'Electronic' WHERE artist_id = 'nova';
UPDATE public.tracks SET genre = 'R&B' WHERE artist_id = 'aura';
UPDATE public.tracks SET genre = 'Indie' WHERE artist_id = 'echo';
UPDATE public.tracks SET genre = 'Hip-Hop' WHERE artist_id = 'pulse';
UPDATE public.tracks SET genre = 'Afrobeats' WHERE artist_id = 'drift';
UPDATE public.tracks SET genre = 'Pop' WHERE artist_id = 'vega';
UPDATE public.tracks SET genre = 'EDM' WHERE artist_id = 'zenith';
UPDATE public.tracks SET genre = 'Jazz' WHERE artist_id = 'luna';