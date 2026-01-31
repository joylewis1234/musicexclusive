-- Fix overly permissive INSERT policy on tracks table
DROP POLICY IF EXISTS "Anyone can insert tracks" ON public.tracks;
CREATE POLICY "Artists can insert their own tracks" ON public.tracks
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  artist_id = (SELECT email FROM auth.users WHERE id = auth.uid())::text AND
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'artist'
  )
);

-- Fix overly permissive UPDATE policy on tracks table
DROP POLICY IF EXISTS "Anyone can update tracks" ON public.tracks;
CREATE POLICY "Artists can update their own tracks" ON public.tracks
FOR UPDATE
USING (
  artist_id = (SELECT email FROM auth.users WHERE id = auth.uid())::text
)
WITH CHECK (
  artist_id = (SELECT email FROM auth.users WHERE id = auth.uid())::text
);