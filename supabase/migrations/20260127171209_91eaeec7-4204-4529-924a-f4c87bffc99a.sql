-- Create credit ledger table for tracking all credit transactions
CREATE TABLE public.credit_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CREDITS_PURCHASE', 'CREDITS_USED', 'CREDITS_REFUND', 'SUBSCRIPTION_CREDITS')),
  credits_delta INTEGER NOT NULL,
  usd_delta NUMERIC(10, 2) NOT NULL,
  reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

-- Create policies for ledger access
CREATE POLICY "Users can view their own ledger entries" 
ON public.credit_ledger 
FOR SELECT 
USING (true);

CREATE POLICY "System can insert ledger entries" 
ON public.credit_ledger 
FOR INSERT 
WITH CHECK (true);

-- Add index for faster lookups by email
CREATE INDEX idx_credit_ledger_email ON public.credit_ledger(user_email);
CREATE INDEX idx_credit_ledger_created_at ON public.credit_ledger(created_at DESC);