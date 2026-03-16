

## Swap Backend Connection to External Supabase

To point the codebase at your own Supabase project, here's what needs to change:

### The Problem
The `.env` file is auto-managed by Lovable Cloud and contains the current Lovable Cloud Supabase credentials. It cannot be edited directly.

### The Solution
Create a small configuration layer that lets you override the connection at build time or hardcode your external project's credentials.

### Changes

**1. Update `src/integrations/supabase/client.ts`** — This file is auto-generated and will get overwritten. Instead, we should **not** touch it. The proper approach:

Since you said you just need the connection details, here's what to swap when you deploy outside Lovable:

**Environment variables to set on your hosting platform (Vercel, Netlify, etc.):**

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://<your-project-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your project's anon/public key |
| `VITE_SUPABASE_PROJECT_ID` | Your project reference ID |

**Edge function URLs in code** — Several components construct edge function URLs using `VITE_SUPABASE_PROJECT_ID` or `VITE_SUPABASE_URL`. These will automatically point to your new project once the env vars are set.

**No code changes needed** — the codebase already reads from environment variables everywhere. Just set the three variables above on your deployment platform.

### Pre-deployment checklist for your external Supabase

1. Run `supabase/export/full-schema.sql` on your new project
2. Create the 4 auth.users with matching UUIDs (558ee15a, db9c713b, ba5df0b2, b429eeb1)
3. Run `data-migration.sql`
4. Run `bash supabase/export/setup-secrets.sh` (with real values filled in)
5. Run `bash supabase/export/deploy-functions.sh`
6. Configure storage buckets: `audio`, `avatars`, `track_covers`, `track_audio`, `marketing-assets` (all public)
7. Set the 3 env vars above on your hosting platform
8. Update your Stripe webhook endpoint URL to point to the new project's `stripe-webhook` function

### If you want to test within Lovable first
Since `.env` is locked, an alternative is to create a wrapper config file (e.g. `src/config/supabase.ts`) that exports the URL/key with hardcoded overrides. However, this would expose your anon key in source code (which is acceptable since anon keys are public by design). Let me know if you want this approach.

