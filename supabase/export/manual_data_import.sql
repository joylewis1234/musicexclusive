-- ============================================================
-- Manual Data Import for Lovable Cloud Migration
-- Based on data summary provided by Lovable
-- ============================================================
-- IMPORTANT: 
-- 1. Run full-schema.sql FIRST
-- 2. Create auth users FIRST (see recreate-auth-users.js)
-- 3. Then run this file
-- 4. Update user_id foreign keys after auth users are created
-- ============================================================

SET session_replication_role = 'replica';

-- ============================================================
-- vault_members (4 rows)
-- ============================================================
-- Note: user_id will need to be updated after auth users are created
INSERT INTO vault_members (email, display_name, credits, vault_access_active, membership_type) VALUES
('demo-fan@test.com', 'Demo Fan', 214, true, 'pay_as_you_go'),
('joylewismusic+testdemo1@gmail.com', 'joylewismusic+testdemo1', 0, false, 'pay_as_you_go'),
('support@musicexclusive.co', 'support@musicexclusive.co', 0, true, 'pay_as_you_go'),
('test-artist+validation@example.com', 'test-artist+validation', 0, false, 'pay_as_you_go')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- user_roles (6 rows)
-- ============================================================
-- Note: user_id will need to be updated after auth users are created
-- These will be created automatically by triggers, but you can add manually:
-- support@musicexclusive.co → admin
-- joylewismusic+testdemo1@gmail.com → artist + fan
-- test-artist+validation@example.com → artist + fan
-- demo-fan@test.com → fan

-- ============================================================
-- artist_profiles (2 rows)
-- ============================================================
-- Note: user_id and id will need to be updated after auth users are created
-- Joy Lewis - Demo Artist (id: 435b37fd) — R&B, Stripe connected, avatar uploaded, US
-- Validation Artist (id: b5ce51ad) — Test genre, no Stripe, no avatar
-- 
-- You'll need to insert these after creating auth users and getting their IDs

-- ============================================================
-- tracks (13 rows)
-- ============================================================
-- 6 ready tracks: Turn me up now, It's Still You, It's You, Say Less, For Life, Still You
-- 7 disabled tracks (old/duplicate uploads)
-- All by Joy Lewis or Validation Artist, genre R&B
--
-- You'll need to insert these after artist_profiles are created
-- The track data includes: title, genre, status, artist_id, etc.

-- ============================================================
-- Other tables with data
-- ============================================================
-- credit_ledger (148 rows) - Financial transactions
-- stream_ledger (51 rows) - Stream records
-- stream_charges (51 rows) - Idempotency records
-- stripe_events (20 rows) - Processed webhooks
-- artist_waitlist (13 rows) - Real applicants
-- fan_waitlist (1 row) - Dalonna Rogers
-- artist_invitations (7 rows)
-- fan_invites (12 rows)
-- agreement_acceptances (1)
-- artist_agreement_acceptances (3)
-- charts_bonus_cycles (2)
-- track_likes (2)
-- playback_sessions (39)
-- playback_tokens (39)
-- admin_action_logs (42)
-- email_logs (2)
-- report_email_logs (16)
-- invitation_email_logs (4)
-- application_action_tokens (6)
-- request_rate_limits (18)

-- ============================================================
-- After running this, you'll need to:
-- ============================================================
-- 1. Update vault_members.user_id to match new auth.users.id
-- 2. Update artist_profiles.user_id to match new auth.users.id  
-- 3. Update all foreign keys that reference user_id or artist_id
-- 4. Insert tracks with correct artist_id references
-- 5. Insert financial data (credit_ledger, stream_ledger, etc.)

SET session_replication_role = 'origin';
