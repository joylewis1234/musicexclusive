-- Create fan terms acceptances table
CREATE TABLE public.fan_terms_acceptances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  agreement_type TEXT NOT NULL DEFAULT 'fan_terms',
  version TEXT NOT NULL DEFAULT 'MVP_v1',
  accepted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.fan_terms_acceptances ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Fans can insert their own acceptance"
ON public.fan_terms_acceptances
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Fans can view their own acceptances"
ON public.fan_terms_acceptances
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_fan_terms_acceptances_user_id ON public.fan_terms_acceptances(user_id);