-- Create a secure view that exposes only id and display_name of active vault members
-- This allows fans to find other vault members to share tracks with,
-- without exposing sensitive fields like email or credits.
CREATE VIEW public.shareable_vault_members
WITH (security_invoker = off) AS
SELECT id, display_name
FROM public.vault_members
WHERE vault_access_active = true;