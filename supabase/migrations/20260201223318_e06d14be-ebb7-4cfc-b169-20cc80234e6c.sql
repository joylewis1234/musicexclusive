-- Recreate admin_stream_report_view to join vault_members by fan_id (not email)
-- This ensures fan display_name updates are immediately reflected everywhere

DROP VIEW IF EXISTS public.admin_stream_report_view;

CREATE VIEW public.admin_stream_report_view AS
SELECT 
    sl.id AS stream_id,
    sl.created_at,
    sl.fan_id,
    sl.fan_email,
    -- Use fan_id join to vault_members for current display_name; fallback to email prefix
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
LEFT JOIN tracks t ON t.id = sl.track_id
LEFT JOIN artist_profiles ap ON ap.id::text = sl.artist_id
LEFT JOIN vault_members vm ON vm.id = sl.fan_id;