-- Remove dangerous public write policies on the legacy 'audio' bucket
-- These allow anyone (unauthenticated) to upload, update, and delete files

DROP POLICY IF EXISTS "Anyone can upload audio files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update audio files" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete audio files" ON storage.objects;