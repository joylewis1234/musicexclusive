-- When Superfan cancels at period end, store the access end time (synced from Stripe webhooks + cancel-superfan function)
ALTER TABLE public.vault_members
ADD COLUMN IF NOT EXISTS subscription_cancel_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.vault_members.subscription_cancel_at IS 'Access end time when cancel_at_period_end is set; cleared when subscription ends';
