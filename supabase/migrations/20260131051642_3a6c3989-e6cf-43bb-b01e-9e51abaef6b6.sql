-- Add status column to vault_codes table for tracking win/lose state
ALTER TABLE public.vault_codes 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Add next_draw_date for automatic re-entry
ALTER TABLE public.vault_codes 
ADD COLUMN IF NOT EXISTS next_draw_date TIMESTAMP WITH TIME ZONE;

-- Update existing rows to have 'pending' status
UPDATE public.vault_codes SET status = 'pending' WHERE status IS NULL;

-- Create index for status lookups
CREATE INDEX IF NOT EXISTS idx_vault_codes_status ON public.vault_codes(status);
CREATE INDEX IF NOT EXISTS idx_vault_codes_email_status ON public.vault_codes(email, status);