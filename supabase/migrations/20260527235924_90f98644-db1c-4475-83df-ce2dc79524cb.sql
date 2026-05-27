
CREATE OR REPLACE FUNCTION public.ensure_referral_code(_uid uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  code text;
  existing text;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _uid THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT referral_code INTO existing FROM public.profiles WHERE user_id = _uid;
  IF existing IS NOT NULL AND length(existing) > 0 THEN
    RETURN existing;
  END IF;
  FOR attempt IN 1..20 LOOP
    code := '';
    FOR i IN 1..7 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    BEGIN
      UPDATE public.profiles SET referral_code = code WHERE user_id = _uid;
      RETURN code;
    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;
  END LOOP;
  RAISE EXCEPTION 'could_not_generate_referral_code';
END;
$function$;

-- Backfill codes for existing users that don't have one
DO $$
DECLARE
  r record;
  code text;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
  ok boolean;
BEGIN
  FOR r IN SELECT user_id FROM public.profiles WHERE referral_code IS NULL OR referral_code = '' LOOP
    ok := false;
    FOR attempt IN 1..20 LOOP
      code := '';
      FOR i IN 1..7 LOOP
        code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
      END LOOP;
      BEGIN
        UPDATE public.profiles SET referral_code = code WHERE user_id = r.user_id;
        ok := true;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        CONTINUE;
      END;
    END LOOP;
  END LOOP;
END $$;
