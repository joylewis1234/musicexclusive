

## Why You Cannot Log In to Artist Accounts

### Root Cause: Split-Brain Supabase Configuration

The app has **two different Supabase projects** being used simultaneously, which causes login to fail:

1. **Lovable Cloud project** (`yjytuglxpvdkyvjsdyfk.supabase.co`) — used by the auto-generated `src/integrations/supabase/client.ts` via `.env` variables. This is the client that **all 94 files** import for auth and data queries, including `AuthContext.tsx`.

2. **External project** (`esgpsapstljgsqpmezzf.supabase.co`) — hardcoded in `src/config/supabase.ts`. This is where the test accounts actually live. Used by **16 files** for Edge Function calls (via `SUPABASE_URL`/`SUPABASE_ANON_KEY` constants).

### What Happens When You Try to Log In

1. `ArtistLogin` calls `signIn()` from `AuthContext`
2. `AuthContext` uses `supabase` from `@/integrations/supabase/client` → points at **Lovable Cloud** (`yjytuglxpvdkyvjsdyfk`)
3. The user accounts (`joylewismusic+testdemo1@gmail.com`, `test-artist+validation@example.com`) exist on the **external project** (`esgpsapstljgsqpmezzf`), not on Lovable Cloud
4. Auth fails: "Invalid login credentials"

Even if auth somehow succeeded, post-login queries (roles, profiles, tracks) go to Lovable Cloud which has no data, while Edge Function calls go to the external project — a completely broken state.

### The Fix

Unify everything to use the **external Supabase project**. There are two approaches:

#### Option A: Override the auto-generated client (recommended, minimal changes)
- Create a Vite plugin or update `vite.config.ts` to alias `@/integrations/supabase/client` to `@/integrations/supabase/custom-client`
- The existing `custom-client.ts` already points at the external project but is **never imported anywhere**
- This makes all 94 files use the external project without touching them

#### Option B: Update `.env` values
- Change the three `VITE_SUPABASE_*` env vars to point at the external project
- Problem: Lovable Cloud auto-regenerates `.env`, so this would revert on every deploy

#### Option C: Modify the auto-generated client
- Not allowed per project rules ("Do not edit it directly")

### Recommended Plan

1. **Add a Vite resolve alias** in `vite.config.ts` to redirect `@/integrations/supabase/client` → `@/integrations/supabase/custom-client`
2. This single change fixes auth + data + Edge Functions for all 94 files
3. No other files need modification

### Secondary Issue: `custom-client.ts` exists but is unused

The file `src/integrations/supabase/custom-client.ts` was clearly created to solve this exact problem but was never wired in. It correctly imports from `@/config/supabase` and points at the external project.

### Technical Detail

```text
Current flow:
  AuthContext → client.ts → yjytuglxpvdkyvjsdyfk (no accounts)
  Edge calls → config/supabase.ts → esgpsapstljgsqpmezzf (has accounts)

Fixed flow (after alias):
  AuthContext → custom-client.ts → esgpsapstljgsqpmezzf (has accounts)
  Edge calls → config/supabase.ts → esgpsapstljgsqpmezzf (has accounts)
```

