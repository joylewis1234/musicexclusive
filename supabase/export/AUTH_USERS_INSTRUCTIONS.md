# Creating Auth Users with Specific UUIDs

## The Problem

Supabase's Admin API (`supabase.auth.admin.createUser()`) **does not support** setting custom UUIDs. When you create a user via the API, Supabase automatically generates a new UUID.

However, your `data-migration.sql` file requires **specific UUIDs** for the foreign keys to work correctly.

## Solution: Use SQL Directly

You have two options:

### Option 1: Use SQL Script (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open `supabase/export/create-auth-users.sql`
4. **Update the passwords** in the SQL file (replace `SET_PASSWORD_HERE`)
5. Copy and paste the entire file
6. Click **Run**

**Note:** If you get permission errors, you may need to:
- Run this as the postgres superuser
- Or use Supabase's Management API (see Option 2)

### Option 2: Use Supabase Management API

If SQL doesn't work, you can use Supabase's Management API with a service role key:

```bash
# Create user with specific UUID (requires direct database access)
curl -X POST 'https://your-project.supabase.co/rest/v1/rpc/create_user_with_uuid' \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "558ee15a-a018-4bdb-9ab0-d071444d168f",
    "email": "support@musicexclusive.co",
    "password": "YourPasswordHere"
  }'
```

But this requires creating a custom function first.

### Option 3: Manual Creation + Update Foreign Keys

If you can't set custom UUIDs:

1. Create users normally (they'll get random UUIDs)
2. Run `data-migration.sql` 
3. Update all foreign keys in your database to match the new UUIDs:

```sql
-- Example: Update vault_members.user_id
UPDATE vault_members 
SET user_id = 'new-uuid-here' 
WHERE email = 'support@musicexclusive.co';
```

This is more work but will work if SQL insertion doesn't work.

## Recommended Approach

**Try Option 1 first** (SQL script). If it works, you're done. If you get permission errors, contact Supabase support or use Option 3.

## Required UUIDs

Make sure these UUIDs match exactly:

- `support@musicexclusive.co` → `558ee15a-a018-4bdb-9ab0-d071444d168f`
- `demo-fan@test.com` → `db9c713b-df72-4dc2-b535-6ebfdc1cce45`
- `joylewismusic+testdemo1@gmail.com` → `ba5df0b2-8bb9-41f2-b1ad-4e2c97868448`
- `test-artist+validation@example.com` → `b429eeb1-88c3-48df-a023-f345fee49912`

## Verification

After creating users, verify they exist with correct UUIDs:

```sql
SELECT id, email, email_confirmed_at 
FROM auth.users 
WHERE id IN (
  '558ee15a-a018-4bdb-9ab0-d071444d168f',
  'db9c713b-df72-4dc2-b535-6ebfdc1cce45',
  'ba5df0b2-8bb9-41f2-b1ad-4e2c97868448',
  'b429eeb1-88c3-48df-a023-f345fee49912'
)
ORDER BY email;
```

You should see all 4 users with matching UUIDs.
