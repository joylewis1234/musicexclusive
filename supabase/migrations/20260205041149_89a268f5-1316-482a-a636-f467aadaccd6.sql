-- Replace "always true" INSERT policy with a minimal validation check (still public)
-- to keep onboarding working while avoiding overly-permissive policy warnings.

DROP POLICY IF EXISTS "Anyone can insert artist applications" ON public.artist_applications;

CREATE POLICY "Anyone can insert artist applications"
ON public.artist_applications
AS PERMISSIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (
  agrees_terms = true
  AND owns_rights = true
  AND not_released_publicly = true
  AND artist_name IS NOT NULL AND length(trim(artist_name)) > 0
  AND contact_email IS NOT NULL AND length(trim(contact_email)) > 0
  AND follower_count IS NOT NULL AND follower_count >= 0
  AND years_releasing IS NOT NULL AND length(trim(years_releasing)) > 0
  AND genres IS NOT NULL AND length(trim(genres)) > 0
  AND primary_social_platform IS NOT NULL AND length(trim(primary_social_platform)) > 0
  AND social_profile_url IS NOT NULL AND length(trim(social_profile_url)) > 0
  AND song_sample_url IS NOT NULL AND length(trim(song_sample_url)) > 0
);
