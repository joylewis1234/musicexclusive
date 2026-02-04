-- Drop the existing SECURITY DEFINER view and recreate it as SECURITY INVOKER
-- Then add RLS to restrict access to admins only

-- First, drop the existing view
DROP VIEW IF EXISTS public.admin_stream_report_view;

-- Recreate the view as SECURITY INVOKER (default, explicit for clarity)
CREATE VIEW public.admin_stream_report_view 
WITH (security_invoker = true)
AS
SELECT 
    sl.id AS stream_id,
    sl.created_at,
    sl.fan_id,
    sl.fan_email,
    COALESCE(vm.display_name, split_part(sl.fan_email, '@'::text, 1)) AS fan_display_name,
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
FROM stream_ledger sl
LEFT JOIN tracks t ON (t.id = sl.track_id)
LEFT JOIN artist_profiles ap ON ((ap.id)::text = sl.artist_id)
LEFT JOIN vault_members vm ON (vm.id = sl.fan_id);