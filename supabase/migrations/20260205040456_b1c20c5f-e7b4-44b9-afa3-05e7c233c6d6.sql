-- Fix all RESTRICTIVE INSERT policies to be PERMISSIVE

-- agreement_acceptances
DROP POLICY IF EXISTS "Anyone can insert agreement acceptances" ON public.agreement_acceptances;
CREATE POLICY "Anyone can insert agreement acceptances" ON public.agreement_acceptances 
FOR INSERT TO public WITH CHECK (true);

-- artist_agreement_acceptances
DROP POLICY IF EXISTS "Artists can insert their own acceptance" ON public.artist_agreement_acceptances;
CREATE POLICY "Artists can insert their own acceptance" ON public.artist_agreement_acceptances 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = artist_id);

-- artist_profiles
DROP POLICY IF EXISTS "Artists can insert their own profile" ON public.artist_profiles;
CREATE POLICY "Artists can insert their own profile" ON public.artist_profiles 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- fan_terms_acceptances
DROP POLICY IF EXISTS "Fans can insert their own acceptance" ON public.fan_terms_acceptances;
CREATE POLICY "Fans can insert their own acceptance" ON public.fan_terms_acceptances 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- marketing_assets
DROP POLICY IF EXISTS "Artists can insert their own marketing assets" ON public.marketing_assets;
CREATE POLICY "Artists can insert their own marketing assets" ON public.marketing_assets 
FOR INSERT TO authenticated WITH CHECK (
  artist_id IN (SELECT id FROM artist_profiles WHERE user_id = auth.uid())
);

-- profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- shared_tracks
DROP POLICY IF EXISTS "Users can share tracks as themselves" ON public.shared_tracks;
CREATE POLICY "Users can share tracks as themselves" ON public.shared_tracks 
FOR INSERT TO authenticated WITH CHECK (
  sender_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email'))
);

-- track_likes
DROP POLICY IF EXISTS "Users can like tracks as themselves" ON public.track_likes;
CREATE POLICY "Users can like tracks as themselves" ON public.track_likes 
FOR INSERT TO authenticated WITH CHECK (
  fan_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email'))
);

-- tracks
DROP POLICY IF EXISTS "Artists can insert their own tracks" ON public.tracks;
CREATE POLICY "Artists can insert their own tracks" ON public.tracks 
FOR INSERT TO authenticated WITH CHECK (
  (auth.uid() IS NOT NULL) 
  AND (artist_id = (SELECT email FROM auth.users WHERE id = auth.uid())::text) 
  AND (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'artist'))
);

-- user_roles
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;
CREATE POLICY "System can insert roles" ON public.user_roles 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);