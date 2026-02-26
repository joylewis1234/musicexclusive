
-- 1. Add is_preview_public column to tracks
ALTER TABLE public.tracks ADD COLUMN is_preview_public boolean NOT NULL DEFAULT false;

-- 2. Function to list public preview tracks (limited columns, SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_public_preview_tracks()
RETURNS TABLE (
  id uuid,
  title text,
  artist_id text,
  genre text,
  artwork_url text,
  has_preview boolean,
  like_count integer,
  preview_start_seconds integer,
  artist_name text,
  artist_avatar_url text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    t.id,
    t.title,
    t.artist_id,
    t.genre,
    t.artwork_url,
    (t.preview_audio_key IS NOT NULL) AS has_preview,
    t.like_count,
    t.preview_start_seconds,
    pap.artist_name,
    pap.avatar_url AS artist_avatar_url
  FROM tracks t
  LEFT JOIN public_artist_profiles pap ON pap.id::text = t.artist_id
  WHERE t.status = 'ready'
    AND t.is_preview_public = true
  ORDER BY t.created_at DESC;
$$;

-- 3. Function to get ONLY the preview audio key for a single eligible track
CREATE OR REPLACE FUNCTION public.get_public_preview_audio_key(p_track_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT preview_audio_key
  FROM tracks
  WHERE id = p_track_id
    AND status = 'ready'
    AND is_preview_public = true
    AND preview_audio_key IS NOT NULL
  LIMIT 1;
$$;
