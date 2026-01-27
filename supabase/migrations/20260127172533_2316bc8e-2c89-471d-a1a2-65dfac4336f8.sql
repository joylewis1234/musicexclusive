-- Create payout_batches table for weekly artist earnings aggregation
CREATE TABLE public.payout_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_user_id UUID NOT NULL,
  week_start TIMESTAMP WITH TIME ZONE NOT NULL,
  week_end TIMESTAMP WITH TIME ZONE NOT NULL,
  total_credits INTEGER NOT NULL DEFAULT 0,
  total_usd NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  stripe_transfer_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure unique batch per artist per week
  CONSTRAINT unique_artist_week UNIQUE (artist_user_id, week_start)
);

-- Add payout_batch_id to credit_ledger to track which entries are batched
ALTER TABLE public.credit_ledger 
ADD COLUMN payout_batch_id UUID REFERENCES public.payout_batches(id);

-- Index for faster lookups
CREATE INDEX idx_payout_batches_artist ON public.payout_batches(artist_user_id);
CREATE INDEX idx_payout_batches_status ON public.payout_batches(status);
CREATE INDEX idx_payout_batches_week ON public.payout_batches(week_start);
CREATE INDEX idx_credit_ledger_unbatched ON public.credit_ledger(payout_batch_id) WHERE payout_batch_id IS NULL;

-- Enable RLS
ALTER TABLE public.payout_batches ENABLE ROW LEVEL SECURITY;

-- Artists can view their own payout batches
CREATE POLICY "Artists can view their own payout batches"
ON public.payout_batches FOR SELECT
USING (auth.uid() = artist_user_id);

-- System can insert/update payout batches (via service role)
CREATE POLICY "System can manage payout batches"
ON public.payout_batches FOR ALL
USING (true)
WITH CHECK (true);