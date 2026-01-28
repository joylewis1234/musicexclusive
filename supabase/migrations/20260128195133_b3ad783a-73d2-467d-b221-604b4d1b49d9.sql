-- Drop existing policies on track_covers and track_audio buckets and recreate with proper permissions
DO $$
BEGIN
  -- Delete existing policies for track_covers
  DELETE FROM storage.objects WHERE bucket_id = 'track_covers' AND false; -- No-op, just for structure
  
  -- Delete existing policies for track_audio
  DELETE FROM storage.objects WHERE bucket_id = 'track_audio' AND false; -- No-op, just for structure
END $$;

-- Ensure buckets exist and are public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('track_covers', 'track_covers', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('track_audio', 'track_audio', true, 52428800, ARRAY['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3'])
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop and recreate RLS policies for track_covers
DROP POLICY IF EXISTS "Public read track_covers" ON storage.objects;
DROP POLICY IF EXISTS "Artists can upload track_covers" ON storage.objects;
DROP POLICY IF EXISTS "Artists can update track_covers" ON storage.objects;
DROP POLICY IF EXISTS "Artists can delete track_covers" ON storage.objects;

-- Drop and recreate RLS policies for track_audio
DROP POLICY IF EXISTS "Public read track_audio" ON storage.objects;
DROP POLICY IF EXISTS "Artists can upload track_audio" ON storage.objects;
DROP POLICY IF EXISTS "Artists can update track_audio" ON storage.objects;
DROP POLICY IF EXISTS "Artists can delete track_audio" ON storage.objects;

-- Create policies for track_covers bucket
CREATE POLICY "Public read track_covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'track_covers');

CREATE POLICY "Artists can upload track_covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'track_covers' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Artists can update track_covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'track_covers' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Artists can delete track_covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'track_covers' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policies for track_audio bucket
CREATE POLICY "Public read track_audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'track_audio');

CREATE POLICY "Artists can upload track_audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'track_audio' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Artists can update track_audio"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'track_audio' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Artists can delete track_audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'track_audio' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);