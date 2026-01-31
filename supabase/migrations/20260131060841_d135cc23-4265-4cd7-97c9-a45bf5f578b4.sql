-- Create report_email_logs table for tracking email delivery
CREATE TABLE public.report_email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date DATE NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'daily',
  recipient_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.report_email_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all logs
CREATE POLICY "Admins can view report logs"
ON public.report_email_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Policy: System can insert logs
CREATE POLICY "System can insert report logs"
ON public.report_email_logs
FOR INSERT
WITH CHECK (true);

-- Policy: System can update logs
CREATE POLICY "System can update report logs"
ON public.report_email_logs
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create index for efficient querying
CREATE INDEX idx_report_email_logs_date ON public.report_email_logs(report_date DESC);
CREATE INDEX idx_report_email_logs_status ON public.report_email_logs(status);