
-- STEP 1: Add nullable user_id column to vault_members
ALTER TABLE public.vault_members ADD COLUMN IF NOT EXISTS user_id uuid NULL;

-- Add index for fast lookups
CREATE INDEX IF NOT EXISTS idx_vault_members_user_id ON public.vault_members(user_id);

-- STEP 3: Update RLS policies for dual ownership (user_id OR email)
-- Drop and recreate the user-facing SELECT policy to support both
DROP POLICY IF EXISTS "Users can read their own vault membership" ON public.vault_members;
CREATE POLICY "Users can read their own vault membership"
ON public.vault_members
FOR SELECT
USING (
  (user_id = auth.uid())
  OR
  (email = (auth.jwt() ->> 'email'::text))
);
