-- ============================================================
-- MusicExclusive — Consolidated Database Schema
-- Generated: 2026-03-14
-- 
-- Run this in a fresh Supabase project's SQL Editor.
-- Prerequisites: Supabase project with default auth.users table.
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('fan', 'artist', 'admin');

-- ============================================================
-- 2. TABLES
-- ============================================================

-- admin_action_logs
CREATE TABLE public.admin_action_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  admin_email text,
  details jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- agreement_acceptances
CREATE TABLE public.agreement_acceptances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  name text NOT NULL,
  terms_version text NOT NULL,
  privacy_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

-- app_error_logs
CREATE TABLE public.app_error_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page text NOT NULL,
  user_id uuid,
  error_message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- application_action_tokens
CREATE TABLE public.application_action_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id uuid NOT NULL,
  action_type text NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + '7 days'::interval),
  used_at timestamptz,
  used_by text,
  CONSTRAINT application_action_tokens_action_type_check CHECK (action_type = ANY (ARRAY['approve','deny']))
);

-- artist_agreement_acceptances
CREATE TABLE public.artist_agreement_acceptances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id uuid NOT NULL,
  agreement_version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  legal_name text,
  artist_name text,
  pdf_storage_key text,
  signed_at timestamptz DEFAULT now(),
  UNIQUE (artist_id, agreement_version)
);

-- artist_applications
CREATE TABLE public.artist_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_name text NOT NULL,
  contact_email text NOT NULL,
  genres text NOT NULL,
  years_releasing text NOT NULL,
  follower_count integer NOT NULL,
  primary_social_platform text NOT NULL,
  social_profile_url text NOT NULL,
  song_sample_url text NOT NULL,
  hook_preview_url text,
  apple_music_url text,
  spotify_url text,
  country_city text,
  agrees_terms boolean NOT NULL DEFAULT false,
  not_released_publicly boolean NOT NULL DEFAULT false,
  owns_rights boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  approved_application_id uuid,
  approved_by uuid,
  approved_at timestamptz,
  auth_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- artist_invitations
CREATE TABLE public.artist_invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_name text NOT NULL,
  platform text NOT NULL,
  apply_link text NOT NULL,
  artist_social_handle text,
  artist_email text,
  notes text,
  status text NOT NULL DEFAULT 'generated',
  created_by_admin_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT artist_invitations_platform_check CHECK (platform = ANY (ARRAY['email','dm'])),
  CONSTRAINT artist_invitations_status_check CHECK (status = ANY (ARRAY['generated','sent','applied','approved','denied']))
);

-- artist_profiles
CREATE TABLE public.artist_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  artist_name text NOT NULL,
  bio text,
  genre text,
  avatar_url text,
  instagram_url text,
  tiktok_url text,
  youtube_url text,
  twitter_url text,
  country_code text,
  stripe_account_id text,
  payout_status text DEFAULT 'not_connected',
  tutorial_completed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT artist_profiles_payout_status_check CHECK (payout_status = ANY (ARRAY['not_connected','pending','connected']))
);

-- artist_waitlist
CREATE TABLE public.artist_waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_name text NOT NULL,
  email text NOT NULL,
  location text NOT NULL,
  music_link text NOT NULL,
  genre text,
  instagram text,
  monthly_listeners text,
  other_social text,
  status text NOT NULL DEFAULT 'pending',
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- vault_members (created early — referenced by others)
CREATE TABLE public.vault_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  display_name text NOT NULL,
  credits integer NOT NULL DEFAULT 0,
  vault_access_active boolean NOT NULL DEFAULT false,
  membership_type text NOT NULL DEFAULT 'pay_as_you_go',
  superfan_active boolean NOT NULL DEFAULT false,
  superfan_since timestamptz,
  invite_token_used text,
  user_id uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT credits_non_negative CHECK (credits >= 0)
);

-- tracks
CREATE TABLE public.tracks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id text NOT NULL,
  title text NOT NULL,
  album text,
  genre text,
  duration integer NOT NULL DEFAULT 0,
  artwork_url text,
  artwork_key text,
  full_audio_url text,
  full_audio_key text,
  preview_audio_url text,
  preview_audio_key text,
  preview_start_seconds integer NOT NULL DEFAULT 0,
  is_preview_public boolean NOT NULL DEFAULT false,
  like_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  exclusivity_decision text,
  exclusivity_expires_at timestamptz,
  processing_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- bonus_milestones
CREATE TABLE public.bonus_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id uuid NOT NULL REFERENCES public.artist_profiles(id),
  milestone integer NOT NULL,
  prize_usd numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reached_at timestamptz,
  paid_at timestamptz,
  payout_batch_id uuid,
  disqualified_at timestamptz,
  disqualified_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artist_id, milestone)
);

-- payout_batches
CREATE TABLE public.payout_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_user_id uuid NOT NULL,
  week_start timestamptz NOT NULL,
  week_end timestamptz NOT NULL,
  total_credits integer NOT NULL DEFAULT 0,
  total_usd numeric NOT NULL DEFAULT 0,
  total_gross numeric NOT NULL DEFAULT 0,
  total_platform_fee numeric NOT NULL DEFAULT 0,
  total_artist_net numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  stripe_transfer_id text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payout_batches_status_check CHECK (status = ANY (ARRAY['pending','approved','processing','partial','paid','failed']))
);

