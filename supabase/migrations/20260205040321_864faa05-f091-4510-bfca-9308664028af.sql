-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can insert artist applications" ON public.artist_applications;

-- Create a PERMISSIVE policy that allows anyone to insert
CREATE POLICY "Anyone can insert artist applications" 
ON public.artist_applications 
FOR INSERT 
TO public
WITH CHECK (true);