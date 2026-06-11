
CREATE TABLE IF NOT EXISTS public.referral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text,
  event text NOT NULL,
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_email text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_events_referrer ON public.referral_events(referrer_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_events_code ON public.referral_events(referral_code);

GRANT SELECT ON public.referral_events TO authenticated;
GRANT ALL ON public.referral_events TO service_role;

ALTER TABLE public.referral_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own referral events select" ON public.referral_events;
CREATE POLICY "own referral events select" ON public.referral_events
  FOR SELECT TO authenticated
  USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

-- RPC: registra um evento de funil. Funciona para anon (ex: visita ao /CODIGO) e autenticados.
CREATE OR REPLACE FUNCTION public.log_referral_event(
  _event text,
  _code  text DEFAULT NULL,
  _meta  jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _referrer uuid;
  _caller uuid := auth.uid();
  _code_norm text := nullif(upper(trim(coalesce(_code, ''))), '');
  _id uuid;
BEGIN
  IF _event IS NULL OR length(trim(_event)) = 0 THEN
    RAISE EXCEPTION 'event_required';
  END IF;

  -- Resolve referrer pelo código quando informado; caso contrário, o caller é o referrer
  IF _code_norm IS NOT NULL THEN
    SELECT user_id INTO _referrer FROM public.profiles WHERE referral_code = _code_norm LIMIT 1;
  END IF;

  IF _referrer IS NULL THEN
    _referrer := _caller;
  END IF;

  INSERT INTO public.referral_events(
    referrer_user_id, referral_code, event, referred_user_id, meta
  ) VALUES (
    _referrer,
    _code_norm,
    _event,
    CASE WHEN _caller IS NOT NULL AND _caller <> _referrer THEN _caller ELSE NULL END,
    _meta
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.log_referral_event(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_referral_event(text, text, jsonb) TO anon, authenticated;
