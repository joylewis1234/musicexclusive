-- Allow admins to view all artist profiles
CREATE POLICY "Admins can view all artist profiles"
ON public.artist_profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));