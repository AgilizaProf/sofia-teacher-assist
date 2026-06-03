-- Fix: o cadastro por e-mail/senha grava o nome digitado como `full_name`
-- (Auth.tsx), mas handle_new_user só lia `display_name`/`name`, caindo no
-- fallback split_part(email,'@',1). Aqui adicionamos `full_name` ao COALESCE
-- (resto da função intacto) e fazemos backfill dos já cadastrados.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _pending public.pending_pro_grants%rowtype;
  _expires timestamptz;
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    )
  ) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;

  INSERT INTO public.subscriptions(user_id, plano, status, source) VALUES (NEW.id, 'free', 'active', 'signup')
    ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO _pending FROM public.pending_pro_grants WHERE lower(email) = lower(NEW.email) LIMIT 1;
  IF FOUND THEN
    _expires := now() + (_pending.dias || ' days')::interval;
    UPDATE public.subscriptions
      SET plano='pro', ciclo=_pending.ciclo, status='active', source='admin_grant',
          current_period_end=_expires, granted_by=_pending.granted_by, updated_at=now()
      WHERE user_id = NEW.id;
    UPDATE public.pro_grants SET user_id = NEW.id, status='applied'
      WHERE lower(email) = lower(NEW.email) AND status='pending';
    DELETE FROM public.pending_pro_grants WHERE id = _pending.id;
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.profiles p
SET display_name = COALESCE(
      u.raw_user_meta_data->>'full_name',
      u.raw_user_meta_data->>'name',
      p.display_name
    )
FROM auth.users u
WHERE u.id = p.user_id
  AND p.display_name = split_part(p.email, '@', 1)
  AND COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') IS NOT NULL
  AND COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') <> split_part(p.email, '@', 1);
