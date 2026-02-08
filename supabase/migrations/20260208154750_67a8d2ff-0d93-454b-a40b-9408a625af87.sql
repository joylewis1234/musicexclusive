
-- Remove the 30-minute default expiry on vault_codes.expires_at
-- Vault codes are now permanent and tied to fan identity
ALTER TABLE public.vault_codes ALTER COLUMN expires_at SET DEFAULT NULL;

-- Update any existing unexpired codes to have no expiry (make them permanent)
UPDATE public.vault_codes SET expires_at = NULL WHERE expires_at IS NOT NULL AND used_at IS NULL;
