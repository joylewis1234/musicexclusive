
-- Create artist_waitlist table
CREATE TABLE public.artist_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_name text NOT NULL,
  email text NOT NULL,
  instagram text,
  other_social text,
  genre text,
  monthly_listeners text,
  location text NOT NULL,
  music_link text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid
);

-- Unique constraint on email to prevent duplicate applications
CREATE UNIQUE INDEX idx_artist_waitlist_email ON public.artist_waitlist (lower(email));

-- Enable RLS
ALTER TABLE public.artist_waitlist ENABLE ROW LEVEL SECURITY;

-- SELECT: admin + service_role
CREATE POLICY "Admins can view waitlist"
  ON public.artist_waitlist FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can read waitlist"
  ON public.artist_waitlist FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'service_role');

-- INSERT: service_role only
CREATE POLICY "Service role can insert waitlist"
  ON public.artist_waitlist FOR INSERT
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- UPDATE: admin + service_role
CREATE POLICY "Admins can update waitlist"
  ON public.artist_waitlist FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can update waitlist"
  ON public.artist_waitlist FOR UPDATE
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
