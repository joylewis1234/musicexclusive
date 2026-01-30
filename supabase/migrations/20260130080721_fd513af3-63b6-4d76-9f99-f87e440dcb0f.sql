-- Add tutorial_completed field to artist_profiles table
ALTER TABLE public.artist_profiles 
ADD COLUMN IF NOT EXISTS tutorial_completed boolean DEFAULT false;