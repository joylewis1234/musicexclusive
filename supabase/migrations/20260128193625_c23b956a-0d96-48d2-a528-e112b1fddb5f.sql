-- Create track_covers bucket for cover art images
INSERT INTO storage.buckets (id, name, public)
VALUES ('track_covers', 'track_covers', true)
ON CONFLICT (id) DO NOTHING;

-- Create track_audio bucket for audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('track_audio', 'track_audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for track_covers bucket

-- Allow anyone to view cover art
CREATE POLICY "Anyone can view track covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'track_covers');

-- Allow authenticated artists to upload cover art
CREATE POLICY "Artists can upload track covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'track_covers' 
  AND auth.role() = 'authenticated'
);

-- Allow artists to update their own cover art
CREATE POLICY "Artists can update their track covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'track_covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow artists to delete their own cover art
CREATE POLICY "Artists can delete their track covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'track_covers' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policies for track_audio bucket

-- Allow anyone to view/stream audio
CREATE POLICY "Anyone can view track audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'track_audio');

-- Allow authenticated artists to upload audio
CREATE POLICY "Artists can upload track audio"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'track_audio' 
  AND auth.role() = 'authenticated'
);

-- Allow artists to update their own audio
CREATE POLICY "Artists can update their track audio"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'track_audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow artists to delete their own audio
CREATE POLICY "Artists can delete their track audio"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'track_audio' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);