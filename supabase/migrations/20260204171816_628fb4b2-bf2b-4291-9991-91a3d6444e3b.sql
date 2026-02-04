-- Create invitation_email_logs table for tracking sent invitations
CREATE TABLE public.invitation_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  admin_user_id uuid NOT NULL,
  invite_type text NOT NULL CHECK (invite_type IN ('email', 'dm')),
  artist_name text NOT NULL,
  artist_email text,
  artist_social_handle text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,
  sent_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.invitation_email_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view invitation logs"
  ON public.invitation_email_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Admins can insert logs
CREATE POLICY "Admins can insert invitation logs"
  ON public.invitation_email_logs
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service role can manage logs
CREATE POLICY "Service role can manage invitation logs"
  ON public.invitation_email_logs
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Create index for weekly reporting
CREATE INDEX idx_invitation_logs_created_at ON public.invitation_email_logs(created_at DESC);