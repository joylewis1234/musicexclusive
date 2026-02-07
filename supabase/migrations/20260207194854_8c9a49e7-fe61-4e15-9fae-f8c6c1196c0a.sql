
-- Clean up old/conflicting storage policies for track_audio and track_covers
-- Keep only the correct artist_profiles.id-based policies + the broad read policies

-- Drop old uid-based INSERT policies (path expects auth.uid() as first folder — wrong)
DROP POLICY IF EXISTS "Artists can upload track_audio" ON storage.objects;
DROP POLICY IF EXISTS "Artists can upload track_covers" ON storage.objects;

-- Drop old uid-based UPDATE policies  
DROP POLICY IF EXISTS "Artists can update track_audio" ON storage.objects;
DROP POLICY IF EXISTS "Artists can update track_covers" ON storage.objects;

-- Drop old uid-based DELETE policies
DROP POLICY IF EXISTS "Artists can delete track_audio" ON storage.objects;
DROP POLICY IF EXISTS "Artists can delete track_covers" ON storage.objects;

-- Drop the overly-broad legacy policies that don't check ownership
DROP POLICY IF EXISTS "Artists can upload track audio" ON storage.objects;
DROP POLICY IF EXISTS "Artists can upload track covers" ON storage.objects;
DROP POLICY IF EXISTS "Artists can delete their track audio" ON storage.objects;
DROP POLICY IF EXISTS "Artists can delete their track covers" ON storage.objects;
DROP POLICY IF EXISTS "Artists can update their track audio" ON storage.objects;
DROP POLICY IF EXISTS "Artists can update their track covers" ON storage.objects;

-- The correct policies that match the upload path (artists/{artistId}/...) already exist:
-- "Artists insert track_audio" — checks foldername[1]='artists' AND foldername[2] IN artist_profiles.id
-- "Artists insert track_covers" — same pattern
-- "Artists update track_audio" — same pattern
-- "Artists update track_covers" — same pattern
-- "Artists delete track_audio" — same pattern
-- "Artists delete track_covers" — same pattern
-- "Anyone can view track audio" — public read
-- "Anyone can view track covers" — public read
