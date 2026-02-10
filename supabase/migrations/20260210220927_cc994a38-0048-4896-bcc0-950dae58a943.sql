
-- A) Fix vault_members RLS: case-safe + null-safe

-- SELECT policy
DROP POLICY IF EXISTS "Users can read their own vault membership" ON public.vault_members;

CREATE POLICY "Users can read their own vault membership"
ON public.vault_members
FOR SELECT
TO authenticated
USING (
  (user_id = auth.uid())
  OR (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

-- Check if UPDATE policy exists and recreate
DROP POLICY IF EXISTS "Users can update their own vault membership" ON public.vault_members;
