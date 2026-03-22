# Complete Migration Guide from Lovable Cloud to Supabase

## Overview

This guide will help you migrate your entire database and edge functions from Lovable Cloud to your own Supabase instance.

## Prerequisites

- ✅ New Supabase project created
- ✅ Data migration SQL file downloaded: `supabase/export/data-migration.sql`
- ✅ Schema file ready: `supabase/export/full-schema.sql`

## Step-by-Step Migration

### Step 1: Create Your New Supabase Project

1. Go to https://supabase.com/dashboard
2. Create a new project
3. Note your:
   - Project URL: `https://[project-ref].supabase.co`
   - Database password (set during creation)
   - Service Role Key (Settings → API → service_role key)
   - Anon Key (Settings → API → anon key)

### Step 2: Run the Schema

1. Go to your new Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open `supabase/export/full-schema.sql`
4. Copy and paste the entire file
5. Click **Run**

This creates all tables, indexes, functions, triggers, and RLS policies.

### Step 3: Create Auth Triggers

After running the schema, create the auth triggers (they're commented out in the schema file):

```sql
-- Create triggers on auth.users
CREATE TRIGGER on_auth_user_created 
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_created_role 
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user_role();

CREATE TRIGGER on_auth_user_created_admin 
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.ensure_admin_role();
```

Run this in the SQL Editor.

### Step 4: Create Auth Users with Specific UUIDs

The data migration requires specific UUIDs for auth users. Update your `.env` file:

```env
NEW_SUPABASE_URL=https://your-new-project.supabase.co
NEW_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Then update `scripts/recreate-auth-users.js` with passwords for users that need them, and run:

```bash
node scripts/recreate-auth-users.js
```

**Required UUIDs (from data-migration.sql):**
- `support@musicexclusive.co` → `558ee15a-a018-4bdb-9ab0-d071444d168f` (admin)
- `demo-fan@test.com` → `db9c713b-df72-4dc2-b535-6ebfdc1cce45` (fan)
- `joylewismusic+testdemo1@gmail.com` → `ba5df0b2-8bb9-41f2-b1ad-4e2c97868448` (artist + fan)
- `test-artist+validation@example.com` → `b429eeb1-88c3-48df-a023-f345fee49912` (artist + fan)

### Step 5: Import the Data

1. Go to Supabase SQL Editor
2. Open `supabase/export/data-migration.sql`
3. Copy and paste the entire file
4. Click **Run**

This imports all your data with `ON CONFLICT DO NOTHING`, so it's safe to run multiple times.

### Step 6: Verify the Migration

Check that data was imported:

```sql
-- Check row counts
SELECT 
  'vault_members' as table_name, COUNT(*) as rows FROM vault_members
UNION ALL
SELECT 'user_roles', COUNT(*) FROM user_roles
UNION ALL
SELECT 'profiles', COUNT(*) FROM profiles
UNION ALL
SELECT 'artist_profiles', COUNT(*) FROM artist_profiles
UNION ALL
SELECT 'tracks', COUNT(*) FROM tracks
UNION ALL
SELECT 'credit_ledger', COUNT(*) FROM credit_ledger;
```

Expected counts:
- vault_members: 4
- user_roles: 6
- profiles: 4
- artist_profiles: 2
- tracks: 13
- credit_ledger: 148

### Step 7: Update Configuration Files

1. **Update `supabase/config.toml`:**
   ```toml
   project_id = "your-new-project-ref"
   ```

2. **Update frontend `.env`:**
   ```env
   VITE_SUPABASE_URL=https://your-new-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-new-anon-key
   VITE_SUPABASE_PROJECT_ID=your-new-project-ref
   ```

### Step 8: Deploy Edge Functions

1. Link to your new project:
   ```bash
   supabase link --project-ref your-new-project-ref
   ```

2. Set environment secrets:
   ```bash
   supabase secrets set SUPABASE_URL=https://your-new-project.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   supabase secrets set SUPABASE_ANON_KEY=your-anon-key
   supabase secrets set STRIPE_SECRET_KEY=sk_...
   supabase secrets set RESEND_API_KEY=re_...
   # ... set all other required secrets
   ```

3. Deploy functions:
   ```bash
   supabase functions deploy
   ```

### Step 9: Migrate Storage Files

If you have files in Supabase Storage or R2:

1. **Download files from Lovable:**
   - Audio files
   - Avatar images
   - Cover art

2. **Upload to new Supabase Storage:**
   - Go to Storage in Supabase dashboard
   - Create buckets if needed
   - Upload files

3. **Update file paths in database** if bucket names changed

### Step 10: Test Everything

- [ ] Test user login for all 4 accounts
- [ ] Test artist dashboard
- [ ] Test track playback
- [ ] Test payment flows (if applicable)
- [ ] Verify data integrity

## Troubleshooting

### UUID Mismatch Errors

If you get foreign key errors, verify auth users were created with correct UUIDs:
```sql
SELECT id, email FROM auth.users ORDER BY email;
```

Compare with UUIDs in `data-migration.sql`.

### Missing Data

If some tables are empty after import:
- Check for foreign key constraint errors
- Verify auth users exist with correct UUIDs
- Check RLS policies aren't blocking access

### Edge Function Errors

- Verify all secrets are set: `supabase secrets list`
- Check function logs in Supabase dashboard
- Ensure database schema matches function expectations

## Files Reference

- `supabase/export/full-schema.sql` - Complete database schema
- `supabase/export/data-migration.sql` - All data to import
- `scripts/recreate-auth-users.js` - Script to create auth users with specific UUIDs
- `supabase/config.toml` - Edge function configuration

## Next Steps After Migration

1. ✅ Delete the export edge function in Lovable (as they requested)
2. ✅ Update all environment variables
3. ✅ Test all critical features
4. ✅ Update any hardcoded URLs in your code
5. ✅ Deploy your frontend with new Supabase credentials
