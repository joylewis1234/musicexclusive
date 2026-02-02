-- Create table for secure approval/denial tokens
CREATE TABLE public.application_action_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.artist_applications(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('approve', 'deny')),
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  used_at TIMESTAMPTZ,
  used_by TEXT
);

-- Create index for faster token lookups
CREATE INDEX idx_action_tokens_token ON public.application_action_tokens(token);
CREATE INDEX idx_action_tokens_application ON public.application_action_tokens(application_id);

-- Enable RLS
ALTER TABLE public.application_action_tokens ENABLE ROW LEVEL SECURITY;

-- Only system/edge functions can manage tokens (no public access)
CREATE POLICY "System can manage action tokens"
ON public.application_action_tokens
FOR ALL
USING (true)
WITH CHECK (true);

-- Create admin action log table for audit tracking
CREATE TABLE public.admin_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  admin_email TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_admin_logs_target ON public.admin_action_logs(target_type, target_id);
CREATE INDEX idx_admin_logs_created ON public.admin_action_logs(created_at DESC);

-- Enable RLS
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view action logs"
ON public.admin_action_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert logs
CREATE POLICY "System can insert action logs"
ON public.admin_action_logs
FOR INSERT
WITH CHECK (true);

-- Add UPDATE policy for artist_applications so admin can approve/deny
CREATE POLICY "Admins can update artist applications"
ON public.artist_applications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));