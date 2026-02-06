-- Add auth_user_id column to artist_applications to permanently link application to auth user
ALTER TABLE public.artist_applications 
ADD COLUMN IF NOT EXISTS auth_user_id UUID DEFAULT NULL;

-- Create index for fast lookups by auth_user_id
CREATE INDEX IF NOT EXISTS idx_artist_applications_auth_user_id 
ON public.artist_applications (auth_user_id) 
WHERE auth_user_id IS NOT NULL;

-- Allow service role to update auth_user_id (already covered by existing admin UPDATE policy)
-- No new RLS policies needed since admins and service_role can already update artist_applications