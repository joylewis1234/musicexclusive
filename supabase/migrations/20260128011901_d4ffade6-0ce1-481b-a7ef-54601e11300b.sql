-- Add DELETE policy for tracks table so artists can delete their own tracks
CREATE POLICY "Artists can delete their own tracks" 
ON public.tracks 
FOR DELETE 
USING (artist_id = (SELECT email FROM auth.users WHERE id = auth.uid()));