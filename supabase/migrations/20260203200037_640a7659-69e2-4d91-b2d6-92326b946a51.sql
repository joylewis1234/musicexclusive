-- Drop the existing check constraint and add a new one with all valid types
ALTER TABLE public.credit_ledger DROP CONSTRAINT IF EXISTS credit_ledger_type_check;

-- Add the updated check constraint with all transaction types
ALTER TABLE public.credit_ledger 
ADD CONSTRAINT credit_ledger_type_check 
CHECK (type IN ('CREDITS_PURCHASE', 'SUBSCRIPTION_CREDITS', 'STREAM_DEBIT', 'ARTIST_EARNING', 'PLATFORM_EARNING', 'PAYOUT'));