-- charts_bonus_cycles
CREATE TABLE public.charts_bonus_cycles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id uuid NOT NULL REFERENCES public.artist_profiles(id),
  genre text NOT NULL,
  cycle_year integer NOT NULL,
  cumulative_streams bigint NOT NULL DEFAULT 0,
  rank integer,
  prize_usd numeric,
  status text NOT NULL DEFAULT 'active',
  payout_batch_id uuid REFERENCES public.payout_batches(id),
  paid_at timestamptz,
  disqualified_at timestamptz,
  disqualified_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (artist_id, genre, cycle_year)
);

-- credit_ledger
CREATE TABLE public.credit_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email text NOT NULL,
  type text NOT NULL,
  credits_delta integer NOT NULL,
  usd_delta numeric NOT NULL,
  reference text NOT NULL,
  payout_batch_id uuid REFERENCES public.payout_batches(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT credit_ledger_type_check CHECK (type = ANY (ARRAY['CREDITS_PURCHASE','SUBSCRIPTION_CREDITS','STREAM_DEBIT','ARTIST_EARNING','PLATFORM_EARNING','PAYOUT'])),
  UNIQUE (reference, type, user_email)
);

-- email_logs
CREATE TABLE public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email_type text NOT NULL,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  resend_id text,
  error_message text,
  application_id uuid REFERENCES public.artist_applications(id),
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- fan_invites
CREATE TABLE public.fan_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  inviter_id text NOT NULL,
  inviter_type text NOT NULL,
  token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'unused',
  invitee_email text,
  expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fan_invites_inviter_type_check CHECK (inviter_type = ANY (ARRAY['artist','superfan'])),
  CONSTRAINT fan_invites_status_check CHECK (status = ANY (ARRAY['unused','used','expired','invalidated']))
);

-- fan_playlists
CREATE TABLE public.fan_playlists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fan_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES public.tracks(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- fan_terms_acceptances
CREATE TABLE public.fan_terms_acceptances (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  agreement_type text NOT NULL DEFAULT 'fan_terms',
  version text NOT NULL DEFAULT 'MVP_v1',
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);

-- fan_waitlist
CREATE TABLE public.fan_waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name text NOT NULL,
  email text NOT NULL UNIQUE,
  favorite_genre text,
  favorite_artist text,
  status text NOT NULL DEFAULT 'lifetime_reserved',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- invitation_email_logs
CREATE TABLE public.invitation_email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id uuid NOT NULL,
  artist_name text NOT NULL,
  invite_type text NOT NULL,
  artist_email text,
  artist_social_handle text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invitation_email_logs_invite_type_check CHECK (invite_type = ANY (ARRAY['email','dm'])),
  CONSTRAINT invitation_email_logs_status_check CHECK (status = ANY (ARRAY['pending','sent','failed']))
);

-- marketing_assets
CREATE TABLE public.marketing_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES public.tracks(id),
  template_id text NOT NULL,
  format text NOT NULL,
  promo_image_url text NOT NULL,
  badges text[],
  chosen_caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT marketing_assets_format_check CHECK (format = ANY (ARRAY['story','reel']))
);

-- monitoring_events
CREATE TABLE public.monitoring_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name text NOT NULL,
  event_type text NOT NULL,
  status integer NOT NULL,
  latency_ms integer,
  conflict boolean NOT NULL DEFAULT false,
  retry_count integer NOT NULL DEFAULT 0,
  contention_count integer NOT NULL DEFAULT 0,
  ledger_written boolean,
  stage text,
  error_code text,
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- artist_payouts
CREATE TABLE public.artist_payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id uuid NOT NULL,
  payout_batch_id uuid NOT NULL REFERENCES public.payout_batches(id),
  gross_amount numeric NOT NULL DEFAULT 0,
  platform_fee_amount numeric NOT NULL DEFAULT 0,
  artist_net_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  stripe_transfer_id text,
  stripe_payout_id text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payout_batch_id, artist_id)
);

