
-- Create fan_waitlist table for Founding Superfan signups
CREATE TABLE public.fan_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name TEXT NOT NULL,
  email TEXT NOT NULL,
  favorite_genre TEXT,
  favorite_artist TEXT,
  status TEXT NOT NULL DEFAULT 'lifetime_reserved',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint on email to prevent duplicates
CREATE UNIQUE INDEX fan_waitlist_email_unique ON public.fan_waitlist (email);

-- Enable RLS
ALTER TABLE public.fan_waitlist ENABLE ROW LEVEL SECURITY;

-- Admins can view
CREATE POLICY "Admins can view fan waitlist"
ON public.fan_waitlist FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert
CREATE POLICY "Service role can insert fan waitlist"
ON public.fan_waitlist FOR INSERT
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Service role can read
CREATE POLICY "Service role can read fan waitlist"
ON public.fan_waitlist FOR SELECT
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Admins can update
CREATE POLICY "Admins can update fan waitlist"
ON public.fan_waitlist FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Service role can update
CREATE POLICY "Service role can update fan waitlist"
ON public.fan_waitlist FOR UPDATE
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);
