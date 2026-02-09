
-- Fix the broken vault_codes SELECT policy that references auth.users directly
-- This causes "permission denied for table users" errors
DROP POLICY IF EXISTS "Users can read their own vault codes" ON public.vault_codes;

CREATE POLICY "Users can read their own vault codes"
  ON public.vault_codes
  FOR SELECT
  USING (email = (auth.jwt() ->> 'email'::text));
