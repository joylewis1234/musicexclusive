create table if not exists public.playback_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_agent text,
  ip_address text,
  revoked_at timestamptz
);

create index if not exists playback_sessions_user_id_idx
  on public.playback_sessions (user_id);
create index if not exists playback_sessions_track_id_idx
  on public.playback_sessions (track_id);
create index if not exists playback_sessions_expires_at_idx
  on public.playback_sessions (expires_at);

alter table public.playback_sessions enable row level security;

-- Service role can manage all sessions
create policy "Service role can manage playback sessions"
  on public.playback_sessions for all
  using ((auth.jwt() ->> 'role') = 'service_role')
  with check ((auth.jwt() ->> 'role') = 'service_role');

-- Admins can view all sessions
create policy "Admins can view playback sessions"
  on public.playback_sessions for select
  using (has_role(auth.uid(), 'admin'));

-- Users can view their own sessions
create policy "Users can view their own sessions"
  on public.playback_sessions for select
  using (auth.uid() = user_id);