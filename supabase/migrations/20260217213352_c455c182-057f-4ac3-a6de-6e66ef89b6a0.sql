
-- 0) Remove duplicate ledger entry
DELETE FROM public.credit_ledger
WHERE id = 'd75dfc48-b1eb-408f-97bd-f43217f9c08a';

-- 1) Prevent negative credits
ALTER TABLE public.vault_members
ADD CONSTRAINT credits_non_negative CHECK (credits >= 0);

-- 2) Ledger dedupe index
CREATE UNIQUE INDEX credit_ledger_ref_type_user_unique
ON public.credit_ledger (reference, type, user_email)
WHERE reference IS NOT NULL;

-- 3) Idempotency tracking table
CREATE TABLE public.stream_charges (
  stream_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_email text NOT NULL,
  track_id uuid NOT NULL,
  stream_ledger_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stream_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage stream charges"
  ON public.stream_charges FOR ALL
  USING ((auth.jwt() ->> 'role') = 'service_role')
  WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

CREATE POLICY "Admins can view stream charges"
  ON public.stream_charges FOR SELECT
  USING (has_role(auth.uid(), 'admin'));
