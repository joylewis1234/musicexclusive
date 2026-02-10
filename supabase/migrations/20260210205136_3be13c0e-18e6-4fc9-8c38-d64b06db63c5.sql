
-- Create fan_invites table
CREATE TABLE public.fan_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  inviter_id TEXT NOT NULL,
  inviter_type TEXT NOT NULL CHECK (inviter_type IN ('artist', 'superfan')),
  invitee_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'used', 'expired', 'invalidated'))
);

-- Enable RLS
ALTER TABLE public.fan_invites ENABLE ROW LEVEL SECURITY;

-- Artists can view their own invites
CREATE POLICY "Artists can view own invites"
ON public.fan_invites
FOR SELECT
USING (inviter_id IN (
  SELECT id::text FROM public.artist_profiles WHERE user_id = auth.uid()
) AND inviter_type = 'artist');

-- Artists can insert their own invites
CREATE POLICY "Artists can create own invites"
ON public.fan_invites
FOR INSERT
WITH CHECK (inviter_id IN (
  SELECT id::text FROM public.artist_profiles WHERE user_id = auth.uid()
) AND inviter_type = 'artist');

-- Superfans can view their own invites
CREATE POLICY "Superfans can view own invites"
ON public.fan_invites
FOR SELECT
USING (inviter_id = auth.uid()::text AND inviter_type = 'superfan');

-- Service role / edge functions can do everything (no policy needed, they bypass RLS)

-- Allow public SELECT for invite validation (token lookup by unauthenticated users)
CREATE POLICY "Anyone can validate invite tokens"
ON public.fan_invites
FOR SELECT
USING (true);

-- Add Superfan fields to vault_members
ALTER TABLE public.vault_members
ADD COLUMN IF NOT EXISTS membership_type TEXT NOT NULL DEFAULT 'pay_as_you_go',
ADD COLUMN IF NOT EXISTS superfan_active BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS superfan_since TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS invite_token_used TEXT;

-- Index for fast token lookups
CREATE INDEX idx_fan_invites_token ON public.fan_invites (token);
CREATE INDEX idx_fan_invites_inviter ON public.fan_invites (inviter_id, inviter_type);
CREATE INDEX idx_fan_invites_created ON public.fan_invites (inviter_id, created_at);
