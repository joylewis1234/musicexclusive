
-- STEP 1: Create trigger function to ensure artist_id is derived from track
CREATE OR REPLACE FUNCTION public.ensure_stream_artist_id()
RETURNS TRIGGER AS $$
DECLARE
  track_artist_id text;
BEGIN
  -- Get the artist_id from the track
  SELECT artist_id INTO track_artist_id
  FROM public.tracks
  WHERE id = NEW.track_id;
  
  -- If track exists and has an artist_id, use it
  IF track_artist_id IS NOT NULL THEN
    NEW.artist_id := track_artist_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on stream_ledger
DROP TRIGGER IF EXISTS trigger_ensure_stream_artist_id ON public.stream_ledger;
CREATE TRIGGER trigger_ensure_stream_artist_id
  BEFORE INSERT OR UPDATE ON public.stream_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_stream_artist_id();

-- STEP 2: Backfill existing stream_ledger rows with correct artist_id from tracks
UPDATE public.stream_ledger sl
SET artist_id = t.artist_id
FROM public.tracks t
WHERE sl.track_id = t.id
  AND sl.artist_id != t.artist_id;

-- STEP 3: Create unified admin reporting view
DROP VIEW IF EXISTS public.admin_stream_report_view;
CREATE VIEW public.admin_stream_report_view
WITH (security_invoker = on) AS
SELECT 
  sl.id AS stream_id,
  sl.created_at,
  sl.fan_id,
  sl.fan_email,
  COALESCE(vm.display_name, split_part(sl.fan_email, '@', 1)) AS fan_display_name,
  sl.track_id,
  t.title AS track_title,
  t.album AS track_album,
  sl.artist_id,
  COALESCE(ap.artist_name, sl.artist_id) AS artist_name,
  ap.id AS artist_profile_id,
  ap.user_id AS artist_user_id,
  sl.credits_spent,
  sl.amount_total,
  sl.amount_artist,
  sl.amount_platform,
  sl.payout_status,
  sl.payout_batch_id
FROM public.stream_ledger sl
LEFT JOIN public.tracks t ON t.id = sl.track_id
LEFT JOIN public.artist_profiles ap ON ap.id::text = sl.artist_id
LEFT JOIN public.vault_members vm ON vm.email = sl.fan_email;

-- Grant access to the view
GRANT SELECT ON public.admin_stream_report_view TO authenticated;

-- Enable RLS on the view (views with security_invoker respect base table RLS)
COMMENT ON VIEW public.admin_stream_report_view IS 'Unified admin stream report view for consistent reporting';
