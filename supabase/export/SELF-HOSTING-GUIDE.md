# Self-Hosting Guide — Music Exclusive

## Quick Start

No code changes are needed. The codebase reads from three environment variables that you set on your hosting platform.

## Environment Variables

Set these on your hosting platform (Vercel, Netlify, Cloudflare Pages, etc.):

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://<your-project-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your project's **anon/public** key |
| `VITE_SUPABASE_PROJECT_ID` | Your project reference ID (e.g. `abcdefghijklmnop`) |

All edge function URLs and the Supabase client will automatically point to your new project.

## Pre-Deployment Checklist

### 1. Database Setup
```bash
# Link CLI to your project
supabase link --project-ref <your-project-ref>

# Apply schema
psql <your-db-connection-string> -f supabase/export/full-schema.sql
```

### 2. Auth Users
Create the 4 auth.users with matching UUIDs in your Supabase dashboard → Authentication:
- `558ee15a-...`
- `db9c713b-...`
- `ba5df0b2-...`
- `b429eeb1-...`

### 3. Data Migration
```bash
psql <your-db-connection-string> -f supabase/export/data-migration.sql
```

### 4. Secrets
Edit `supabase/export/setup-secrets.sh` with your real values, then:
```bash
bash supabase/export/setup-secrets.sh
```

### 5. Edge Functions
```bash
bash supabase/export/deploy-functions.sh
```

### 6. Storage Buckets
Create these **public** buckets in your Supabase dashboard → Storage:
- `audio`
- `avatars`
- `track_covers`
- `track_audio`
- `marketing-assets`

### 7. Stripe Webhook
Update your Stripe webhook endpoint URL to:
```
https://<your-project-ref>.supabase.co/functions/v1/stripe-webhook
```

### 8. Deploy Frontend
Build and deploy to your platform of choice:
```bash
npm run build
# Upload dist/ to Vercel, Netlify, etc.
```

## Verification

After deployment, visit `/admin/login` and sign in to run the Health Check at `/admin/health-check` to confirm all services are connected.
