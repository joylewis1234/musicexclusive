-- Create stream_ledger table for detailed stream tracking
CREATE TABLE public.stream_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fan_id UUID NOT NULL,
  fan_email TEXT NOT NULL,
  artist_id TEXT NOT NULL,
  track_id UUID NOT NULL,
  credits_spent INTEGER NOT NULL DEFAULT 1,
  amount_total NUMERIC NOT NULL DEFAULT 0.20,
  amount_artist NUMERIC NOT NULL DEFAULT 0.10,
  amount_platform NUMERIC NOT NULL DEFAULT 0.10,
  payout_status TEXT NOT NULL DEFAULT 'pending',
  payout_batch_id UUID REFERENCES public.payout_batches(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stream_ledger ENABLE ROW LEVEL SECURITY;

-- Policy: System can insert stream entries
CREATE POLICY "System can insert stream entries"
ON public.stream_ledger
FOR INSERT
WITH CHECK (true);

-- Policy: Admins can view all stream entries (for reporting)
CREATE POLICY "Admins can view all stream entries"
ON public.stream_ledger
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: Artists can view streams of their own tracks
CREATE POLICY "Artists can view their own track streams"
ON public.stream_ledger
FOR SELECT
USING (artist_id = auth.uid()::text);

-- Policy: Fans can view their own streams
CREATE POLICY "Fans can view their own streams"
ON public.stream_ledger
FOR SELECT
USING (fan_id = auth.uid());

-- Create indexes for efficient querying
CREATE INDEX idx_stream_ledger_fan_id ON public.stream_ledger(fan_id);
CREATE INDEX idx_stream_ledger_artist_id ON public.stream_ledger(artist_id);
CREATE INDEX idx_stream_ledger_track_id ON public.stream_ledger(track_id);
CREATE INDEX idx_stream_ledger_created_at ON public.stream_ledger(created_at DESC);
CREATE INDEX idx_stream_ledger_payout_status ON public.stream_ledger(payout_status);