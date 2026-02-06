-- Add approval metadata columns to artist_applications
ALTER TABLE public.artist_applications
  ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_application_id uuid;

-- Index for fast lookup by auth_user_id (may already exist)
CREATE INDEX IF NOT EXISTS idx_artist_applications_auth_user_id
  ON public.artist_applications(auth_user_id);

-- Unique partial index: one auth user can only be linked to one application
CREATE UNIQUE INDEX IF NOT EXISTS idx_artist_applications_unique_auth_user
  ON public.artist_applications(auth_user_id)
  WHERE auth_user_id IS NOT NULL;