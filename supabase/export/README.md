# Data Export from Lovable Cloud

This guide will help you export all data from your Lovable Cloud database to your new Supabase project.

## Step 1: Get Your API Key from Lovable

You need to get your **Service Role Key** from the Lovable Cloud dashboard:

1. Go to https://lovable.dev
2. Open your project
3. Navigate to **Settings** → **API** or **Database** settings
4. Look for **Service Role Key** (it starts with `eyJ...`)
5. Copy this key

**Important:** The Service Role Key bypasses Row Level Security (RLS), so you can export all data. If you only have the Anon Key, some tables may be restricted.

## Step 2: Run the Export Script

Open PowerShell or Command Prompt in the project directory and run:

```powershell
# Set your service role key (replace with your actual key)
$env:LOVABLE_SERVICE_ROLE_KEY="your_service_role_key_here"

# Run the export script
node scripts/export-lovable-data.js
```

Or in one line:
```powershell
$env:LOVABLE_SERVICE_ROLE_KEY="your_key"; node scripts/export-lovable-data.js
```

## Step 3: Check the Export Files

After running, you'll find two files in `supabase/export/`:

- `lovable_data_export.json` - All data in JSON format
- `lovable_data_export.sql` - SQL INSERT statements ready to import

## Step 4: Import to Your New Supabase Project

After you've:
1. ✅ Created your new Supabase project
2. ✅ Run `full-schema.sql` in the SQL Editor
3. ✅ Created the auth triggers

Then import the data:

```powershell
# Get your new Supabase connection string from the dashboard
# Settings → Database → Connection string → URI

psql "postgresql://postgres:[YOUR_NEW_PASSWORD]@db.[YOUR_NEW_PROJECT_REF].supabase.co:5432/postgres" -f supabase/export/lovable_data_export.sql
```

## Troubleshooting

### "LOVABLE_SERVICE_ROLE_KEY is required"
- Make sure you set the environment variable before running the script
- Check that you copied the full key (it's very long)

### "RLS restriction" errors
- You need the **Service Role Key**, not the Anon Key
- Service Role Key bypasses all RLS policies

### "permission denied" errors
- Some tables might require admin access
- Make sure you're using the Service Role Key

### Can't find API keys in Lovable
- Check different sections: Settings, Database, API, or Project Settings
- Contact Lovable support if you can't find them

## Alternative: Manual Export via Supabase Dashboard

If you can't use the script, you can manually export data:

1. Go to your Lovable project's Supabase dashboard
2. Navigate to **Table Editor**
3. For each table, click the **Export** button
4. Save as CSV or copy the data
5. Import into your new project manually

This is more time-consuming but works if you don't have API access.
