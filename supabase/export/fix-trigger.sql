-- ============================================================
-- Fix handle_new_user() Trigger to Handle Conflicts
-- Run this in Supabase SQL Editor
-- ============================================================
-- This updates the trigger function to use ON CONFLICT DO NOTHING
-- so it won't fail if a profile already exists
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Verify the function was updated
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';
