-- Add transactional RPC to apply credits + ledger entry atomically
CREATE OR REPLACE FUNCTION public.apply_credit_purchase(
  p_email text,
  p_credits integer,
  p_ledger_type text,
  p_reference text,
  p_usd numeric,
  p_set_superfan boolean DEFAULT false,
  p_set_superfan_since boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_email IS NULL OR length(trim(p_email)) = 0 THEN
    RAISE EXCEPTION 'email required';
  END IF;
  IF p_credits IS NULL OR p_credits <= 0 THEN
    RAISE EXCEPTION 'credits must be positive';
  END IF;

  INSERT INTO public.vault_members (
    email,
    display_name,
    credits,
    vault_access_active,
    membership_type,
    superfan_active,
    superfan_since
  )
  VALUES (
    p_email,
    split_part(p_email, '@', 1),
    p_credits,
    true,
    CASE WHEN p_set_superfan THEN 'superfan' ELSE 'pay_as_you_go' END,
    p_set_superfan,
    CASE WHEN p_set_superfan_since THEN now() ELSE NULL END
  )
  ON CONFLICT (email) DO UPDATE
  SET
    credits = public.vault_members.credits + EXCLUDED.credits,
    vault_access_active = true,
    membership_type = CASE
      WHEN p_set_superfan THEN 'superfan'
      ELSE public.vault_members.membership_type
    END,
    superfan_active = CASE
      WHEN p_set_superfan THEN true
      ELSE public.vault_members.superfan_active
    END,
    superfan_since = CASE
      WHEN p_set_superfan_since THEN now()
      ELSE public.vault_members.superfan_since
    END;

  INSERT INTO public.credit_ledger (
    user_email,
    type,
    credits_delta,
    usd_delta,
    reference
  )
  VALUES (
    p_email,
    p_ledger_type,
    p_credits,
    p_usd,
    p_reference
  );
END;
$$;

REVOKE ALL ON FUNCTION public.apply_credit_purchase(text, integer, text, text, numeric, boolean, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_credit_purchase(text, integer, text, text, numeric, boolean, boolean) TO service_role;