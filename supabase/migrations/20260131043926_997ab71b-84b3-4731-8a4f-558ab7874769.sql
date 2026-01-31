-- Create table for artist agreement acceptances
CREATE TABLE public.artist_agreement_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID NOT NULL,
  agreement_version TEXT NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(artist_id, agreement_version)
);

-- Enable Row Level Security
ALTER TABLE public.artist_agreement_acceptances ENABLE ROW LEVEL SECURITY;

-- Artists can insert their own acceptance
CREATE POLICY "Artists can insert their own acceptance"
ON public.artist_agreement_acceptances
FOR INSERT
WITH CHECK (auth.uid() = artist_id);

-- Artists can view their own acceptances
CREATE POLICY "Artists can view their own acceptances"
ON public.artist_agreement_acceptances
FOR SELECT
USING (auth.uid() = artist_id);

-- Add index for faster lookups
CREATE INDEX idx_artist_agreement_acceptances_artist_id 
ON public.artist_agreement_acceptances(artist_id);