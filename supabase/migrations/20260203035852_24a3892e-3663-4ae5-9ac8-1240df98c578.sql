-- Create marketing_assets table
CREATE TABLE public.marketing_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES public.tracks(id) ON DELETE CASCADE,
  format text NOT NULL CHECK (format IN ('story', 'reel')),
  template_id text NOT NULL,
  promo_image_url text NOT NULL,
  chosen_caption text,
  badges text[], -- array of badge names used
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_marketing_assets_artist_id ON public.marketing_assets(artist_id);
CREATE INDEX idx_marketing_assets_created_at ON public.marketing_assets(created_at DESC);

-- Enable RLS
ALTER TABLE public.marketing_assets ENABLE ROW LEVEL SECURITY;

-- Artists can view their own marketing assets
CREATE POLICY "Artists can view their own marketing assets"
ON public.marketing_assets
FOR SELECT
USING (artist_id IN (
  SELECT id FROM artist_profiles WHERE user_id = auth.uid()
));

-- Artists can insert their own marketing assets
CREATE POLICY "Artists can insert their own marketing assets"
ON public.marketing_assets
FOR INSERT
WITH CHECK (artist_id IN (
  SELECT id FROM artist_profiles WHERE user_id = auth.uid()
));

-- Artists can delete their own marketing assets
CREATE POLICY "Artists can delete their own marketing assets"
ON public.marketing_assets
FOR DELETE
USING (artist_id IN (
  SELECT id FROM artist_profiles WHERE user_id = auth.uid()
));

-- Create storage bucket for marketing assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-assets', 'marketing-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for marketing-assets bucket
CREATE POLICY "Marketing assets are publicly readable"
ON storage.objects
FOR SELECT
USING (bucket_id = 'marketing-assets');

CREATE POLICY "Artists can upload their own marketing assets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'marketing-assets' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM artist_profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Artists can delete their own marketing assets"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'marketing-assets' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM artist_profiles WHERE user_id = auth.uid()
  )
);