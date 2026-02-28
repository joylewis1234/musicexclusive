
-- Step 1: Drop the 6-param overload of debit_stream_credit
DROP FUNCTION IF EXISTS public.debit_stream_credit(text, uuid, uuid, text, uuid, text);

-- Step 2: Drop the existing 5-param version and recreate with stream_id in return
DROP FUNCTION IF EXISTS public.debit_stream_credit(text, uuid, uuid, text, text);

CREATE OR REPLACE FUNCTION public.debit_stream_credit(
  p_fan_email text,
  p_fan_id uuid,
  p_track_id uuid,
  p_artist_id text,
  p_idempotency_key text
)
RETURNS TABLE (
  new_credits integer,
  already_charged boolean,
  stream_ledger_id uuid,
  stream_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_credits integer;
  v_stream_ledger_id uuid;
  v_stream_id uuid := gen_random_uuid();
  v_reference text := format('stream_%s_%s', p_track_id, p_idempotency_key);
BEGIN
  IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
    RAISE EXCEPTION 'idempotency_key required';
  END IF;

  INSERT INTO public.stream_charges (stream_id, fan_email, track_id, idempotency_key)
  VALUES (v_stream_id, p_fan_email, p_track_id, p_idempotency_key)
  ON CONFLICT ON CONSTRAINT stream_charges_idempotency_key_key DO NOTHING;

  IF NOT FOUND THEN
    SELECT vm.credits INTO updated_credits
    FROM public.vault_members vm
    WHERE vm.email = p_fan_email;

    RETURN QUERY SELECT updated_credits, true, NULL::uuid, NULL::uuid;
    RETURN;
  END IF;

  UPDATE public.vault_members
  SET credits = credits - 1
  WHERE email = p_fan_email AND credits >= 1
  RETURNING credits INTO updated_credits;

  IF updated_credits IS NULL THEN
    RAISE EXCEPTION 'insufficient_credits';
  END IF;

  INSERT INTO public.credit_ledger (user_email, type, credits_delta, usd_delta, reference)
  VALUES
    (p_fan_email, 'STREAM_DEBIT', -1, -0.20, v_reference),
    (p_artist_id, 'ARTIST_EARNING', 0, 0.10, v_reference),
    ('support@musicexclusive.co', 'PLATFORM_EARNING', 0, 0.10, v_reference)
  ON CONFLICT (reference, type, user_email) DO NOTHING;

  INSERT INTO public.stream_ledger (
    fan_id, fan_email, artist_id, track_id,
    credits_spent, amount_total, amount_artist, amount_platform, payout_status
  )
  VALUES (
    p_fan_id, p_fan_email, p_artist_id, p_track_id,
    1, 0.20, 0.10, 0.10, 'pending'
  )
  RETURNING id INTO v_stream_ledger_id;

  UPDATE public.stream_charges
  SET stream_ledger_id = v_stream_ledger_id
  WHERE stream_id = v_stream_id;

  RETURN QUERY SELECT updated_credits, false, v_stream_ledger_id, v_stream_id;
END;
$$;

REVOKE ALL ON FUNCTION public.debit_stream_credit(text, uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.debit_stream_credit(text, uuid, uuid, text, text) TO service_role;

-- Step 3: Create playback_tokens table
CREATE TABLE IF NOT EXISTS public.playback_tokens (
  token_id uuid PRIMARY KEY,
  stream_id uuid NOT NULL REFERENCES public.stream_charges(stream_id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS playback_tokens_stream_id_idx
  ON public.playback_tokens (stream_id);

CREATE INDEX IF NOT EXISTS playback_tokens_consumed_at_idx
  ON public.playback_tokens (consumed_at);

ALTER TABLE public.playback_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage playback tokens"
  ON public.playback_tokens
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);
