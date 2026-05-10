
-- ============ ROLES ============
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ SUBSCRIPTIONS ============
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plano text NOT NULL DEFAULT 'free' CHECK (plano IN ('free','pro')),
  ciclo text CHECK (ciclo IN ('mensal','anual','cortesia')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','canceled','expired','pending')),
  source text NOT NULL DEFAULT 'signup' CHECK (source IN ('signup','admin_grant','stripe','paddle')),
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own subscription" ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage subscriptions" ON public.subscriptions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_subscriptions_updated
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PRO GRANTS HISTORY ============
CREATE TABLE public.pro_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ciclo text NOT NULL CHECK (ciclo IN ('mensal','anual','cortesia')),
  dias integer NOT NULL DEFAULT 30,
  motivo text,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'applied' CHECK (status IN ('applied','pending','revoked')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pro_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read grants" ON public.pro_grants FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins write grants" ON public.pro_grants FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ PENDING GRANTS (email not signed up yet) ============
CREATE TABLE public.pending_pro_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  ciclo text NOT NULL,
  dias integer NOT NULL DEFAULT 30,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pending_pro_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage pending" ON public.pending_pro_grants FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ MAINTENANCE WINDOWS ============
CREATE TABLE public.maintenance_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  block_access boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.maintenance_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads maintenance" ON public.maintenance_windows FOR SELECT USING (true);
CREATE POLICY "admins manage maintenance" ON public.maintenance_windows FOR ALL
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_maintenance_updated
  BEFORE UPDATE ON public.maintenance_windows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PLATFORM ERRORS ============
CREATE TABLE public.platform_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  route text,
  message text NOT NULL,
  stack text,
  severity text NOT NULL DEFAULT 'error' CHECK (severity IN ('info','warn','error','fatal')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can report errors" ON public.platform_errors FOR INSERT
  WITH CHECK (true);
CREATE POLICY "admins read errors" ON public.platform_errors FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update errors" ON public.platform_errors FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_errors_created ON public.platform_errors(created_at DESC);
CREATE INDEX idx_errors_severity ON public.platform_errors(severity);

-- ============ ACTIVITY EVENTS ============
CREATE TABLE public.activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  route text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own events" ON public.activity_events FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "users read own events" ON public.activity_events FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_activity_user ON public.activity_events(user_id);
CREATE INDEX idx_activity_created ON public.activity_events(created_at DESC);
CREATE INDEX idx_activity_type ON public.activity_events(event_type);

-- ============ PAGE VISITS ============
CREATE TABLE public.page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  route text NOT NULL,
  referrer text,
  device_type text CHECK (device_type IN ('mobile','tablet','desktop')),
  os text,
  browser text,
  viewport_w integer,
  viewport_h integer,
  is_login_page boolean NOT NULL DEFAULT false,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can log visits" ON public.page_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "admins read visits" ON public.page_visits FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_visits_created ON public.page_visits(created_at DESC);
CREATE INDEX idx_visits_session ON public.page_visits(session_id);
CREATE INDEX idx_visits_login ON public.page_visits(is_login_page) WHERE is_login_page = true;

-- ============ ADMIN GRANT PRO ============
CREATE OR REPLACE FUNCTION public.admin_grant_pro(
  _email text,
  _ciclo text,
  _dias integer DEFAULT 30,
  _motivo text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _target uuid;
  _expires timestamptz;
  _email_lower text := lower(trim(_email));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;
  IF _ciclo NOT IN ('mensal','anual','cortesia') THEN
    RAISE EXCEPTION 'invalid ciclo';
  END IF;

  _expires := now() + (_dias || ' days')::interval;

  SELECT user_id INTO _target FROM public.profiles WHERE lower(email) = _email_lower LIMIT 1;

  IF _target IS NULL THEN
    INSERT INTO public.pending_pro_grants(email, ciclo, dias, granted_by)
    VALUES (_email_lower, _ciclo, _dias, auth.uid())
    ON CONFLICT (email) DO UPDATE SET ciclo = excluded.ciclo, dias = excluded.dias, granted_by = excluded.granted_by, created_at = now();
    INSERT INTO public.pro_grants(email, user_id, ciclo, dias, motivo, granted_by, status, expires_at)
    VALUES (_email_lower, NULL, _ciclo, _dias, _motivo, auth.uid(), 'pending', _expires);
    RETURN jsonb_build_object('status','pending','email',_email_lower);
  END IF;

  INSERT INTO public.subscriptions(user_id, plano, ciclo, status, source, started_at, current_period_end, granted_by)
  VALUES (_target, 'pro', _ciclo, 'active', 'admin_grant', now(), _expires, auth.uid())
  ON CONFLICT (user_id) DO UPDATE
    SET plano = 'pro', ciclo = _ciclo, status = 'active', source = 'admin_grant',
        current_period_end = _expires, granted_by = auth.uid(), updated_at = now();

  INSERT INTO public.pro_grants(email, user_id, ciclo, dias, motivo, granted_by, status, expires_at)
  VALUES (_email_lower, _target, _ciclo, _dias, _motivo, auth.uid(), 'applied', _expires);

  RETURN jsonb_build_object('status','applied','user_id',_target,'expires_at',_expires);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_revoke_pro(_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.subscriptions SET plano='free', ciclo=NULL, status='canceled', updated_at=now()
    WHERE user_id = _user_id;
  UPDATE public.pro_grants SET status='revoked' WHERE user_id = _user_id AND status='applied';
END;
$$;

-- ============ HOOK INTO handle_new_user ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _pending public.pending_pro_grants%rowtype;
  _expires timestamptz;
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))
  ) ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;

  -- default free subscription
  INSERT INTO public.subscriptions(user_id, plano, status, source) VALUES (NEW.id, 'free', 'active', 'signup')
    ON CONFLICT (user_id) DO NOTHING;

  -- apply pending grant if exists
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ BACKFILL existing users ============
INSERT INTO public.user_roles(user_id, role)
  SELECT user_id, 'user' FROM public.profiles ON CONFLICT DO NOTHING;
INSERT INTO public.subscriptions(user_id, plano, status, source)
  SELECT user_id, 'free', 'active', 'signup' FROM public.profiles ON CONFLICT DO NOTHING;

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_errors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_windows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
