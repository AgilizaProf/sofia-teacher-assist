-- =====================================================================
-- CONVIDE E GANHE — recompensa real (acesso + créditos), para ambos os lados
-- ---------------------------------------------------------------------
-- Modelo confirmado:
--   Indicado compra ANUAL  -> referrer e referred ganham +30 dias de acesso
--                             (Pro temporário) + 1500 créditos persistentes
--   Indicado compra MENSAL -> +7 dias de acesso (Pro temporário)
--                             + 375 créditos persistentes
-- Os créditos PERSISTEM entre renovações (não somem no reset semanal/mensal).
-- O acesso é Pro temporário com source='referral_bonus', que expira sozinho.
-- Gatilho: compra confirmada no webhook (insere em referrals) OU concessão
--          manual/admin. O crédito efetivo acontece após credit_at (carência).
-- =====================================================================

-- 0) AMPLIA o CHECK de subscriptions.source -------------------------
--    O CHECK original era fechado em ('signup','admin_grant','stripe','paddle').
--    A produção já usa 'mercadopago' (webhook) e agora precisamos de
--    'referral_bonus' para o Pro temporário de indicação. Recriamos o CHECK
--    de forma idempotente incluindo todos os valores conhecidos. Sem isso, a
--    concessão de acesso por indicação a usuários free quebraria no INSERT.
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_source_check;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_source_check
  CHECK (source = ANY (ARRAY['signup','admin_grant','stripe','paddle','mercadopago','referral_bonus']));

-- 0b) creditos_historico.tipo precisa aceitar 'reset_semanal' -----------
--    garantir_creditos_usuario insere tipo='reset_semanal' na renovação do
--    plano free, mas o CHECK original não previa esse valor (bomba-relógio:
--    quebraria a renovação semanal). Recriamos o CHECK incluindo-o.
ALTER TABLE public.creditos_historico DROP CONSTRAINT IF EXISTS creditos_historico_tipo_check;
ALTER TABLE public.creditos_historico
  ADD CONSTRAINT creditos_historico_tipo_check
  CHECK (tipo = ANY (ARRAY['uso','bonus','renovacao','reset_mensal','reset_semanal','compra','ajuste']));

-- 1) Saldo de bônus PERSISTENTE em creditos_usuario -------------------
ALTER TABLE public.creditos_usuario
  ADD COLUMN IF NOT EXISTS creditos_bonus_persistente integer NOT NULL DEFAULT 0;

-- 2) Colunas de crédito + idempotência por lado em referrals ----------
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS referrer_bonus_credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referred_bonus_credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referrer_credited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referred_credited boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'webhook';

