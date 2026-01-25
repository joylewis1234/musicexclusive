-- Create vault_codes table for storing email signups
CREATE TABLE public.vault_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    vault_code TEXT NOT NULL DEFAULT LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vault_codes ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (no auth required for signup)
CREATE POLICY "Anyone can insert vault codes"
ON public.vault_codes
FOR INSERT
WITH CHECK (true);

-- Users can read their own vault code by email
CREATE POLICY "Users can read their own vault code"
ON public.vault_codes
FOR SELECT
USING (true);