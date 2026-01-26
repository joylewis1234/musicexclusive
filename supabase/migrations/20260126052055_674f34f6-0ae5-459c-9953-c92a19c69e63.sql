-- Add credits column to vault_members table
ALTER TABLE public.vault_members 
ADD COLUMN credits integer NOT NULL DEFAULT 0;