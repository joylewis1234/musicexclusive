-- Ensure track_audio bucket exists with correct settings
INSERT INTO storage.buckets (id, name, public)
VALUES ('track_audio', 'track_audio', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Anyone can view track audio" ON storage.objects;
DROP POLICY IF EXISTS "Artists can upload track audio" ON storage.objects;
DROP POLICY IF EXISTS "Artists can update their track audio" ON storage.objects;
DROP POLICY IF EXISTS "Artists can delete their track audio" ON storage.objects;

-- Public read access for track audio
CREATE POLICY "Anyone can view track audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'track_audio');

-- Authenticated users can upload to track_audio bucket
CREATE POLICY "Artists can upload track audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'track_audio'
);

-- Authenticated users can update their own files
CREATE POLICY "Artists can update their track audio"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'track_audio');

-- Authenticated users can delete their own files
CREATE POLICY "Artists can delete their track audio"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'track_audio');