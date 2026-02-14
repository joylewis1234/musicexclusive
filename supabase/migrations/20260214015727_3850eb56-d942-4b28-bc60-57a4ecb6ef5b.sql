
-- Add exclusivity tracking columns to tracks table
ALTER TABLE public.tracks 
ADD COLUMN IF NOT EXISTS exclusivity_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS exclusivity_decision text DEFAULT NULL;

-- Backfill existing tracks: set exclusivity_expires_at to created_at + 21 days
UPDATE public.tracks 
SET exclusivity_expires_at = created_at + interval '21 days'
WHERE exclusivity_expires_at IS NULL;

-- Set default for new tracks
ALTER TABLE public.tracks 
ALTER COLUMN exclusivity_expires_at SET DEFAULT (now() + interval '21 days');

-- Add a comment for clarity
COMMENT ON COLUMN public.tracks.exclusivity_decision IS 'NULL = not yet decided, keep = staying on platform, deleted = removed by artist';
