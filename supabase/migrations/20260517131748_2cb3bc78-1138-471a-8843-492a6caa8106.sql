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
  _bonus_mes boolean := _mes IN (1,6,11);
  _bonus_valor integer := 500;
  _bonus_nome text;
  -- Última sexta-feira às 14h (horário de Brasília) já ocorrida
  _ultima_sexta_14h timestamptz;
  _ultima_sexta_data date;
BEGIN
  -- calcula a "última sexta-feira 14:00 BRT" já ocorrida
  -- dow: 0=domingo, 5=sexta
  _ultima_sexta_data := _today_brt
    - ((EXTRACT(DOW FROM _today_brt)::int - 5 + 7) % 7);
  _ultima_sexta_14h := ((_ultima_sexta_data::text || ' 14:00:00')::timestamp
                        AT TIME ZONE 'America/Sao_Paulo');
  -- Se ainda não passou das 14h dessa "sexta candidata", recuar 7 dias
  IF _now_brt < _ultima_sexta_14h THEN
    _ultima_sexta_data := _ultima_sexta_data - 7;
    _ultima_sexta_14h := ((_ultima_sexta_data::text || ' 14:00:00')::timestamp
                          AT TIME ZONE 'America/Sao_Paulo');
  END IF;

  -- Lê plano atual
  SELECT plano, ciclo, started_at, current_period_end, status
    INTO _sub FROM public.subscriptions WHERE user_id = _user_id;
  IF FOUND THEN
    _plano := COALESCE(_sub.plano, 'free');
    _ciclo := _sub.ciclo;
  END IF;

  -- Política base
  IF _plano = 'pro' AND _ciclo = 'anual' THEN
    _base := 18000;
  ELSIF _plano = 'pro' THEN  -- mensal/trial
    _base := 1500;
  ELSE
    _base := 75;  -- free: 75 créditos por semana
  END IF;

  -- Carrega ou cria linha
  SELECT * INTO _row FROM public.creditos_usuario WHERE user_id = _user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.creditos_usuario(
      user_id, creditos_totais, creditos_utilizados,
      ano_referencia, mes_referencia, data_renovacao,
      plano_snapshot, ciclo_snapshot
    ) VALUES (
      _user_id, _base, 0, _ano, _mes,
      CASE WHEN _plano = 'free' THEN _ultima_sexta_data ELSE _today_brt END,
      _plano, _ciclo
    ) RETURNING * INTO _row;

    INSERT INTO public.creditos_historico(user_id, tipo, quantidade, descricao, saldo_apos)
      VALUES (_user_id, 'renovacao', _base,
              CASE WHEN _plano='pro' AND _ciclo='anual' THEN 'Créditos anuais do plano'
                   WHEN _plano='pro' THEN 'Créditos mensais do plano'
                   ELSE 'Créditos semanais do plano gratuito' END,
              _base);
  END IF;

  -- Se plano mudou, atualiza snapshot e ajusta total (sem perder utilizados)
  IF _row.plano_snapshot <> _plano OR COALESCE(_row.ciclo_snapshot,'') <> COALESCE(_ciclo,'') THEN
    UPDATE public.creditos_usuario
       SET plano_snapshot = _plano,
           ciclo_snapshot = _ciclo,
           creditos_totais = _base,
           creditos_utilizados = 0,
           ano_referencia = _ano,
           mes_referencia = _mes,
           data_renovacao = CASE WHEN _plano = 'free' THEN _ultima_sexta_data ELSE _today_brt END,
           ultimo_bonus_mes = NULL,
           ultimo_bonus_ano = NULL,
           updated_at = now()
     WHERE user_id = _user_id
     RETURNING * INTO _row;
    INSERT INTO public.creditos_historico(user_id, tipo, quantidade, descricao, saldo_apos)
      VALUES (_user_id, 'renovacao', _base, 'Mudança de plano: ' || _plano || COALESCE('/'||_ciclo,''), _base);
  END IF;

  -- ANUAL: renova quando passa aniversário (mesmo mês+dia do data_renovacao)
  IF _plano = 'pro' AND _ciclo = 'anual' THEN
    _aniversario := make_date(_ano, EXTRACT(MONTH FROM _row.data_renovacao)::int, LEAST(EXTRACT(DAY FROM _row.data_renovacao)::int, 28));
    IF _aniversario <= _today_brt AND _row.ano_referencia < _ano THEN
      UPDATE public.creditos_usuario
         SET creditos_totais = 18000,
             creditos_utilizados = 0,
             ano_referencia = _ano,
             mes_referencia = _mes,
             data_renovacao = _aniversario,
             ultimo_bonus_mes = NULL,
             ultimo_bonus_ano = NULL,
             updated_at = now()
       WHERE user_id = _user_id
       RETURNING * INTO _row;
      INSERT INTO public.creditos_historico(user_id, tipo, quantidade, descricao, saldo_apos)
        VALUES (_user_id, 'renovacao', 18000, 'Renovação anual ' || _ano, 18000);
    END IF;
  ELSIF _plano = 'pro' THEN
    -- MENSAL: reseta a cada mudança de mês
    IF _row.ano_referencia <> _ano OR _row.mes_referencia <> _mes THEN
      UPDATE public.creditos_usuario
         SET creditos_totais = _base,
             creditos_utilizados = 0,
             ano_referencia = _ano,
             mes_referencia = _mes,
             ultimo_bonus_mes = NULL,
             ultimo_bonus_ano = NULL,
             updated_at = now()
       WHERE user_id = _user_id
       RETURNING * INTO _row;
      INSERT INTO public.creditos_historico(user_id, tipo, quantidade, descricao, saldo_apos)
        VALUES (_user_id, 'reset_mensal', _base, 'Renovação mensal', _base);
    END IF;
  ELSE
    -- FREE: reseta semanalmente — toda sexta-feira às 14h (BRT)
    IF _row.data_renovacao IS NULL OR _row.data_renovacao < _ultima_sexta_data THEN
      UPDATE public.creditos_usuario
         SET creditos_totais = _base,
             creditos_utilizados = 0,
             ano_referencia = _ano,
             mes_referencia = _mes,
             data_renovacao = _ultima_sexta_data,
             ultimo_bonus_mes = NULL,
             ultimo_bonus_ano = NULL,
             updated_at = now()
       WHERE user_id = _user_id
       RETURNING * INTO _row;
      INSERT INTO public.creditos_historico(user_id, tipo, quantidade, descricao, saldo_apos)
        VALUES (_user_id, 'reset_semanal', _base, 'Renovação semanal (sexta-feira)', _base);
    END IF;
  END IF;

  -- BÔNUS jan/jun/nov só para anual
  IF _plano = 'pro' AND _ciclo = 'anual' AND _bonus_mes
     AND (_row.ultimo_bonus_mes IS DISTINCT FROM _mes OR _row.ultimo_bonus_ano IS DISTINCT FROM _ano)
  THEN
    _bonus_nome := CASE _mes
      WHEN 1 THEN '🎁 Bônus de Planejamento Anual'
      WHEN 6 THEN '🎁 Bônus de Fechamento de Semestre'
      WHEN 11 THEN '🎁 Bônus de Antecipação do Encerramento'
    END;
    PERFORM public.aplicar_bonus_credito(_user_id, _bonus_valor, _bonus_nome, _mes, _ano);
    SELECT * INTO _row FROM public.creditos_usuario WHERE user_id = _user_id;
  END IF;

  _saldo := _row.creditos_totais - _row.creditos_utilizados;
  RETURN jsonb_build_object(
    'creditos_totais', _row.creditos_totais,
    'creditos_utilizados', _row.creditos_utilizados,
    'creditos_disponiveis', _saldo,
    'plano', _plano,
    'ciclo', _ciclo,
    'ano_referencia', _row.ano_referencia,
    'mes_referencia', _row.mes_referencia,
    'data_renovacao', _row.data_renovacao,
    'ultimo_bonus_mes', _row.ultimo_bonus_mes,
    'ultimo_bonus_ano', _row.ultimo_bonus_ano
  );
END; $function$;