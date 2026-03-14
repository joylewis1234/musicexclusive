

## Delete the export-data-migration Edge Function

Remove the `supabase/functions/export-data-migration/index.ts` file since the data migration SQL has been downloaded and this function exposes raw database contents.

### Changes
1. Delete `supabase/functions/export-data-migration/index.ts`
2. Remove any `[functions.export-data-migration]` config from `supabase/config.toml` (if present)

