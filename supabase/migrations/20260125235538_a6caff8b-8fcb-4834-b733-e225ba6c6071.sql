-- Create tracks table with full and preview audio URLs
CREATE TABLE public.tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id TEXT NOT NULL,
  title TEXT NOT NULL,
  album TEXT,
  duration INTEGER NOT NULL DEFAULT 180,
  full_audio_url TEXT,
  preview_audio_url TEXT,
  artwork_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (discovery is public)
CREATE POLICY "Anyone can read tracks"
ON public.tracks
FOR SELECT
USING (true);

-- Allow inserts for MVP (in production, would be artist-only)
CREATE POLICY "Anyone can insert tracks"
ON public.tracks
FOR INSERT
WITH CHECK (true);

-- Allow updates for MVP
CREATE POLICY "Anyone can update tracks"
ON public.tracks
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_tracks_updated_at
BEFORE UPDATE ON public.tracks
FOR EACH ROW
EXECUTE FUNCTION public.update_vault_members_updated_at();

-- Create storage bucket for audio files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('audio', 'audio', true, 52428800); -- 50MB limit

-- Storage policies for audio bucket
CREATE POLICY "Audio files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'audio');

CREATE POLICY "Anyone can upload audio files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'audio');

CREATE POLICY "Anyone can update audio files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'audio');

CREATE POLICY "Anyone can delete audio files"
ON storage.objects FOR DELETE
USING (bucket_id = 'audio');

-- Insert sample tracks with preview URLs (using placeholder/sample audio)
INSERT INTO public.tracks (artist_id, title, album, duration, preview_audio_url, full_audio_url) VALUES
('nova', 'Midnight Protocol', 'Digital Dreams', 234, NULL, NULL),
('nova', 'Neon Pulse', 'Digital Dreams', 198, NULL, NULL),
('aura', 'Velvet Skies', 'Ethereal', 198, NULL, NULL),
('aura', 'Golden Hour', 'Ethereal', 212, NULL, NULL),
('echo', 'Lost Frequency', 'Signals', 267, NULL, NULL),
('pulse', 'Street Dreams', 'Urban Legends', 245, NULL, NULL),
('drift', 'Ocean Waves', 'Horizons', 189, NULL, NULL),
('vega', 'Starlight', 'Cosmic Pop', 203, NULL, NULL),
('zenith', 'Bass Drop', 'Electric Nights', 178, NULL, NULL),
('luna', 'Blue Notes', 'Midnight Jazz', 312, NULL, NULL);