-- 3) Helper: adiciona créditos PERSISTENTES (sobrevivem ao reset) ------
--    Soma tanto no saldo do período atual (uso imediato) quanto no
--    acumulador persistente (reaplicado a cada renovação).
CREATE OR REPLACE FUNCTION public.adicionar_creditos_bonus_persistente(
  _user_id uuid,
  _quantidade integer,
  _descricao text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.creditos_usuario%ROWTYPE;
  _saldo integer;
BEGIN
  IF _quantidade IS NULL OR _quantidade <= 0 THEN
    RETURN jsonb_build_object('aplicado', false, 'motivo', 'quantidade_invalida');
  END IF;

  -- Garante a linha base antes de creditar (sem depender de auth.uid()).
  SELECT * INTO _row FROM public.creditos_usuario WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.creditos_usuario(
      user_id, creditos_totais, creditos_utilizados,
      ano_referencia, mes_referencia, data_renovacao, plano_snapshot
    )
    VALUES (
      _user_id, 0, 0,
      EXTRACT(YEAR FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int,
      EXTRACT(MONTH FROM (now() AT TIME ZONE 'America/Sao_Paulo'))::int,
      (now() AT TIME ZONE 'America/Sao_Paulo')::date,
      'free'
    )
    ON CONFLICT (user_id) DO NOTHING;
    SELECT * INTO _row FROM public.creditos_usuario WHERE user_id = _user_id FOR UPDATE;
  END IF;

  UPDATE public.creditos_usuario
     SET creditos_totais = creditos_totais + _quantidade,
         creditos_bonus_persistente = creditos_bonus_persistente + _quantidade,
         updated_at = now()
   WHERE user_id = _user_id
   RETURNING * INTO _row;

  _saldo := _row.creditos_totais - _row.creditos_utilizados;
  INSERT INTO public.creditos_historico(user_id, tipo, quantidade, descricao, saldo_apos)
    VALUES (_user_id, 'bonus', _quantidade, _descricao, _saldo);

  RETURN jsonb_build_object('aplicado', true, 'saldo', _saldo, 'bonus', _quantidade);
END; $$;

REVOKE ALL ON FUNCTION public.adicionar_creditos_bonus_persistente(uuid, integer, text)
  FROM PUBLIC, anon, authenticated;

-- 4) Helper: concede/estende ACESSO Pro temporário (expira sozinho) ----
--    Se já houver assinatura paga vigente (mercadopago/admin_grant), soma os
--    dias ao current_period_end existente, preservando a origem. Caso
--    contrário, cria/usa uma assinatura source='referral_bonus'.
CREATE OR REPLACE FUNCTION public.conceder_acesso_bonus_dias(
  _user_id uuid,
  _dias integer
) RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sub public.subscriptions%ROWTYPE;
  _base timestamptz;
  _novo_fim timestamptz;
BEGIN
  IF _dias IS NULL OR _dias <= 0 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO _sub FROM public.subscriptions WHERE user_id = _user_id FOR UPDATE;

  IF FOUND
     AND _sub.plano = 'pro'
     AND _sub.source IN ('mercadopago','admin_grant')
     AND _sub.current_period_end IS NOT NULL
     AND _sub.current_period_end > now()
  THEN
    -- Assinatura paga vigente: apenas estende a data, mantém a origem.
    _novo_fim := _sub.current_period_end + make_interval(days => _dias);
    UPDATE public.subscriptions
       SET current_period_end = _novo_fim,
           updated_at = now(),
           metadata = COALESCE(metadata, '{}'::jsonb)
                      || jsonb_build_object('referral_bonus_days_added', _dias)
     WHERE user_id = _user_id;
    RETURN _novo_fim;
  END IF;

  -- Sem assinatura paga vigente: cria/estende um Pro temporário de indicação.
  _base := GREATEST(
    now(),
    COALESCE(
      CASE WHEN FOUND AND _sub.source = 'referral_bonus'
                AND _sub.current_period_end IS NOT NULL
           THEN _sub.current_period_end ELSE now() END,
      now()
    )
  );
  _novo_fim := _base + make_interval(days => _dias);

  INSERT INTO public.subscriptions(
    user_id, plano, ciclo, status, source, started_at, current_period_end, metadata, updated_at
  )
  VALUES (
    _user_id, 'pro', NULL, 'active', 'referral_bonus', now(), _novo_fim,
    jsonb_build_object('granted_via', 'referral', 'bonus_days', _dias), now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET plano = 'pro',
        status = 'active',
        source = 'referral_bonus',
        current_period_end = _novo_fim,
        metadata = COALESCE(public.subscriptions.metadata, '{}'::jsonb)
                   || jsonb_build_object('granted_via', 'referral', 'bonus_days', _dias),
        updated_at = now();

  RETURN _novo_fim;
END; $$;

REVOKE ALL ON FUNCTION public.conceder_acesso_bonus_dias(uuid, integer)
  FROM PUBLIC, anon, authenticated;

-- 5) garantir_creditos_usuario: dobra o bônus persistente em todos os resets
--    (única alteração: creditos_totais passa a incluir creditos_bonus_persistente)
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
  _user_created timestamptz;
  _trial_ate date;
  _em_trial boolean := false;
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

  -- Determina se usuário está em trial (somente plano free, dentro dos 14 dias após criação da conta)
  IF _plano = 'free' THEN
    SELECT created_at INTO _user_created FROM auth.users WHERE id = _user_id;
    IF _user_created IS NOT NULL THEN
      _trial_ate := ((_user_created AT TIME ZONE 'America/Sao_Paulo')::date) + 14;
      IF _today_brt <= _trial_ate THEN
        _em_trial := true;
      END IF;
    END IF;
  END IF;

  IF _plano = 'pro' AND _ciclo = 'anual' THEN _base := 18000;
  ELSIF _plano = 'pro' THEN _base := 1500;
  ELSIF _em_trial THEN _base := 1000;
  ELSE _base := 75;
  END IF;

  SELECT * INTO _row FROM public.creditos_usuario WHERE user_id = _user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.creditos_usuario(user_id, creditos_totais, creditos_utilizados, ano_referencia, mes_referencia, data_renovacao, plano_snapshot, ciclo_snapshot, trial_ate)
    VALUES (_user_id, _base + COALESCE(_row.creditos_bonus_persistente,0), 0, _ano, _mes,
            CASE WHEN _em_trial THEN _trial_ate
                 WHEN _plano = 'free' THEN _ultima_sexta_data
                 ELSE _today_brt END,
            CASE WHEN _em_trial THEN 'trial' ELSE _plano END,
            _ciclo,
            CASE WHEN _em_trial THEN _trial_ate ELSE NULL END)
    RETURNING * INTO _row;

    INSERT INTO public.creditos_historico(user_id, tipo, quantidade, descricao, saldo_apos)
      VALUES (_user_id, 'renovacao', _base,
              CASE WHEN _em_trial THEN 'Créditos do período de avaliação (14 dias)'
                   WHEN _plano='pro' AND _ciclo='anual' THEN 'Créditos anuais do plano'
                   WHEN _plano='pro' THEN 'Créditos mensais do plano'
                   ELSE 'Créditos semanais do plano gratuito' END, _base);
  END IF;

  -- Snapshot esperado
  DECLARE _snap_esperado text := CASE WHEN _em_trial THEN 'trial' ELSE _plano END;
  BEGIN
    IF _row.plano_snapshot <> _snap_esperado OR COALESCE(_row.ciclo_snapshot,'') <> COALESCE(_ciclo,'') THEN
      -- Transição: trial -> free (fim do trial) ou mudança de plano
      UPDATE public.creditos_usuario
         SET plano_snapshot = _snap_esperado, ciclo_snapshot = _ciclo, creditos_totais = _base + COALESCE(_row.creditos_bonus_persistente,0),
             creditos_utilizados = 0, ano_referencia = _ano, mes_referencia = _mes,
             data_renovacao = CASE WHEN _em_trial THEN _trial_ate
                                   WHEN _plano = 'free' THEN _ultima_sexta_data
                                   ELSE _today_brt END,
             trial_ate = CASE WHEN _em_trial THEN _trial_ate ELSE NULL END,
             ultimo_bonus_mes = NULL, ultimo_bonus_ano = NULL, updated_at = now()
       WHERE user_id = _user_id RETURNING * INTO _row;
      INSERT INTO public.creditos_historico(user_id, tipo, quantidade, descricao, saldo_apos)
        VALUES (_user_id, 'renovacao', _base,
                CASE WHEN _em_trial THEN 'Início do período de avaliação (14 dias)'
                     WHEN _row.plano_snapshot = 'trial' OR _snap_esperado = 'free' THEN 'Fim do período de avaliação — plano gratuito'
                     ELSE 'Mudança de plano: ' || _plano || COALESCE('/'||_ciclo,'') END,
                _base);
    END IF;
  END;

  IF _plano = 'pro' AND _ciclo = 'anual' THEN
    _aniversario := make_date(_ano, EXTRACT(MONTH FROM _row.data_renovacao)::int, LEAST(EXTRACT(DAY FROM _row.data_renovacao)::int, 28));
    IF _aniversario <= _today_brt AND _row.ano_referencia < _ano THEN
      UPDATE public.creditos_usuario
         SET creditos_totais = 18000 + COALESCE(_row.creditos_bonus_persistente,0), creditos_utilizados = 0, ano_referencia = _ano,
             mes_referencia = _mes, data_renovacao = _aniversario,
             ultimo_bonus_mes = NULL, ultimo_bonus_ano = NULL, updated_at = now()
       WHERE user_id = _user_id RETURNING * INTO _row;
      INSERT INTO public.creditos_historico(user_id, tipo, quantidade, descricao, saldo_apos)
        VALUES (_user_id, 'renovacao', 18000, 'Renovação anual ' || _ano, 18000);
    END IF;
  ELSIF _plano = 'pro' THEN
    IF _row.ano_referencia <> _ano OR _row.mes_referencia <> _mes THEN
      UPDATE public.creditos_usuario
         SET creditos_totais = _base + COALESCE(_row.creditos_bonus_persistente,0), creditos_utilizados = 0, ano_referencia = _ano,
             mes_referencia = _mes, ultimo_bonus_mes = NULL, ultimo_bonus_ano = NULL, updated_at = now()
       WHERE user_id = _user_id RETURNING * INTO _row;
      INSERT INTO public.creditos_historico(user_id, tipo, quantidade, descricao, saldo_apos)
        VALUES (_user_id, 'reset_mensal', _base, 'Renovação mensal', _base);
    END IF;
  ELSIF _em_trial THEN
    -- Durante o trial não há renovação semanal; saldo permanece até o fim do trial.
    NULL;
  ELSE
    -- Plano gratuito padrão (após trial): renovação semanal
    IF _row.data_renovacao IS NULL OR _row.data_renovacao < _ultima_sexta_data THEN
      UPDATE public.creditos_usuario
         SET creditos_totais = _base + COALESCE(_row.creditos_bonus_persistente,0), creditos_utilizados = 0, ano_referencia = _ano,
             mes_referencia = _mes, data_renovacao = _ultima_sexta_data,
             trial_ate = NULL,
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
    'plano', CASE WHEN _em_trial THEN 'trial' ELSE _plano END,
    'ciclo', _ciclo,
    'em_trial', _em_trial,
    'trial_ate', _row.trial_ate,
    'ano_referencia', _row.ano_referencia,
    'mes_referencia', _row.mes_referencia,
    'data_renovacao', _row.data_renovacao,
    'ultimo_bonus_mes', _row.ultimo_bonus_mes,
    'ultimo_bonus_ano', _row.ultimo_bonus_ano
  );
