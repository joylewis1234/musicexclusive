

## Consolidated SQL Export Script

### Approach
Rather than concatenating 99 incremental migration files (many of which DROP and re-CREATE the same objects), I will generate a **single clean SQL script** that represents the **final state** of your database schema. This is more reliable for setting up a fresh database.

### What the script will include
1. **Enums** — `app_role`
2. **Tables** (22 tables) — with all columns, defaults, constraints
3. **Indexes** — all custom indexes
4. **Functions** (15 database functions) — `has_role`, `debit_stream_credit`, `apply_credit_purchase`, etc.
5. **Triggers** — timestamp updates, role assignment, like counts, etc.
6. **RLS policies** — all row-level security policies per table
7. **Storage buckets** — `audio`, `avatars`, `track_covers`, `track_audio`, `marketing-assets`
8. **Views** — `public_artist_profiles`, `admin_stream_report_view`, `shareable_vault_members`

### What it will NOT include
- **Data** (no INSERT statements for test/mock data)
- **Auth schema changes** (Supabase manages `auth.users` automatically)
- **Secrets/environment variables** — you'll configure those separately
- **Edge Functions** — those are deployed separately from `supabase/functions/`

### How to use it
1. Create a new Supabase project
2. Go to SQL Editor in the Supabase dashboard
3. Paste and run the consolidated script
4. Configure your secrets (Stripe, R2, Resend, etc.)
5. Deploy edge functions via `supabase functions deploy`

### Technical details
I will read the remaining migration files to capture every column, constraint, and policy accurately, then output a single `supabase/export/full-schema.sql` file you can download and run.

