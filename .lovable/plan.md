

## Move Anonymous Inserts Server-Side with Rate Limiting

### Overview
Remove public/anonymous INSERT policies from `agreement_acceptances` and `artist_applications`, replacing them with service-role-only INSERT policies. Create two new backend functions to handle these inserts with rate limiting. Add a `request_rate_limits` table for tracking submission rates.

### Database Migration

**New table**: `request_rate_limits` for rate-limit tracking
- `id bigserial primary key`
- `key text not null` (email|IP composite)
- `endpoint text not null`
- `window_start timestamptz not null`
- `count int not null default 0`
- `updated_at timestamptz not null default now()`
- Unique constraint on `(key, endpoint, window_start)`
- RLS enabled with service-role-only INSERT/UPDATE/SELECT policies

**RLS policy changes**:
- Drop "Anyone can insert agreement acceptances" on `agreement_acceptances`
- Drop "Anyone can insert artist applications" on `artist_applications`
- Create "Service role can insert agreement acceptances" (service_role only)
- Create "Service role can insert artist applications" (service_role only)

### New Backend Functions

**A) `submit-artist-application`**
- Validates required fields (contact_email, artist_name, agrees_terms)
- Rate limits: 5 submissions per 10 minutes per email+IP
- Inserts into `artist_applications` using service-role client
- Triggers `notify-new-application` internally
- Returns `{ success: true }` or `{ error }` with appropriate status codes (400, 429, 500)

**B) `submit-agreement-acceptance`**
- Validates required fields (email, name, terms_version, privacy_version)
- Rate limits: 5 submissions per 10 minutes per email+IP
- Upserts into `agreement_acceptances` using service-role client (conflict on email)
- Returns `{ success: true }` or `{ error }`

Both functions:
- Use `verify_jwt = false` (called by unauthenticated users)
- Include standard CORS headers
- Extract IP from `x-forwarded-for` header

### Frontend Changes

**`src/pages/ArtistApplicationForm.tsx`** (lines 96-105):
- Replace direct `fetch` to REST API with `supabase.functions.invoke("submit-artist-application", { body: insertBody })`
- Remove the separate `notify-new-application` invoke (handled server-side now)
- Keep existing error handling and abort detection

**`src/pages/Agreements.tsx`** (lines 195-206):
- Replace `supabase.from("agreement_acceptances").upsert(...)` with `supabase.functions.invoke("submit-agreement-acceptance", { body: payload })`
- Keep existing navigation logic unchanged

### Config Changes

**`supabase/config.toml`**: Add entries for both new functions with `verify_jwt = false`

### Files Modified

| File | Change |
|------|--------|
| New migration SQL | Create `request_rate_limits` table, swap INSERT policies |
| `supabase/functions/submit-artist-application/index.ts` | New function: validate, rate limit, insert application, trigger notification |
| `supabase/functions/submit-agreement-acceptance/index.ts` | New function: validate, rate limit, upsert acceptance |
| `src/pages/ArtistApplicationForm.tsx` | Replace direct REST insert with edge function invoke |
| `src/pages/Agreements.tsx` | Replace Supabase client upsert with edge function invoke |

### Risk Assessment
- **Low risk**: Both tables currently accept anonymous writes; moving to service-role preserves the same data flow while adding rate limiting
- **No auth required**: Both flows are pre-login (artist application, vault agreement), so `verify_jwt = false` is correct
- **Notification folded in**: The artist application notification is moved server-side, eliminating a separate client-side call
