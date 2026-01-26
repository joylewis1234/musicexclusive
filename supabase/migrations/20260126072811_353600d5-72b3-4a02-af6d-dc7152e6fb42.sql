-- Create artist_profiles table for managing approved artist profiles
CREATE TABLE public.artist_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_name TEXT NOT NULL,
  bio TEXT,
  genre TEXT,
  avatar_url TEXT,
  instagram_url TEXT,
  tiktok_url TEXT,
  youtube_url TEXT,
  twitter_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;

-- Artists can view their own profile
CREATE POLICY "Artists can view their own profile"
ON public.artist_profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Artists can insert their own profile
CREATE POLICY "Artists can insert their own profile"
ON public.artist_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Artists can update their own profile
CREATE POLICY "Artists can update their own profile"
ON public.artist_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Fans can view all artist profiles (for discovery/artist pages)
CREATE POLICY "Anyone can view artist profiles"
ON public.artist_profiles
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_artist_profiles_updated_at
BEFORE UPDATE ON public.artist_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_vault_members_updated_at();

-- Create avatars bucket for artist images if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);