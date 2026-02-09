
-- Create table for sharing artist profiles between fans
CREATE TABLE public.shared_artist_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES public.vault_members(id),
  recipient_id UUID NOT NULL REFERENCES public.vault_members(id),
  artist_profile_id UUID NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  viewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.shared_artist_profiles ENABLE ROW LEVEL SECURITY;

-- Senders can insert as themselves
CREATE POLICY "Users can share artist profiles as themselves"
ON public.shared_artist_profiles
FOR INSERT
WITH CHECK (
  sender_id IN (
    SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email'::text)
  )
);

-- Users can read shares they sent or received
CREATE POLICY "Users can read their shared artist profiles"
ON public.shared_artist_profiles
FOR SELECT
USING (
  sender_id IN (
    SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email'::text)
  )
  OR
  recipient_id IN (
    SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email'::text)
  )
);

-- Recipients can update (mark as viewed)
CREATE POLICY "Recipients can update their received artist profiles"
ON public.shared_artist_profiles
FOR UPDATE
USING (
  recipient_id IN (
    SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email'::text)
  )
)
WITH CHECK (
  recipient_id IN (
    SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email'::text)
  )
);

-- Admins can view all
CREATE POLICY "Admins can view all shared artist profiles"
ON public.shared_artist_profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));
