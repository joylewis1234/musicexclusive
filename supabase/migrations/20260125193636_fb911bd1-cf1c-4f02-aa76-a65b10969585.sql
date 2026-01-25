-- Add new columns to vault_codes table
ALTER TABLE public.vault_codes 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 minutes'),
ADD COLUMN IF NOT EXISTS attempts_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMP WITH TIME ZONE;

-- Update existing rows to have expires_at if null
UPDATE public.vault_codes 
SET expires_at = issued_at + interval '30 minutes' 
WHERE expires_at IS NULL;