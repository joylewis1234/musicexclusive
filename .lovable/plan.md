

## Add `playback_sessions` Table and Session Recording to `mint-playback-url`

This combines the previously approved JWT minting with a new database table to persist playback sessions for audit and revocation.

### Step 1 -- Database Migration

Create the `playback_sessions` table with RLS enabled and service-role-only write access:

```sql
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
```

### Step 2 -- Update `supabase/functions/mint-playback-url/index.ts`

All changes in a single file edit:

**A) Add constants and JWT helpers (after line 73, before the main handler):**
- `SESSION_TTL_SECONDS = 300`
- `base64url()` helper
- `signJwtHS256()` using Web Crypto HS256

**B) Add session minting + DB insert (after access checks at line 174, before "Resolve key"):**
- Generate `sessionId` via `crypto.randomUUID()`
- Compute `sessionExpiresAt` and its ISO string
- Read `PLAYBACK_JWT_SECRET` (return 500 if missing)
- Sign JWT with `track_id`, `user_id`, `session_id`, `expires_at`, `exp`, `iat`
- Extract `ip_address` from `cf-connecting-ip` header and `user_agent` from request
- Insert row into `playback_sessions` using the admin (service role) client
- Return 500 if insert fails

**C) Update the success response (line 194):**
- Add `sessionToken` and `session` object to the JSON response
- `session.expires_at` uses the ISO string

### Step 3 -- Deploy the edge function

Automatic on save.

### What does NOT change
- All existing access checks, signed URL logic, and error handling remain intact
- Client hooks (`useAudioPlayer`, `useSignedArtworkUrl`) are not modified -- they will receive extra fields in the response and ignore them
- No other edge functions or database tables are affected

### Technical Details

RLS policies on `playback_sessions` follow the same restrictive pattern used elsewhere:
- Writes are service-role only (the edge function uses the service role client)
- Admins get full read access
- Users can read their own sessions

The `references auth.users(id)` foreign key is acceptable here because this is a server-side-only table (no client inserts), so it does not conflict with RLS or profile-table patterns. The `track_id` FK cascades deletes.

