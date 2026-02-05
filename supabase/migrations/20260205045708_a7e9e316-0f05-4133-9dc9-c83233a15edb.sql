-- Fix public insert access for artist applications
-- Root cause: INSERT policy exists, but table-level GRANTs for anon/authenticated are missing.

BEGIN;

-- Ensure roles can access the schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Allow the application form (logged out or logged in) to insert/read as needed
GRANT INSERT, SELECT ON TABLE public.artist_applications TO anon, authenticated;

-- Ask API layer to reload schema/privileges cache
NOTIFY pgrst, 'reload schema';

COMMIT;