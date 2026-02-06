
-- Create app_error_logs table for global error tracking
CREATE TABLE public.app_error_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page TEXT NOT NULL,
  user_id UUID,
  error_message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_error_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all error logs
CREATE POLICY "Admins can view all error logs"
ON public.app_error_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Any authenticated user can insert error logs (for their own errors)
CREATE POLICY "Authenticated users can insert error logs"
ON public.app_error_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));

-- Allow anonymous inserts for pre-auth errors (page, error_message only)
CREATE POLICY "Anonymous users can insert error logs"
ON public.app_error_logs
FOR INSERT
WITH CHECK (user_id IS NULL);
