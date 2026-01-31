-- Drop and recreate the view with SECURITY INVOKER (safer)
DROP VIEW IF EXISTS public.public_artist_profiles;

CREATE VIEW public.public_artist_profiles 
WITH (security_invoker = true)
AS
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

-- Grant access to the view
GRANT SELECT ON public.public_artist_profiles TO anon, authenticated;