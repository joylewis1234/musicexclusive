-- Create email_logs table for tracking email sends
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  application_id UUID REFERENCES public.artist_applications(id),
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  resend_id TEXT,
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all email logs
CREATE POLICY "Admins can view all email logs"
ON public.email_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Service role can insert/update email logs
CREATE POLICY "Service role can manage email logs"
ON public.email_logs
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Create index for faster lookups by application
CREATE INDEX idx_email_logs_application_id ON public.email_logs(application_id);
CREATE INDEX idx_email_logs_recipient ON public.email_logs(recipient_email);