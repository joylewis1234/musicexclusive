-- Grant INSERT permission to anon and authenticated roles on artist_applications
-- RLS policies cannot work without underlying table grants

GRANT INSERT ON public.artist_applications TO anon;
GRANT INSERT ON public.artist_applications TO authenticated;

-- Also grant SELECT for reading back the inserted row (used by .select().single())
GRANT SELECT ON public.artist_applications TO anon;
GRANT SELECT ON public.artist_applications TO authenticated;