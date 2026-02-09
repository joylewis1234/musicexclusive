-- Drop the security definer view and use a security invoker view instead
DROP VIEW IF EXISTS public.shareable_vault_members;

-- Add an RLS policy that allows any authenticated user to see id + display_name
-- of active vault members (the view will restrict which columns are visible)
CREATE POLICY "Authenticated users can see active vault member names"
ON public.vault_members
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND vault_access_active = true
);

-- Re-create the view with security_invoker=on so it respects RLS
CREATE VIEW public.shareable_vault_members
WITH (security_invoker = on) AS
SELECT id, display_name
FROM public.vault_members
WHERE vault_access_active = true;