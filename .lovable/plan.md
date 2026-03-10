

## Add columns to artist_agreement_acceptances

The table already has `agreement_version`, `ip_address`, and `user_agent`. Only 3 new columns need adding, plus `signed_at`.

### Migration SQL

```sql
ALTER TABLE artist_agreement_acceptances
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS artist_name text,
  ADD COLUMN IF NOT EXISTS pdf_storage_key text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz DEFAULT now();
```

This is additive only — no existing columns or data are modified. The `IF NOT EXISTS` guard prevents errors if re-run.

### No code changes required

These columns are not yet referenced in any frontend code. The existing `useArtistAgreement` hook and `ArtistAgreementAccept` page will continue to work unchanged. When you're ready to use these new fields (e.g., capturing legal name in the agreement form or generating PDFs), that would be a separate task.

