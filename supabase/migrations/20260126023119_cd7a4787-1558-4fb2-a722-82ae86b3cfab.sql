-- Create artist_applications table
CREATE TABLE public.artist_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Artist Info
  artist_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  country_city TEXT,
  
  -- Music & Career
  spotify_url TEXT,
  apple_music_url TEXT,
  years_releasing TEXT NOT NULL,
  genres TEXT NOT NULL,
  
  -- Fanbase
  primary_social_platform TEXT NOT NULL,
  social_profile_url TEXT NOT NULL,
  follower_count INTEGER NOT NULL,
  
  -- Music Quality
  song_sample_url TEXT NOT NULL,
  hook_preview_url TEXT,
  
  -- Rights Confirmation
  owns_rights BOOLEAN NOT NULL DEFAULT false,
  not_released_publicly BOOLEAN NOT NULL DEFAULT false,
  agrees_terms BOOLEAN NOT NULL DEFAULT false,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
);

-- Enable RLS
ALTER TABLE public.artist_applications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert applications (public form)
CREATE POLICY "Anyone can insert artist applications"
ON public.artist_applications
FOR INSERT
WITH CHECK (true);

-- Allow reading own application by email
CREATE POLICY "Anyone can read applications"
ON public.artist_applications
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_artist_applications_updated_at
BEFORE UPDATE ON public.artist_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_vault_members_updated_at();