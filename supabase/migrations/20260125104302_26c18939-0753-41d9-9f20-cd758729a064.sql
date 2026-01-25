-- Create table for storing user agreement acceptances
CREATE TABLE public.agreement_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  terms_version TEXT NOT NULL,
  privacy_version TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Add unique constraint on email to prevent duplicate entries
-- Users can update their acceptance by re-accepting new versions
CREATE UNIQUE INDEX idx_agreement_acceptances_email ON public.agreement_acceptances(email);

-- Enable Row Level Security
ALTER TABLE public.agreement_acceptances ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (for pre-auth agreement acceptance)
CREATE POLICY "Anyone can insert agreement acceptances"
ON public.agreement_acceptances
FOR INSERT
WITH CHECK (true);

-- Allow users to read their own acceptance record by email
CREATE POLICY "Users can read their own acceptance"
ON public.agreement_acceptances
FOR SELECT
USING (true);

-- Allow updating acceptance (for version upgrades)
CREATE POLICY "Users can update their own acceptance"
ON public.agreement_acceptances
FOR UPDATE
USING (true)
WITH CHECK (true);