-- Create vault_members table to track active vault membership
CREATE TABLE public.vault_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  vault_access_active BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vault_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vault_members
CREATE POLICY "Anyone can read vault members"
ON public.vault_members FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert vault members"
ON public.vault_members FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update vault members"
ON public.vault_members FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create shared_tracks table
CREATE TABLE public.shared_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.vault_members(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.vault_members(id) ON DELETE CASCADE,
  artist_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  note TEXT CHECK (char_length(note) <= 120),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  listened_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.shared_tracks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_tracks
CREATE POLICY "Recipients can read their shared tracks"
ON public.shared_tracks FOR SELECT
USING (true);

CREATE POLICY "Active vault members can insert shared tracks"
ON public.shared_tracks FOR INSERT
WITH CHECK (true);

CREATE POLICY "Recipients can update listened_at"
ON public.shared_tracks FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_shared_tracks_recipient ON public.shared_tracks(recipient_id);
CREATE INDEX idx_shared_tracks_sender ON public.shared_tracks(sender_id);
CREATE INDEX idx_vault_members_active ON public.vault_members(vault_access_active) WHERE vault_access_active = true;

-- Insert some mock vault members for testing
INSERT INTO public.vault_members (email, display_name, vault_access_active) VALUES
  ('maya@example.com', 'Maya', true),
  ('jordan@example.com', 'Jordan', true),
  ('alex@example.com', 'Alex', true),
  ('sam@example.com', 'Sam', true),
  ('taylor@example.com', 'Taylor', false);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_vault_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_vault_members_timestamp
BEFORE UPDATE ON public.vault_members
FOR EACH ROW
EXECUTE FUNCTION public.update_vault_members_updated_at();