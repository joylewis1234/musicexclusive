ALTER TABLE artist_agreement_acceptances
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS artist_name text,
  ADD COLUMN IF NOT EXISTS pdf_storage_key text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz DEFAULT now();