-- Create artist_invitations table
CREATE TABLE public.artist_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by_admin_id uuid NOT NULL,
  artist_name text NOT NULL,
  artist_email text,
  artist_social_handle text,
  platform text NOT NULL CHECK (platform IN ('email', 'dm')),
  status text NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'sent', 'applied', 'approved', 'denied')),
  notes text,
  apply_link text NOT NULL
);

-- Enable RLS
ALTER TABLE public.artist_invitations ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage invitations"
ON public.artist_invitations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Service role can manage invitations (for reports)
CREATE POLICY "Service role can manage invitations"
ON public.artist_invitations
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);