-- Fix tracks INSERT RLS policy: must use artist_profiles.id (UUID) instead of user email
-- The upload code inserts artist_id = artist_profiles.id, so the RLS must match.

-- Drop the broken INSERT policy
DROP POLICY IF EXISTS "Artists can insert their own tracks" ON public.tracks;

-- Create the corrected INSERT policy using artist_profiles.id
CREATE POLICY "Artists can insert their own tracks"
ON public.tracks
FOR INSERT
WITH CHECK (
  (auth.uid() IS NOT NULL)
  AND (artist_id IN (
    SELECT (artist_profiles.id)::text
    FROM artist_profiles
    WHERE artist_profiles.user_id = auth.uid()
  ))
  AND (EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'artist'::app_role
  ))
);

-- Fix tracks DELETE RLS policy: must also use artist_profiles.id
DROP POLICY IF EXISTS "Artists can delete their own tracks" ON public.tracks;

CREATE POLICY "Artists can delete their own tracks"
ON public.tracks
FOR DELETE
USING (
  artist_id IN (
    SELECT (artist_profiles.id)::text
    FROM artist_profiles
    WHERE artist_profiles.user_id = auth.uid()
  )
);