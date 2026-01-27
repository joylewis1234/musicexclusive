-- Add Stripe Connect fields to artist_profiles
ALTER TABLE public.artist_profiles 
ADD COLUMN stripe_account_id TEXT,
ADD COLUMN payout_status TEXT DEFAULT 'not_connected' CHECK (payout_status IN ('not_connected', 'pending', 'connected'));

-- Add index for faster lookups
CREATE INDEX idx_artist_profiles_stripe_account ON public.artist_profiles(stripe_account_id) WHERE stripe_account_id IS NOT NULL;