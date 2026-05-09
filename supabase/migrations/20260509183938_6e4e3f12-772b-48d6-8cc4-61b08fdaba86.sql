
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by_code text,
  ADD COLUMN IF NOT EXISTS bonus_days_total integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  referral_code text NOT NULL,
  plan text NOT NULL CHECK (plan IN ('mensal','anual')),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  credit_at timestamptz NOT NULL,
  referrer_bonus_days integer NOT NULL,
  referred_bonus_days integer NOT NULL,
  credited boolean NOT NULL DEFAULT false,
  credited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_user_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ref own select" ON public.referrals;
CREATE POLICY "ref own select" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

DROP POLICY IF EXISTS "ref own insert" ON public.referrals;
CREATE POLICY "ref own insert" ON public.referrals
  FOR INSERT WITH CHECK (auth.uid() = referred_user_id);

DROP POLICY IF EXISTS "ref own update" ON public.referrals;
CREATE POLICY "ref own update" ON public.referrals
  FOR UPDATE USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

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
