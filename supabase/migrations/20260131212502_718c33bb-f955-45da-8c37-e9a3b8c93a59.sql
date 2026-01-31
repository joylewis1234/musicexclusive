-- Add new columns to payout_batches for gross/fee/net breakdown
ALTER TABLE public.payout_batches 
ADD COLUMN IF NOT EXISTS total_gross numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_platform_fee numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_artist_net numeric NOT NULL DEFAULT 0;

-- Create artist_payouts table for per-artist breakdown within a batch
CREATE TABLE IF NOT EXISTS public.artist_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_batch_id uuid NOT NULL REFERENCES public.payout_batches(id) ON DELETE CASCADE,
  artist_id uuid NOT NULL,
  gross_amount numeric NOT NULL DEFAULT 0,
  platform_fee_amount numeric NOT NULL DEFAULT 0,
  artist_net_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  stripe_transfer_id text,
  stripe_payout_id text,
  failure_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(payout_batch_id, artist_id)
);

-- Enable RLS on artist_payouts
ALTER TABLE public.artist_payouts ENABLE ROW LEVEL SECURITY;

-- Artists can view their own payouts
CREATE POLICY "Artists can view their own payouts"
ON public.artist_payouts
FOR SELECT
USING (
  artist_id IN (
    SELECT id FROM artist_profiles WHERE user_id = auth.uid()
  )
);

-- Admins can view all payouts
CREATE POLICY "Admins can view all artist payouts"
ON public.artist_payouts
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can manage artist payouts (for edge functions)
CREATE POLICY "System can manage artist payouts"
ON public.artist_payouts
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_artist_payouts_batch ON public.artist_payouts(payout_batch_id);
CREATE INDEX IF NOT EXISTS idx_artist_payouts_artist ON public.artist_payouts(artist_id);
CREATE INDEX IF NOT EXISTS idx_artist_payouts_status ON public.artist_payouts(status);

-- Add index on stream_ledger for payout batch lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_stream_ledger_payout_batch ON public.stream_ledger(payout_batch_id);