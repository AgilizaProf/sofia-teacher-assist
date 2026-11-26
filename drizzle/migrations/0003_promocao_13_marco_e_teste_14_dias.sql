-- Promoção grátis vai até 13/03/2027 (antes 12/03). Depois dessa data, quem se
-- cadastra ganha 14 dias de Pro antes de o acesso ser reduzido.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _pending public.pending_pro_grants%rowtype;
  _expires timestamptz;
  _promo_until timestamptz := GREATEST('2027-03-13 23:59:59-03'::timestamptz, now() + interval '14 days');
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  ) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;

  -- Promoção: todo novo usuário entra como PRO até 13/03/2027;
  -- depois dessa data, por 14 dias a partir do cadastro.
  INSERT INTO public.subscriptions(user_id, plano, ciclo, status, source, started_at, current_period_end)
  VALUES (NEW.id, 'pro', 'mensal', 'active', 'admin_grant', now(), _promo_until)
    ON CONFLICT (user_id) DO UPDATE
      SET plano = 'pro', ciclo = 'mensal', status = 'active', source = 'admin_grant',
          current_period_end = _promo_until, updated_at = now();

  -- apply pending grant if exists
  SELECT * INTO _pending FROM public.pending_pro_grants WHERE lower(email) = lower(NEW.email) LIMIT 1;
  IF FOUND THEN
    _expires := now() + (_pending.dias || ' days')::interval;
    UPDATE public.subscriptions
      SET plano='pro', ciclo=_pending.ciclo, status='active', source='admin_grant',
          current_period_end=GREATEST(_expires, _promo_until), granted_by=_pending.granted_by, updated_at=now()
      WHERE user_id = NEW.id;
    UPDATE public.pro_grants SET user_id = NEW.id, status='applied'
      WHERE lower(email) = lower(NEW.email) AND status='pending';
    DELETE FROM public.pending_pro_grants WHERE id = _pending.id;
  END IF;

  RETURN NEW;
END;
$function$;

-- Quem já está na promoção com a data antiga passa para 13/03/2027.
UPDATE public.subscriptions
   SET current_period_end = '2027-03-13 23:59:59-03'::timestamptz, updated_at = now()
 WHERE source = 'admin_grant'
   AND current_period_end = '2027-03-12 23:59:59-03'::timestamptz;
