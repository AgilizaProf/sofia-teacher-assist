
CREATE OR REPLACE FUNCTION public.ensure_referral_code(_uid uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code text;
  existing text;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _uid THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT referral_code INTO existing FROM public.profiles WHERE user_id = _uid;
  IF existing IS NOT NULL AND length(existing) > 0 THEN
    RETURN existing;
  END IF;
  LOOP
    code := upper(regexp_replace(encode(gen_random_bytes(6), 'base64'), '[^A-Z0-9]', '', 'g'));
    IF length(code) >= 6 THEN
      code := substr(code, 1, 8);
      BEGIN
        UPDATE public.profiles SET referral_code = code WHERE user_id = _uid;
        RETURN code;
      EXCEPTION WHEN unique_violation THEN
        CONTINUE;
      END;
    END IF;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_due_referrals(_uid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _uid THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  FOR r IN
    SELECT * FROM public.referrals
    WHERE credited = false
      AND credit_at <= now()
      AND (referrer_user_id = _uid OR referred_user_id = _uid)
  LOOP
    UPDATE public.profiles SET bonus_days_total = bonus_days_total + r.referrer_bonus_days
      WHERE user_id = r.referrer_user_id;
    UPDATE public.profiles SET bonus_days_total = bonus_days_total + r.referred_bonus_days
      WHERE user_id = r.referred_user_id;
    UPDATE public.referrals SET credited = true, credited_at = now() WHERE id = r.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_referral_code(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.process_due_referrals(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_referral_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_due_referrals(uuid) TO authenticated;
