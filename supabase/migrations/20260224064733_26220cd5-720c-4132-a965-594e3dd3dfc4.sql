
-- Transactional RPC to atomically debit 1 credit and write all ledger entries
-- Eliminates multi-step write contention in charge-stream edge function
CREATE OR REPLACE FUNCTION public.debit_stream_credit(
  p_fan_email text,
  p_fan_user_id uuid,
  p_track_id uuid,
  p_artist_id text,
  p_stream_charge_id uuid,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id uuid;
  v_new_credits integer;
  v_stream_reference text;
  v_stream_ledger_id uuid;
BEGIN
  -- 1. Atomic credit deduction: UPDATE only if credits >= 1
  UPDATE vault_members
  SET credits = credits - 1,
      updated_at = now()
  WHERE email = p_fan_email
    AND vault_access_active = true
    AND credits >= 1
  RETURNING id, credits INTO v_member_id, v_new_credits;

  IF v_member_id IS NULL THEN
    -- Could be: no member, inactive, or insufficient credits
    -- Caller should check vault state separately for proper error codes
    RETURN jsonb_build_object('success', false, 'reason', 'debit_failed');
  END IF;

  -- 2. Generate unique stream reference
  v_stream_reference := 'stream_' || p_track_id::text || '_' || extract(epoch from now())::bigint::text;

  -- 3. Insert credit_ledger entries
  INSERT INTO credit_ledger (user_email, type, credits_delta, usd_delta, reference)
  VALUES (p_fan_email, 'STREAM_DEBIT', -1, -0.20, v_stream_reference);

  INSERT INTO credit_ledger (user_email, type, credits_delta, usd_delta, reference)
  VALUES (p_artist_id, 'ARTIST_EARNING', 0, 0.10, v_stream_reference);

  INSERT INTO credit_ledger (user_email, type, credits_delta, usd_delta, reference)
  VALUES ('platform@musicexclusive.com', 'PLATFORM_EARNING', 0, 0.10, v_stream_reference);

  -- 4. Insert stream_ledger entry
  INSERT INTO stream_ledger (fan_id, fan_email, artist_id, track_id, credits_spent, amount_total, amount_artist, amount_platform, payout_status)
  VALUES (p_fan_user_id, p_fan_email, p_artist_id, p_track_id, 1, 0.20, 0.10, 0.10, 'pending')
  RETURNING id INTO v_stream_ledger_id;

  -- 5. Link stream_charges to stream_ledger
  UPDATE stream_charges
  SET stream_ledger_id = v_stream_ledger_id
  WHERE stream_id = p_stream_charge_id;

  RETURN jsonb_build_object(
    'success', true,
    'newCredits', v_new_credits,
    'streamLedgerId', v_stream_ledger_id
  );
END;
$$;
