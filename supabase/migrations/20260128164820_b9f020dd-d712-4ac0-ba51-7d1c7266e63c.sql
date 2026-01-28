-- Add storage policies for the audio bucket to allow authenticated uploads

-- Allow authenticated users to upload files to the audio bucket
CREATE POLICY "Authenticated users can upload audio files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'audio');

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update their own audio files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[2]);

-- Allow public read access to audio files (bucket is already public)
CREATE POLICY "Public can read audio files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'audio');

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own audio files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'audio' AND auth.uid()::text = (storage.foldername(name))[2]);