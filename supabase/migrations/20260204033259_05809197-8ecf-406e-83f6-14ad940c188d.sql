-- Create RPC function to get fan's top artists by like count
CREATE OR REPLACE FUNCTION public.get_fan_top_artists(p_fan_id uuid, p_limit integer DEFAULT 5)
RETURNS TABLE (
  artist_id uuid,
  artist_name text,
  avatar_url text,
  like_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    pap.id AS artist_id,
    pap.artist_name,
    pap.avatar_url,
    COUNT(tl.id) AS like_count
  FROM track_likes tl
  INNER JOIN tracks t ON t.id = tl.track_id
  INNER JOIN public_artist_profiles pap ON pap.id::text = t.artist_id
  WHERE tl.fan_id = p_fan_id
  GROUP BY pap.id, pap.artist_name, pap.avatar_url
  ORDER BY like_count DESC
  LIMIT p_limit
$$;