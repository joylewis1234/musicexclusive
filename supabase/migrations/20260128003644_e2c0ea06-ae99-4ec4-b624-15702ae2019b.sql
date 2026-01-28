-- Add preview_start_seconds column to tracks table
-- This stores the start time in seconds for the 15-second preview
ALTER TABLE public.tracks 
ADD COLUMN IF NOT EXISTS preview_start_seconds integer NOT NULL DEFAULT 0;

-- Add a comment for clarity
COMMENT ON COLUMN public.tracks.preview_start_seconds IS 'Start time in seconds for the 15-second preview clip';