-- playback_sessions
CREATE TABLE public.playback_sessions (
  session_id uuid NOT NULL PRIMARY KEY,
  user_id uuid NOT NULL,
  track_id uuid NOT NULL REFERENCES public.tracks(id),
  watermark_id text,
  ip_address text,
  user_agent text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- stream_charges
CREATE TABLE public.stream_charges (
  stream_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fan_email text NOT NULL,
  track_id uuid NOT NULL,
  idempotency_key text UNIQUE,
  stream_ledger_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- stream_ledger
CREATE TABLE public.stream_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fan_id uuid NOT NULL,
  fan_email text NOT NULL,
  artist_id text NOT NULL,
  track_id uuid NOT NULL,
  credits_spent integer NOT NULL DEFAULT 0,
  amount_total numeric NOT NULL DEFAULT 0,
  amount_artist numeric NOT NULL DEFAULT 0,
  amount_platform numeric NOT NULL DEFAULT 0,
  payout_status text NOT NULL DEFAULT 'pending',
  payout_batch_id uuid REFERENCES public.payout_batches(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- playback_tokens
CREATE TABLE public.playback_tokens (
  token_id uuid NOT NULL PRIMARY KEY,
  stream_id uuid NOT NULL REFERENCES public.stream_charges(stream_id),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- stripe_events
CREATE TABLE public.stripe_events (
  id text NOT NULL PRIMARY KEY,
  event_type text NOT NULL,
  payload jsonb,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- track_likes
CREATE TABLE public.track_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  track_id uuid NOT NULL REFERENCES public.tracks(id),
  fan_id uuid NOT NULL REFERENCES public.vault_members(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (track_id, fan_id)
);

-- profiles
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  display_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- user_roles
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- vault_codes
CREATE TABLE public.vault_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts_count integer DEFAULT 0,
  last_attempt_at timestamptz,
  next_draw_date timestamptz,
  expires_at timestamptz,
  used_at timestamptz,
  issued_at timestamptz NOT NULL DEFAULT now()
);

-- report_email_logs
CREATE TABLE public.report_email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type text NOT NULL DEFAULT 'daily',
  report_date date NOT NULL,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- request_rate_limits
CREATE TABLE public.request_rate_limits (
  id bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  key text NOT NULL,
  endpoint text NOT NULL,
  window_start timestamptz NOT NULL,
  count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key, endpoint, window_start)
);

-- shared_artist_profiles
CREATE TABLE public.shared_artist_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES public.vault_members(id),
  recipient_id uuid NOT NULL REFERENCES public.vault_members(id),
  artist_profile_id uuid NOT NULL,
  note text,
  viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- shared_tracks
CREATE TABLE public.shared_tracks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL REFERENCES public.vault_members(id),
  recipient_id uuid NOT NULL REFERENCES public.vault_members(id),
  track_id uuid NOT NULL,
  artist_id text NOT NULL,
  note text,
  listened_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT shared_tracks_note_check CHECK (char_length(note) <= 120)
);

-- Add deferred FK: application_action_tokens -> artist_applications
ALTER TABLE public.application_action_tokens
  ADD CONSTRAINT application_action_tokens_application_id_fkey
  FOREIGN KEY (application_id) REFERENCES public.artist_applications(id);

-- Add deferred FK: bonus_milestones -> payout_batches
ALTER TABLE public.bonus_milestones
  ADD CONSTRAINT bonus_milestones_payout_batch_id_fkey
  FOREIGN KEY (payout_batch_id) REFERENCES public.payout_batches(id);

-- ============================================================
-- 3. INDEXES (non-primary-key, non-unique-constraint)
-- ============================================================
CREATE INDEX idx_admin_logs_created ON public.admin_action_logs (created_at DESC);
CREATE INDEX idx_admin_logs_target ON public.admin_action_logs (target_type, target_id);
CREATE UNIQUE INDEX idx_agreement_acceptances_email ON public.agreement_acceptances (email);
CREATE INDEX idx_action_tokens_application ON public.application_action_tokens (application_id);
CREATE INDEX idx_action_tokens_token ON public.application_action_tokens (token);
CREATE INDEX idx_artist_agreement_acceptances_artist_id ON public.artist_agreement_acceptances (artist_id);
CREATE UNIQUE INDEX artist_applications_contact_email_unique ON public.artist_applications (lower(contact_email));
CREATE INDEX idx_artist_applications_auth_user_id ON public.artist_applications (auth_user_id) WHERE (auth_user_id IS NOT NULL);
CREATE UNIQUE INDEX idx_artist_applications_unique_auth_user ON public.artist_applications (auth_user_id) WHERE (auth_user_id IS NOT NULL);
CREATE UNIQUE INDEX artist_payouts_transfer_unique ON public.artist_payouts (stripe_transfer_id) WHERE (stripe_transfer_id IS NOT NULL);
CREATE INDEX idx_artist_payouts_artist ON public.artist_payouts (artist_id);
CREATE INDEX idx_artist_payouts_batch ON public.artist_payouts (payout_batch_id);
CREATE INDEX idx_artist_payouts_status ON public.artist_payouts (status);
CREATE INDEX idx_artist_profiles_stripe_account ON public.artist_profiles (stripe_account_id) WHERE (stripe_account_id IS NOT NULL);
CREATE UNIQUE INDEX idx_artist_waitlist_email ON public.artist_waitlist (lower(email));
CREATE INDEX idx_bonus_milestones_artist ON public.bonus_milestones (artist_id);
CREATE INDEX idx_bonus_milestones_status ON public.bonus_milestones (status);
CREATE INDEX idx_charts_bonus_artist ON public.charts_bonus_cycles (artist_id);
CREATE INDEX idx_charts_bonus_genre_year ON public.charts_bonus_cycles (genre, cycle_year);
CREATE INDEX idx_charts_bonus_rank ON public.charts_bonus_cycles (rank) WHERE (rank IS NOT NULL);
CREATE UNIQUE INDEX credit_ledger_ref_type_user_unique ON public.credit_ledger (reference, type, user_email) WHERE (reference IS NOT NULL);
CREATE INDEX idx_credit_ledger_created_at ON public.credit_ledger (created_at DESC);
CREATE INDEX idx_credit_ledger_email ON public.credit_ledger (user_email);
CREATE INDEX idx_credit_ledger_unbatched ON public.credit_ledger (payout_batch_id) WHERE (payout_batch_id IS NULL);
CREATE INDEX idx_email_logs_application_id ON public.email_logs (application_id);
CREATE INDEX idx_email_logs_recipient ON public.email_logs (recipient_email);
CREATE UNIQUE INDEX fan_invites_token_unique ON public.fan_invites (token);
CREATE INDEX idx_fan_invites_created ON public.fan_invites (inviter_id, created_at);
CREATE INDEX idx_fan_invites_inviter ON public.fan_invites (inviter_id, inviter_type);
CREATE INDEX idx_fan_invites_token ON public.fan_invites (token);
CREATE INDEX idx_fan_playlists_fan_id ON public.fan_playlists (fan_id);
CREATE UNIQUE INDEX idx_fan_playlists_fan_track ON public.fan_playlists (fan_id, track_id);
CREATE INDEX idx_fan_terms_acceptances_user_id ON public.fan_terms_acceptances (user_id);
CREATE INDEX idx_invitation_logs_created_at ON public.invitation_email_logs (created_at DESC);
CREATE INDEX idx_marketing_assets_artist_id ON public.marketing_assets (artist_id);
CREATE INDEX idx_marketing_assets_created_at ON public.marketing_assets (created_at DESC);
CREATE INDEX monitoring_events_created_at_idx ON public.monitoring_events (created_at DESC);
CREATE INDEX monitoring_events_function_type_idx ON public.monitoring_events (function_name, event_type, created_at DESC);
CREATE INDEX idx_payout_batches_artist ON public.payout_batches (artist_user_id);
CREATE INDEX idx_payout_batches_status ON public.payout_batches (status);
CREATE INDEX idx_payout_batches_week ON public.payout_batches (week_start);
CREATE UNIQUE INDEX payout_batches_artist_week_unique ON public.payout_batches (artist_user_id, week_start, week_end);
CREATE UNIQUE INDEX unique_artist_week ON public.payout_batches (artist_user_id, week_start);
CREATE INDEX playback_sessions_expires_at_idx ON public.playback_sessions (expires_at);
CREATE INDEX playback_sessions_track_id_idx ON public.playback_sessions (track_id);
CREATE INDEX playback_sessions_user_id_idx ON public.playback_sessions (user_id);
CREATE INDEX playback_sessions_watermark_id_idx ON public.playback_sessions (watermark_id);
CREATE INDEX playback_tokens_consumed_at_idx ON public.playback_tokens (consumed_at);
CREATE INDEX playback_tokens_stream_id_idx ON public.playback_tokens (stream_id);
CREATE INDEX idx_report_email_logs_date ON public.report_email_logs (report_date DESC);
CREATE INDEX idx_report_email_logs_status ON public.report_email_logs (status);
CREATE INDEX request_rate_limits_key_idx ON public.request_rate_limits (key, endpoint, window_start);
CREATE INDEX idx_shared_tracks_recipient ON public.shared_tracks (recipient_id);
CREATE INDEX idx_shared_tracks_sender ON public.shared_tracks (sender_id);
CREATE UNIQUE INDEX stream_charges_idempotency_unique ON public.stream_charges (idempotency_key) WHERE (idempotency_key IS NOT NULL);
CREATE INDEX idx_stream_ledger_artist_id ON public.stream_ledger (artist_id);
CREATE INDEX idx_stream_ledger_created_at ON public.stream_ledger (created_at DESC);
CREATE INDEX idx_stream_ledger_fan_id ON public.stream_ledger (fan_id);
CREATE INDEX idx_stream_ledger_payout_batch ON public.stream_ledger (payout_batch_id);
CREATE INDEX idx_stream_ledger_payout_status ON public.stream_ledger (payout_status);
CREATE INDEX idx_stream_ledger_track_id ON public.stream_ledger (track_id);
CREATE INDEX idx_stripe_events_processed_at ON public.stripe_events (processed_at DESC);
CREATE INDEX idx_track_likes_fan_id ON public.track_likes (fan_id);
CREATE INDEX idx_track_likes_track_id ON public.track_likes (track_id);
CREATE INDEX idx_tracks_status ON public.tracks (status);
CREATE INDEX idx_vault_codes_email_status ON public.vault_codes (email, status);
CREATE INDEX idx_vault_codes_status ON public.vault_codes (status);
CREATE INDEX idx_vault_members_active ON public.vault_members (vault_access_active) WHERE (vault_access_active = true);
CREATE INDEX idx_vault_members_user_id ON public.vault_members (user_id);

-- ============================================================
-- 4. VIEWS
-- ============================================================

CREATE OR REPLACE VIEW public.public_artist_profiles
  WITH (security_invoker = false)
AS
  SELECT id, user_id, artist_name, bio, genre, avatar_url,
         instagram_url, tiktok_url, youtube_url, twitter_url,
         created_at, updated_at
  FROM artist_profiles;

CREATE OR REPLACE VIEW public.shareable_vault_members
  WITH (security_invoker = false)
AS
  SELECT id, display_name
  FROM vault_members
  WHERE vault_access_active = true;

CREATE OR REPLACE VIEW public.admin_stream_report_view AS
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
  FROM stream_ledger sl
    LEFT JOIN tracks t ON t.id = sl.track_id
    LEFT JOIN artist_profiles ap ON ap.id::text = sl.artist_id
    LEFT JOIN vault_members vm ON vm.id = sl.fan_id;

-- ============================================================
-- 5. FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_admin_email(email text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT email IN ('support@musicexclusive.co', 'tinytunesmusic@gmail.com')
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'fan')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_admin_role()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF public.is_admin_email(NEW.email) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_vault_members_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_name_to_vault()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  UPDATE vault_members
  SET display_name = NEW.display_name
  WHERE email = (
    SELECT email FROM auth.users WHERE id = NEW.user_id LIMIT 1
  )
  AND NEW.display_name IS NOT NULL
  AND NEW.display_name <> '';
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_track_like_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.tracks SET like_count = like_count + 1 WHERE id = NEW.track_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.tracks SET like_count = like_count - 1 WHERE id = OLD.track_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_playlist_on_track_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status <> 'ready' THEN
    DELETE FROM public.fan_playlists WHERE track_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_stream_artist_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  track_artist_id text;
BEGIN
  SELECT artist_id INTO track_artist_id
  FROM public.tracks WHERE id = NEW.track_id;
  IF track_artist_id IS NOT NULL THEN
    NEW.artist_id := track_artist_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_credit_purchase(
  p_email text, p_credits integer, p_ledger_type text, p_reference text,
  p_usd numeric, p_set_superfan boolean DEFAULT false,
  p_set_superfan_since boolean DEFAULT false
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RAISE EXCEPTION 'email required';
  END IF;
  IF p_credits IS NULL OR p_credits <= 0 THEN
    RAISE EXCEPTION 'credits must be positive';
  END IF;
  INSERT INTO public.vault_members (
    email, display_name, credits, vault_access_active,
    membership_type, superfan_active, superfan_since
  ) VALUES (
    p_email, split_part(p_email, '@', 1), p_credits, true,
    CASE WHEN p_set_superfan THEN 'superfan' ELSE 'pay_as_you_go' END,
    p_set_superfan,
    CASE WHEN p_set_superfan_since THEN now() ELSE NULL END
  )
  ON CONFLICT (email) DO UPDATE SET
    credits = public.vault_members.credits + EXCLUDED.credits,
    vault_access_active = true,
    membership_type = CASE WHEN p_set_superfan THEN 'superfan' ELSE public.vault_members.membership_type END,
    superfan_active = CASE WHEN p_set_superfan THEN true ELSE public.vault_members.superfan_active END,
    superfan_since = CASE WHEN p_set_superfan_since THEN now() ELSE public.vault_members.superfan_since END;
  INSERT INTO public.credit_ledger (user_email, type, credits_delta, usd_delta, reference)
  VALUES (p_email, p_ledger_type, p_credits, p_usd, p_reference);
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_stream_credit(
  p_fan_email text, p_fan_id uuid, p_track_id uuid,
  p_artist_id text, p_idempotency_key text
)
RETURNS TABLE(new_credits integer, already_charged boolean, stream_ledger_id uuid, out_stream_id uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  updated_credits integer;
  v_stream_ledger_id uuid;
  v_stream_id uuid := gen_random_uuid();
  v_reference text := format('stream_%s_%s', p_track_id, p_idempotency_key);
BEGIN
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'idempotency_key required';
  END IF;
  INSERT INTO public.stream_charges (stream_id, fan_email, track_id, idempotency_key)
  VALUES (v_stream_id, p_fan_email, p_track_id, p_idempotency_key)
  ON CONFLICT ON CONSTRAINT stream_charges_idempotency_key_key DO NOTHING;
  IF NOT FOUND THEN
    SELECT vm.credits INTO updated_credits
    FROM public.vault_members vm WHERE vm.email = p_fan_email;
    RETURN QUERY SELECT updated_credits, true, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;
  UPDATE public.vault_members SET credits = credits - 1
  WHERE email = p_fan_email AND credits >= 1
  RETURNING credits INTO updated_credits;
  IF updated_credits IS NULL THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;
  INSERT INTO public.credit_ledger (user_email, type, credits_delta, usd_delta, reference)
  VALUES
    (p_fan_email, 'STREAM_DEBIT', -1, -0.20, v_reference),
    (p_artist_id, 'ARTIST_EARNING', 0, 0.10, v_reference),
    ('support@musicexclusive.co', 'PLATFORM_EARNING', 0, 0.10, v_reference)
  ON CONFLICT (reference, type, user_email) DO NOTHING;
  INSERT INTO public.stream_ledger (
    fan_id, fan_email, artist_id, track_id,
    credits_spent, amount_total, amount_artist, amount_platform, payout_status
  ) VALUES (
    p_fan_id, p_fan_email, p_artist_id, p_track_id,
    1, 0.20, 0.10, 0.10, 'pending'
  ) RETURNING id INTO v_stream_ledger_id;
  UPDATE public.stream_charges SET stream_ledger_id = v_stream_ledger_id
  WHERE public.stream_charges.stream_id = v_stream_id;
  RETURN QUERY SELECT updated_credits, false, v_stream_ledger_id, v_stream_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_charts(p_genre text, p_year integer)
RETURNS TABLE(id uuid, artist_id uuid, cumulative_streams bigint, rank integer, prize_usd numeric, status text, artist_name text, country_code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT c.id, c.artist_id, c.cumulative_streams, c.rank, c.prize_usd, c.status,
         a.artist_name, a.country_code
  FROM charts_bonus_cycles c
  JOIN artist_profiles a ON a.id = c.artist_id
  WHERE c.genre = p_genre AND c.cycle_year = p_year
    AND c.status = 'active' AND c.rank IS NOT NULL
  ORDER BY c.cumulative_streams DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_fan_top_artists(p_fan_id uuid, p_limit integer DEFAULT 5)
RETURNS TABLE(artist_id uuid, artist_name text, avatar_url text, like_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT pap.id AS artist_id, pap.artist_name, pap.avatar_url, COUNT(tl.id) AS like_count
  FROM track_likes tl
  INNER JOIN tracks t ON t.id = tl.track_id
  INNER JOIN public_artist_profiles pap ON pap.id::text = t.artist_id
  WHERE tl.fan_id = p_fan_id
  GROUP BY pap.id, pap.artist_name, pap.avatar_url
  ORDER BY like_count DESC LIMIT p_limit
$$;

CREATE OR REPLACE FUNCTION public.get_public_preview_tracks()
RETURNS TABLE(id uuid, title text, artist_id text, genre text, artwork_url text, has_preview boolean, like_count integer, preview_start_seconds integer, artist_name text, artist_avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT t.id, t.title, t.artist_id, t.genre, t.artwork_url,
    (t.preview_audio_key IS NOT NULL) AS has_preview,
    t.like_count, t.preview_start_seconds,
    pap.artist_name, pap.avatar_url AS artist_avatar_url
  FROM tracks t
  LEFT JOIN public_artist_profiles pap ON pap.id::text = t.artist_id
  WHERE t.status = 'ready' AND t.is_preview_public = true
  ORDER BY t.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_public_preview_audio_key(p_track_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT preview_audio_key FROM tracks
  WHERE id = p_track_id AND status = 'ready'
    AND is_preview_public = true AND preview_audio_key IS NOT NULL
  LIMIT 1;
$$;

-- ============================================================
-- 6. TRIGGERS (on public tables)
-- ============================================================

-- NOTE: You also need triggers on auth.users for handle_new_user,
-- handle_new_user_role, and ensure_admin_role. Create those in
-- the Supabase dashboard under Authentication > Hooks, or run:
--
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- CREATE TRIGGER on_auth_user_created_role AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();
-- CREATE TRIGGER on_auth_user_created_admin AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.ensure_admin_role();

CREATE TRIGGER update_artist_applications_updated_at
  BEFORE UPDATE ON public.artist_applications
  FOR EACH ROW EXECUTE FUNCTION update_vault_members_updated_at();

CREATE TRIGGER update_artist_profiles_updated_at
  BEFORE UPDATE ON public.artist_profiles
  FOR EACH ROW EXECUTE FUNCTION update_vault_members_updated_at();

CREATE TRIGGER sync_profile_display_name
  AFTER UPDATE OF display_name ON public.profiles
  FOR EACH ROW WHEN (OLD.display_name IS DISTINCT FROM NEW.display_name)
  EXECUTE FUNCTION sync_profile_name_to_vault();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_vault_members_updated_at();

CREATE TRIGGER trigger_ensure_stream_artist_id
  BEFORE INSERT OR UPDATE ON public.stream_ledger
  FOR EACH ROW EXECUTE FUNCTION ensure_stream_artist_id();

CREATE TRIGGER trg_track_like_count
  AFTER INSERT OR DELETE ON public.track_likes
  FOR EACH ROW EXECUTE FUNCTION update_track_like_count();

CREATE TRIGGER trg_cleanup_playlist_on_track_change
  AFTER UPDATE OF status ON public.tracks
  FOR EACH ROW WHEN ((OLD.status = 'ready') AND (NEW.status <> 'ready'))
  EXECUTE FUNCTION cleanup_playlist_on_track_change();

CREATE TRIGGER update_tracks_updated_at
  BEFORE UPDATE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION update_vault_members_updated_at();

CREATE TRIGGER update_vault_members_timestamp
  BEFORE UPDATE ON public.vault_members
  FOR EACH ROW EXECUTE FUNCTION update_vault_members_updated_at();

-- ============================================================
-- 7. ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agreement_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_action_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_agreement_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bonus_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.charts_bonus_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_terms_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monitoring_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playback_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playback_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_artist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stream_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. RLS POLICIES
-- ============================================================

-- admin_action_logs
CREATE POLICY "Admins can view action logs" ON public.admin_action_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role or admins can insert action logs" ON public.admin_action_logs FOR INSERT WITH CHECK (((auth.jwt() ->> 'role') = 'service_role') OR has_role(auth.uid(), 'admin'));

-- agreement_acceptances
CREATE POLICY "Admins can view all agreement acceptances" ON public.agreement_acceptances FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can insert agreement acceptances" ON public.agreement_acceptances FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
CREATE POLICY "Users can read their own acceptance" ON public.agreement_acceptances FOR SELECT USING (email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text);

-- app_error_logs
CREATE POLICY "Admins can view all error logs" ON public.app_error_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can insert error logs" ON public.app_error_logs FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL) AND ((user_id IS NULL) OR (user_id = auth.uid())));

-- application_action_tokens
CREATE POLICY "Admins can manage action tokens" ON public.application_action_tokens FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage action tokens" ON public.application_action_tokens FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- artist_agreement_acceptances
CREATE POLICY "Artists can insert their own acceptance" ON public.artist_agreement_acceptances FOR INSERT TO authenticated WITH CHECK (auth.uid() = artist_id);
CREATE POLICY "Artists can view their own acceptances" ON public.artist_agreement_acceptances FOR SELECT TO authenticated USING (auth.uid() = artist_id);

-- artist_applications
CREATE POLICY "Admins can update artist applications" ON public.artist_applications FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all applications" ON public.artist_applications FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can insert artist applications" ON public.artist_applications FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- artist_invitations
CREATE POLICY "Admins can manage invitations" ON public.artist_invitations FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage invitations" ON public.artist_invitations FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- artist_payouts
CREATE POLICY "Admins can update artist payouts" ON public.artist_payouts FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all artist payouts" ON public.artist_payouts FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Artists can view their own payouts" ON public.artist_payouts FOR SELECT USING (artist_id IN (SELECT id FROM artist_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Service role can manage artist payouts" ON public.artist_payouts FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- artist_profiles
CREATE POLICY "Admins can view all artist profiles" ON public.artist_profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Artists can insert their own profile" ON public.artist_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Artists can update their own profile" ON public.artist_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Artists can view their own profile" ON public.artist_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Vault members can view artist profiles" ON public.artist_profiles FOR SELECT TO authenticated USING ((auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM vault_members vm WHERE vm.email = (auth.jwt() ->> 'email') AND vm.vault_access_active = true)));

-- artist_waitlist
CREATE POLICY "Admins can update waitlist" ON public.artist_waitlist FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view waitlist" ON public.artist_waitlist FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can insert waitlist" ON public.artist_waitlist FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
CREATE POLICY "Service role can read waitlist" ON public.artist_waitlist FOR SELECT USING ((auth.jwt() ->> 'role') = 'service_role');
CREATE POLICY "Service role can update waitlist" ON public.artist_waitlist FOR UPDATE USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- bonus_milestones
CREATE POLICY "Admins can update bonus milestones" ON public.bonus_milestones FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view bonus milestones" ON public.bonus_milestones FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Artists can view their own milestones" ON public.bonus_milestones FOR SELECT USING (artist_id IN (SELECT id FROM artist_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Service role can manage bonus milestones" ON public.bonus_milestones FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- charts_bonus_cycles
CREATE POLICY "Admins can update charts cycles" ON public.charts_bonus_cycles FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view charts cycles" ON public.charts_bonus_cycles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Artists can view their own charts cycles" ON public.charts_bonus_cycles FOR SELECT USING (artist_id IN (SELECT id FROM artist_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Public can read active charts cycles" ON public.charts_bonus_cycles FOR SELECT TO anon, authenticated USING (status = 'active' AND rank IS NOT NULL);
CREATE POLICY "Service role can manage charts cycles" ON public.charts_bonus_cycles FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- credit_ledger
CREATE POLICY "Admins can view all ledger entries" ON public.credit_ledger FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can insert ledger entries" ON public.credit_ledger FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
CREATE POLICY "Users can view their own ledger entries" ON public.credit_ledger FOR SELECT USING (user_email = (auth.jwt() ->> 'email'));

-- email_logs
CREATE POLICY "Admins can view all email logs" ON public.email_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage email logs" ON public.email_logs FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- fan_invites
CREATE POLICY "Artists can create own invites" ON public.fan_invites FOR INSERT WITH CHECK ((inviter_id IN (SELECT id::text FROM artist_profiles WHERE user_id = auth.uid())) AND inviter_type = 'artist');
CREATE POLICY "Service role can read invites" ON public.fan_invites FOR SELECT USING ((auth.jwt() ->> 'role') = 'service_role');

-- fan_playlists
CREATE POLICY "Admins can view all playlists" ON public.fan_playlists FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Fans can add to their own playlist" ON public.fan_playlists FOR INSERT WITH CHECK (fan_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email')));
CREATE POLICY "Fans can delete from their own playlist" ON public.fan_playlists FOR DELETE USING (fan_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email')));
CREATE POLICY "Fans can view their own playlist" ON public.fan_playlists FOR SELECT USING (fan_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email')));

-- fan_terms_acceptances
CREATE POLICY "Fans can insert their own acceptance" ON public.fan_terms_acceptances FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Fans can view their own acceptances" ON public.fan_terms_acceptances FOR SELECT USING (auth.uid() = user_id);

-- fan_waitlist
CREATE POLICY "Admins can update fan waitlist" ON public.fan_waitlist FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view fan waitlist" ON public.fan_waitlist FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can insert fan waitlist" ON public.fan_waitlist FOR INSERT WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
CREATE POLICY "Service role can read fan waitlist" ON public.fan_waitlist FOR SELECT USING ((auth.jwt() ->> 'role') = 'service_role');
CREATE POLICY "Service role can update fan waitlist" ON public.fan_waitlist FOR UPDATE USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- invitation_email_logs
CREATE POLICY "Admins can insert invitation logs" ON public.invitation_email_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view invitation logs" ON public.invitation_email_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage invitation logs" ON public.invitation_email_logs FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- marketing_assets
CREATE POLICY "Artists can delete their own marketing assets" ON public.marketing_assets FOR DELETE USING (artist_id IN (SELECT id FROM artist_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Artists can insert their own marketing assets" ON public.marketing_assets FOR INSERT TO authenticated WITH CHECK (artist_id IN (SELECT id FROM artist_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Artists can view their own marketing assets" ON public.marketing_assets FOR SELECT USING (artist_id IN (SELECT id FROM artist_profiles WHERE user_id = auth.uid()));

-- monitoring_events
CREATE POLICY "Admins can view monitoring events" ON public.monitoring_events FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage monitoring events" ON public.monitoring_events FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- payout_batches
CREATE POLICY "Admins can update payout batches" ON public.payout_batches FOR UPDATE USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all payout batches" ON public.payout_batches FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Artists can view their own payout batches" ON public.payout_batches FOR SELECT USING (auth.uid() = artist_user_id);
CREATE POLICY "Service role can manage payout batches" ON public.payout_batches FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- playback_sessions
CREATE POLICY "Admins can view playback sessions" ON public.playback_sessions FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage playback sessions" ON public.playback_sessions FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
CREATE POLICY "Users can view their own sessions" ON public.playback_sessions FOR SELECT USING (auth.uid() = user_id);

-- playback_tokens
CREATE POLICY "Service role can manage playback tokens" ON public.playback_tokens FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- profiles
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);

-- report_email_logs
CREATE POLICY "Admins can view report logs" ON public.report_email_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can update report logs" ON public.report_email_logs FOR UPDATE USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
CREATE POLICY "System can insert report logs" ON public.report_email_logs FOR INSERT TO authenticated WITH CHECK (((auth.jwt() ->> 'role') = 'service_role') OR has_role(auth.uid(), 'admin'));

-- request_rate_limits
CREATE POLICY "Service role can manage rate limits" ON public.request_rate_limits FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- shared_artist_profiles
CREATE POLICY "Admins can view all shared artist profiles" ON public.shared_artist_profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Recipients can delete their received artist profiles" ON public.shared_artist_profiles FOR DELETE USING (recipient_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email')));
CREATE POLICY "Recipients can update their received artist profiles" ON public.shared_artist_profiles FOR UPDATE USING (recipient_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email'))) WITH CHECK (recipient_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email')));
CREATE POLICY "Users can read their shared artist profiles" ON public.shared_artist_profiles FOR SELECT USING ((sender_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email'))) OR (recipient_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email'))));
CREATE POLICY "Users can share artist profiles as themselves" ON public.shared_artist_profiles FOR INSERT WITH CHECK (sender_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email')));

-- shared_tracks
CREATE POLICY "Admins can view all shared tracks" ON public.shared_tracks FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Recipients can delete their received tracks" ON public.shared_tracks FOR DELETE USING (recipient_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email')));
CREATE POLICY "Recipients can update their received tracks" ON public.shared_tracks FOR UPDATE USING (recipient_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email'))) WITH CHECK (recipient_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email')));
CREATE POLICY "Users can read their shared tracks" ON public.shared_tracks FOR SELECT USING ((sender_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email'))) OR (recipient_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email'))));
CREATE POLICY "Users can share tracks as themselves" ON public.shared_tracks FOR INSERT WITH CHECK (sender_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email')));

-- stream_charges (service role only for writes — managed by debit_stream_credit RPC)
CREATE POLICY "Service role can manage stream charges" ON public.stream_charges FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- stream_ledger (service role only for writes)
CREATE POLICY "Admins can view stream ledger" ON public.stream_ledger FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Service role can manage stream ledger" ON public.stream_ledger FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- stripe_events
CREATE POLICY "Service role can manage stripe events" ON public.stripe_events FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

-- track_likes
CREATE POLICY "Users can read their own likes" ON public.track_likes FOR SELECT USING (((auth.jwt() ->> 'role') = 'service_role') OR has_role(auth.uid(), 'admin') OR (fan_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email'))));
CREATE POLICY "Users can insert their own likes" ON public.track_likes FOR INSERT TO authenticated WITH CHECK (fan_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email')));
CREATE POLICY "Users can delete their own likes" ON public.track_likes FOR DELETE USING (fan_id IN (SELECT id FROM vault_members WHERE email = (auth.jwt() ->> 'email')));

-- tracks
CREATE POLICY "Authorized users can read tracks" ON public.tracks FOR SELECT USING (
  ((auth.jwt() ->> 'role') = 'service_role')
  OR has_role(auth.uid(), 'admin')
  OR (artist_id IN (SELECT id::text FROM artist_profiles WHERE user_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM vault_members vm WHERE vm.email = (auth.jwt() ->> 'email') AND vm.vault_access_active = true))
);
CREATE POLICY "Service role can manage tracks" ON public.tracks FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
CREATE POLICY "Artists can insert their own tracks" ON public.tracks FOR INSERT TO authenticated WITH CHECK (artist_id IN (SELECT id::text FROM artist_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Artists can update their own tracks" ON public.tracks FOR UPDATE USING (artist_id IN (SELECT id::text FROM artist_profiles WHERE user_id = auth.uid()));

-- user_roles (service role only)
CREATE POLICY "Service role can manage user roles" ON public.user_roles FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
CREATE POLICY "Users can read their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- vault_codes
CREATE POLICY "Service role can manage vault codes" ON public.vault_codes FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
CREATE POLICY "Admins can view vault codes" ON public.vault_codes FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- vault_members
CREATE POLICY "Service role can manage vault members" ON public.vault_members FOR ALL USING ((auth.jwt() ->> 'role') = 'service_role') WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');
CREATE POLICY "Users can view their own vault member record" ON public.vault_members FOR SELECT USING (email = (auth.jwt() ->> 'email'));
CREATE POLICY "Admins can view all vault members" ON public.vault_members FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- ============================================================
-- 9. REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.track_likes;

-- ============================================================
-- 10. STORAGE BUCKETS
-- ============================================================
-- Create these via the Supabase dashboard or SQL:
INSERT INTO storage.buckets (id, name, public) VALUES ('audio', 'audio', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('track_covers', 'track_covers', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('track_audio', 'track_audio', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('marketing-assets', 'marketing-assets', true) ON CONFLICT DO NOTHING;

-- ============================================================
-- DONE. Next steps:
-- 1. Create auth triggers (see section 6 comments)
-- 2. Configure secrets (Stripe, R2, Resend, etc.)
-- 3. Deploy edge functions: supabase functions deploy
-- ============================================================
