-- Create table to store processed Stripe events for idempotency
CREATE TABLE public.stripe_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payload JSONB
);

-- Enable Row Level Security
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;

-- Only system/service role can insert (from edge functions)
CREATE POLICY "System can insert stripe events" 
ON public.stripe_events 
FOR INSERT 
WITH CHECK (true);

-- Only system can read (for idempotency checks)
CREATE POLICY "System can read stripe events" 
ON public.stripe_events 
FOR SELECT 
USING (true);

-- Add index for faster lookups
CREATE INDEX idx_stripe_events_processed_at ON public.stripe_events(processed_at DESC);