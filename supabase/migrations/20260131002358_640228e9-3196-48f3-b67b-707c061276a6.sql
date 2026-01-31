-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view artist profiles" ON public.artist_profiles;

-- Create a public view that only exposes non-sensitive fields
CREATE OR REPLACE VIEW public.public_artist_profiles AS
SELECT 
  id,
  user_id,
  artist_name,
  bio,
  genre,
  avatar_url,
  instagram_url,
  tiktok_url,
  youtube_url,
  twitter_url,
  created_at,
  updated_at
FROM public.artist_profiles;

-- Grant access to the view for all users (including anonymous)
GRANT SELECT ON public.public_artist_profiles TO anon, authenticated;

-- Keep only the policy that allows artists to view their own FULL profile (with stripe info)
-- The existing "Artists can view their own profile" policy already handles this