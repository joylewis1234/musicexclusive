
-- Allow recipients to delete their received shared tracks
CREATE POLICY "Recipients can delete their received tracks"
ON public.shared_tracks
FOR DELETE
USING (recipient_id IN (
  SELECT vault_members.id FROM vault_members
  WHERE vault_members.email = (auth.jwt() ->> 'email'::text)
));

-- Allow recipients to delete their received shared artist profiles
CREATE POLICY "Recipients can delete their received artist profiles"
ON public.shared_artist_profiles
FOR DELETE
USING (recipient_id IN (
  SELECT vault_members.id FROM vault_members
  WHERE vault_members.email = (auth.jwt() ->> 'email'::text)
));
