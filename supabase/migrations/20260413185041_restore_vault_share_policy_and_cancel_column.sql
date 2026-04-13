-- Restore missing RLS policy: authenticated users can see active vault members
-- for sharing. This policy was lost from the live DB (same pattern as stream_ledger).
DROP POLICY IF EXISTS "Authenticated users can see active vault member names" ON public.vault_members;

CREATE POLICY "Authenticated users can see active vault member names"
ON public.vault_members
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND vault_access_active = true
);

-- Add missing subscription_cancel_at column (migration 20260320140000 exists but was never applied)
ALTER TABLE public.vault_members
ADD COLUMN IF NOT EXISTS subscription_cancel_at timestamptz DEFAULT NULL;
