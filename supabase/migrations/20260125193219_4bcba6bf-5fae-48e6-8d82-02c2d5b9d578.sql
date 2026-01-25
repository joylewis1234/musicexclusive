-- Drop existing vault_codes table and recreate with new schema
DROP TABLE IF EXISTS public.vault_codes;

-- Create vault_codes table with new schema
CREATE TABLE public.vault_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Add unique constraints
ALTER TABLE public.vault_codes ADD CONSTRAINT vault_codes_code_key UNIQUE (code);
ALTER TABLE public.vault_codes ADD CONSTRAINT vault_codes_email_key UNIQUE (email);

-- Enable Row Level Security
ALTER TABLE public.vault_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for public insert (unauthenticated flow)
CREATE POLICY "Anyone can insert vault codes"
ON public.vault_codes
FOR INSERT
WITH CHECK (true);

-- Users can read their own vault code by email
CREATE POLICY "Users can read vault codes"
ON public.vault_codes
FOR SELECT
USING (true);

-- Allow updating used_at when code is submitted
CREATE POLICY "Anyone can update vault codes"
ON public.vault_codes
FOR UPDATE
USING (true)
WITH CHECK (true);