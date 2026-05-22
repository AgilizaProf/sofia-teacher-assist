
-- 1. Tighten INSERT policies on logging tables (remove WITH CHECK (true))
DROP POLICY IF EXISTS "anyone can log visits" ON public.page_visits;
CREATE POLICY "log visits scoped to self or anon"
ON public.page_visits FOR INSERT TO anon, authenticated
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "anyone can report errors" ON public.platform_errors;
CREATE POLICY "report errors scoped to self or anon"
ON public.platform_errors FOR INSERT TO anon, authenticated
WITH CHECK (
  (user_id IS NULL OR auth.uid() = user_id)
  AND length(message) BETWEEN 1 AND 4000
);

DROP POLICY IF EXISTS "anyone can log reset attempts" ON public.password_reset_attempts;
CREATE POLICY "log reset attempts with valid email"
ON public.password_reset_attempts FOR INSERT TO anon, authenticated
WITH CHECK (length(email) BETWEEN 3 AND 320);

-- 2. Remove client-side UPDATE on referrals (server-side only via process_due_referrals)
DROP POLICY IF EXISTS "ref own update" ON public.referrals;

-- 3. Defense-in-depth: ensure credit functions cannot be invoked for other users
CREATE OR REPLACE FUNCTION public.consumir_creditos(_user_id uuid, _quantidade integer, _descricao text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _row public.creditos_usuario%ROWTYPE;
  _saldo integer;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _quantidade <= 0 THEN
    RAISE EXCEPTION 'quantidade_invalida';
  END IF;

  SELECT * INTO _row FROM public.creditos_usuario
    WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'creditos_nao_inicializados';
  END IF;

  _saldo := _row.creditos_totais - _row.creditos_utilizados;
  IF _saldo < _quantidade THEN
    RAISE EXCEPTION 'creditos_insuficientes' USING HINT = _saldo::text;
  END IF;

  UPDATE public.creditos_usuario
     SET creditos_utilizados = creditos_utilizados + _quantidade,
         updated_at = now()
   WHERE user_id = _user_id;

  _saldo := _saldo - _quantidade;

  INSERT INTO public.creditos_historico(user_id, tipo, quantidade, descricao, saldo_apos)
    VALUES (_user_id, 'uso', -_quantidade, _descricao, _saldo);

  RETURN jsonb_build_object('saldo', _saldo, 'consumido', _quantidade);
END; $function$;

-- garantir_creditos_usuario: add auth.uid() check (preserves original body)
CREATE OR REPLACE FUNCTION public.garantir_creditos_usuario(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _sub record;
  _plano text := 'free';
  _ciclo text;
  _base integer;
  _row public.creditos_usuario%ROWTYPE;
  _now_brt timestamptz := now();
  _today_brt date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  _ano integer := EXTRACT(YEAR FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int;
  _mes integer := EXTRACT(MONTH FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int;
  _aniversario date;
  _saldo integer;
  _bonus_mes boolean := _mes IN (1,6,12);
  _bonus_valor integer := 500;
  _bonus_nome text;
  _ultima_sexta_14h timestamptz;
  _ultima_sexta_data date;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  _ultima_sexta_data := _today_brt - ((EXTRACT(DOW FROM _today_brt)::int - 5 + 7) % 7);
  _ultima_sexta_14h := ((_ultima_sexta_data::text || ' 14:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo');
  IF _now_brt < _ultima_sexta_14h THEN
    _ultima_sexta_data := _ultima_sexta_data - 7;
    _ultima_sexta_14h := ((_ultima_sexta_data::text || ' 14:00:00')::timestamp AT TIME ZONE 'America/Sao_Paulo');
  END IF;

  SELECT plano, ciclo, started_at, current_period_end, status INTO _sub FROM public.subscriptions WHERE user_id = _user_id;
  IF FOUND THEN
    _plano := COALESCE(_sub.plano, 'free');
    _ciclo := _sub.ciclo;
  END IF;

  IF _plano = 'pro' AND _ciclo = 'anual' THEN _base := 18000;
  ELSIF _plano = 'pro' THEN _base := 1500;
  ELSE _base := 75;
  END IF;

  SELECT * INTO _row FROM public.creditos_usuario WHERE user_id = _user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.creditos_usuario(user_id, creditos_totais, creditos_utilizados, ano_referencia, mes_referencia, data_renovacao, plano_snapshot, ciclo_snapshot)
    VALUES (_user_id, _base, 0, _ano, _mes, CASE WHEN _plano = 'free' THEN _ultima_sexta_data ELSE _today_brt END, _plano, _ciclo)
    RETURNING * INTO _row;

    INSERT INTO public.creditos_historico(user_id, tipo, quantidade, descricao, saldo_apos)
      VALUES (_user_id, 'renovacao', _base,
              CASE WHEN _plano='pro' AND _ciclo='anual' THEN 'Créditos anuais do plano'
                   WHEN _plano='pro' THEN 'Créditos mensais do plano'
                   ELSE 'Créditos semanais do plano gratuito' END, _base);
  END IF;

  IF _row.plano_snapshot <> _plano OR COALESCE(_row.ciclo_snapshot,'') <> COALESCE(_ciclo,'') THEN
    UPDATE public.creditos_usuario
       SET plano_snapshot = _plano, ciclo_snapshot = _ciclo, creditos_totais = _base,
           creditos_utilizados = 0, ano_referencia = _ano, mes_referencia = _mes,
           data_renovacao = CASE WHEN _plano = 'free' THEN _ultima_sexta_data ELSE _today_brt END,
           ultimo_bonus_mes = NULL, ultimo_bonus_ano = NULL, updated_at = now()
     WHERE user_id = _user_id RETURNING * INTO _row;
    INSERT INTO public.creditos_historico(user_id, tipo, quantidade, descricao, saldo_apos)
      VALUES (_user_id, 'renovacao', _base, 'Mudança de plano: ' || _plano || COALESCE('/'||_ciclo,''), _base);
  END IF;

  IF _plano = 'pro' AND _ciclo = 'anual' THEN
    _aniversario := make_date(_ano, EXTRACT(MONTH FROM _row.data_renovacao)::int, LEAST(EXTRACT(DAY FROM _row.data_renovacao)::int, 28));
    IF _aniversario <= _today_brt AND _row.ano_referencia < _ano THEN
      UPDATE public.creditos_usuario
         SET creditos_totais = 18000, creditos_utilizados = 0, ano_referencia = _ano,
             mes_referencia = _mes, data_renovacao = _aniversario,
             ultimo_bonus_mes = NULL, ultimo_bonus_ano = NULL, updated_at = now()
       WHERE user_id = _user_id RETURNING * INTO _row;
      INSERT INTO public.creditos_historico(user_id, tipo, quantidade, descricao, saldo_apos)
        VALUES (_user_id, 'renovacao', 18000, 'Renovação anual ' || _ano, 18000);
    END IF;
  ELSIF _plano = 'pro' THEN
    IF _row.ano_referencia <> _ano OR _row.mes_referencia <> _mes THEN
      UPDATE public.creditos_usuario
         SET creditos_totais = _base, creditos_utilizados = 0, ano_referencia = _ano,
             mes_referencia = _mes, ultimo_bonus_mes = NULL, ultimo_bonus_ano = NULL, updated_at = now()
       WHERE user_id = _user_id RETURNING * INTO _row;
      INSERT INTO public.creditos_historico(user_id, tipo, quantidade, descricao, saldo_apos)
        VALUES (_user_id, 'reset_mensal', _base, 'Renovação mensal', _base);
    END IF;
  ELSE
    IF _row.data_renovacao IS NULL OR _row.data_renovacao < _ultima_sexta_data THEN
      UPDATE public.creditos_usuario
         SET creditos_totais = _base, creditos_utilizados = 0, ano_referencia = _ano,
             mes_referencia = _mes, data_renovacao = _ultima_sexta_data,
             ultimo_bonus_mes = NULL, ultimo_bonus_ano = NULL, updated_at = now()
       WHERE user_id = _user_id RETURNING * INTO _row;
      INSERT INTO public.creditos_historico(user_id, tipo, quantidade, descricao, saldo_apos)
        VALUES (_user_id, 'reset_semanal', _base, 'Renovação semanal (sexta-feira)', _base);
    END IF;
  END IF;

  IF _plano = 'pro' AND _ciclo = 'anual' AND _bonus_mes
     AND (_row.ultimo_bonus_mes IS DISTINCT FROM _mes OR _row.ultimo_bonus_ano IS DISTINCT FROM _ano)
  THEN
    _bonus_nome := CASE _mes
      WHEN 1 THEN '🎁 Bônus de Planejamento Anual'
      WHEN 6 THEN '🎁 Bônus de Fechamento de Semestre'
      WHEN 12 THEN '🎁 Bônus de Encerramento do Ano'
    END;
    PERFORM public.aplicar_bonus_credito(_user_id, _bonus_valor, _bonus_nome, _mes, _ano);
    SELECT * INTO _row FROM public.creditos_usuario WHERE user_id = _user_id;
  END IF;

  _saldo := _row.creditos_totais - _row.creditos_utilizados;
  RETURN jsonb_build_object(
    'creditos_totais', _row.creditos_totais,
    'creditos_utilizados', _row.creditos_utilizados,
    'creditos_disponiveis', _saldo,
    'plano', _plano, 'ciclo', _ciclo,
    'ano_referencia', _row.ano_referencia,
    'mes_referencia', _row.mes_referencia,
    'data_renovacao', _row.data_renovacao,
    'ultimo_bonus_mes', _row.ultimo_bonus_mes,
    'ultimo_bonus_ano', _row.ultimo_bonus_ano
  );
END; $function$;

-- 4. Revoke EXECUTE on SECURITY DEFINER functions where not needed
REVOKE EXECUTE ON FUNCTION public.admin_grant_pro(text, text, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_pro(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.aplicar_bonus_credito(uuid, integer, text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consumir_creditos(uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.garantir_creditos_usuario(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ai_month_usage_brl(uuid) FROM authenticated;

-- 5. Remove sensitive tables from realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='platform_errors') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.platform_errors';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='subscriptions') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.subscriptions';
  END IF;
END $$;

-- 6. Channel-level authorization on realtime.messages
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can read own topic" ON realtime.messages;
CREATE POLICY "authenticated can read own topic"
ON realtime.messages FOR SELECT TO authenticated
USING (
  -- Allow user-scoped topics (suffix is the user's uuid) and admin-only channels
  (realtime.topic() LIKE '%' || auth.uid()::text)
  OR realtime.topic() IN ('maint-watch')
  OR (realtime.topic() IN ('act-watch','admin-ai-usage') AND public.has_role(auth.uid(), 'admin'::public.app_role))
  OR realtime.topic() = ('rt-user-' || auth.uid()::text)
);

DROP POLICY IF EXISTS "authenticated can write own topic" ON realtime.messages;
CREATE POLICY "authenticated can write own topic"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  (realtime.topic() LIKE '%' || auth.uid()::text)
  OR realtime.topic() = ('rt-user-' || auth.uid()::text)
);