END; $function$;

-- 6) process_due_referrals: agora concede ACESSO + CRÉDITOS aos dois lados,
--    de forma idempotente por lado (referrer_credited / referred_credited).
--    Mantém compatibilidade: ainda soma bonus_days_total (telemetria/exibição).
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
    WHERE credit_at <= now()
      AND (referrer_credited = false OR referred_credited = false)
      AND (referrer_user_id = _uid OR referred_user_id = _uid)
  LOOP
    -- Lado de quem INDICOU
    IF r.referrer_credited = false THEN
      PERFORM public.conceder_acesso_bonus_dias(r.referrer_user_id, r.referrer_bonus_days);
      IF r.referrer_bonus_credits > 0 THEN
        PERFORM public.adicionar_creditos_bonus_persistente(
          r.referrer_user_id, r.referrer_bonus_credits,
          'Bônus por indicação (plano ' || r.plan || ')');
      END IF;
      UPDATE public.profiles
         SET bonus_days_total = bonus_days_total + r.referrer_bonus_days
       WHERE user_id = r.referrer_user_id;
    END IF;

    -- Lado de quem FOI INDICADO
    IF r.referred_credited = false THEN
      PERFORM public.conceder_acesso_bonus_dias(r.referred_user_id, r.referred_bonus_days);
      IF r.referred_bonus_credits > 0 THEN
        PERFORM public.adicionar_creditos_bonus_persistente(
          r.referred_user_id, r.referred_bonus_credits,
          'Bônus de boas-vindas por indicação (plano ' || r.plan || ')');
      END IF;
      UPDATE public.profiles
         SET bonus_days_total = bonus_days_total + r.referred_bonus_days
       WHERE user_id = r.referred_user_id;
    END IF;

    UPDATE public.referrals
       SET referrer_credited = true,
           referred_credited = true,
           credited = true,
           credited_at = now()
     WHERE id = r.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.process_due_referrals(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.process_due_referrals(uuid) TO authenticated;

-- 7) Concessão MANUAL/ADMIN (casos especiais): cria a indicação já com os
--    valores corretos e credita imediatamente (sem carência).
--    Só admins podem executar.
CREATE OR REPLACE FUNCTION public.admin_conceder_indicacao(
  _referrer uuid,
  _referred uuid,
  _plan text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dias integer;
  _cred integer;
  _code text;
  _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _plan NOT IN ('mensal','anual') THEN
    RAISE EXCEPTION 'plano_invalido';
  END IF;
  IF _referrer = _referred THEN
    RAISE EXCEPTION 'auto_indicacao';
  END IF;

  _dias := CASE WHEN _plan = 'anual' THEN 30 ELSE 7 END;
  _cred := CASE WHEN _plan = 'anual' THEN 1500 ELSE 375 END;
  SELECT referral_code INTO _code FROM public.profiles WHERE user_id = _referrer;

  INSERT INTO public.referrals(
    referrer_user_id, referred_user_id, referral_code, plan,
    purchased_at, credit_at,
    referrer_bonus_days, referred_bonus_days,
    referrer_bonus_credits, referred_bonus_credits,
    source
  )
  VALUES (
    _referrer, _referred, COALESCE(_code, 'ADMIN'), _plan,
    now(), now(),                       -- credita imediatamente
    _dias, _dias, _cred, _cred,
    'admin'
  )
  ON CONFLICT (referred_user_id) DO NOTHING
  RETURNING id INTO _id;

  IF _id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'indicado_ja_possui_indicacao');
  END IF;

  PERFORM public.process_due_referrals(_referrer);
  RETURN jsonb_build_object('ok', true, 'referral_id', _id, 'dias', _dias, 'creditos', _cred);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_conceder_indicacao(uuid, uuid, text) FROM PUBLIC, anon, authenticated;

-- 8) Expiração do Pro temporário de indicação (autodestrói ao vencer).
--    Estende o job existente sem tocar no fluxo Mercado Pago.
CREATE OR REPLACE FUNCTION public.expire_referral_bonus_subscriptions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  UPDATE public.subscriptions
     SET plano = 'free', ciclo = NULL, status = 'expired', updated_at = now()
   WHERE source = 'referral_bonus'
     AND current_period_end IS NOT NULL
     AND current_period_end < now()
     AND plano <> 'free';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_referral_bonus_subscriptions() FROM PUBLIC, anon, authenticated;
