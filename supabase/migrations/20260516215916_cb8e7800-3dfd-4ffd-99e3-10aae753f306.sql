
-- ============== TABELA: creditos_usuario ==============
CREATE TABLE public.creditos_usuario (
  user_id uuid PRIMARY KEY,
  creditos_totais integer NOT NULL DEFAULT 0,
  creditos_utilizados integer NOT NULL DEFAULT 0,
  ano_referencia integer NOT NULL,
  mes_referencia integer NOT NULL,
  data_renovacao date NOT NULL DEFAULT current_date,
  ultimo_bonus_mes integer,
  ultimo_bonus_ano integer,
  plano_snapshot text NOT NULL DEFAULT 'free',
  ciclo_snapshot text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creditos_utilizados_nonneg CHECK (creditos_utilizados >= 0),
  CONSTRAINT creditos_totais_nonneg CHECK (creditos_totais >= 0)
);

ALTER TABLE public.creditos_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creditos own select"
  ON public.creditos_usuario FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Sem políticas de INSERT/UPDATE/DELETE para clientes; tudo via SECURITY DEFINER

CREATE TRIGGER trg_creditos_usuario_updated_at
  BEFORE UPDATE ON public.creditos_usuario
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.creditos_usuario;
ALTER TABLE public.creditos_usuario REPLICA IDENTITY FULL;

-- ============== TABELA: creditos_historico ==============
CREATE TABLE public.creditos_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('uso','bonus','renovacao','reset_mensal','compra','ajuste')),
  quantidade integer NOT NULL,
  descricao text NOT NULL,
  saldo_apos integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_creditos_historico_user_created
  ON public.creditos_historico (user_id, created_at DESC);

ALTER TABLE public.creditos_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hist own select"
  ON public.creditos_historico FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============== FUNÇÃO: consumir_creditos (atômica) ==============
CREATE OR REPLACE FUNCTION public.consumir_creditos(
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
END; $$;

-- ============== FUNÇÃO: aplicar_bonus_credito ==============
-- Adiciona +N créditos ao total, registra histórico, marca mes/ano do bônus
CREATE OR REPLACE FUNCTION public.aplicar_bonus_credito(
  _user_id uuid,
  _quantidade integer,
  _descricao text,
  _mes integer,
  _ano integer
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.creditos_usuario%ROWTYPE;
  _saldo integer;
BEGIN
  SELECT * INTO _row FROM public.creditos_usuario
    WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'creditos_nao_inicializados';
  END IF;

  -- Já aplicado este mês/ano? idempotente
  IF _row.ultimo_bonus_mes = _mes AND _row.ultimo_bonus_ano = _ano THEN
    RETURN jsonb_build_object('aplicado', false, 'motivo', 'ja_aplicado');
  END IF;

  UPDATE public.creditos_usuario
     SET creditos_totais = creditos_totais + _quantidade,
         ultimo_bonus_mes = _mes,
         ultimo_bonus_ano = _ano,
         updated_at = now()
   WHERE user_id = _user_id
   RETURNING * INTO _row;

  _saldo := _row.creditos_totais - _row.creditos_utilizados;
  INSERT INTO public.creditos_historico(user_id, tipo, quantidade, descricao, saldo_apos)
    VALUES (_user_id, 'bonus', _quantidade, _descricao, _saldo);

  RETURN jsonb_build_object('aplicado', true, 'saldo', _saldo, 'bonus', _quantidade);
END; $$;

-- ============== FUNÇÃO: garantir_creditos_usuario ==============
-- Idempotente. Inicializa, renova anualmente (anual), reseta mensalmente (free/mensal),
-- aplica bônus de jan/jun/nov (anual).
CREATE OR REPLACE FUNCTION public.garantir_creditos_usuario(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sub record;
  _plano text := 'free';
  _ciclo text;
  _base integer;
  _row public.creditos_usuario%ROWTYPE;
  _now date := current_date;
  _ano integer := EXTRACT(YEAR FROM _now)::int;
  _mes integer := EXTRACT(MONTH FROM _now)::int;
  _renovacao date;
  _aniversario date;
  _saldo integer;
  _bonus_mes boolean := _mes IN (1,6,11);
  _bonus_valor integer := 500;
  _bonus_nome text;
BEGIN
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
    _base := 300;
  END IF;

  -- Carrega ou cria linha
  SELECT * INTO _row FROM public.creditos_usuario WHERE user_id = _user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.creditos_usuario(
      user_id, creditos_totais, creditos_utilizados,
      ano_referencia, mes_referencia, data_renovacao,
      plano_snapshot, ciclo_snapshot
    ) VALUES (
      _user_id, _base, 0, _ano, _mes, _now, _plano, _ciclo
    ) RETURNING * INTO _row;

    INSERT INTO public.creditos_historico(user_id, tipo, quantidade, descricao, saldo_apos)
      VALUES (_user_id, 'renovacao', _base,
              CASE WHEN _plano='pro' AND _ciclo='anual' THEN 'Créditos anuais do plano'
                   WHEN _plano='pro' THEN 'Créditos mensais do plano'
                   ELSE 'Créditos do plano gratuito' END,
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
           data_renovacao = _now,
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
    IF _aniversario <= _now AND _row.ano_referencia < _ano THEN
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
  ELSE
    -- MENSAL / FREE: reseta a cada mudança de mês
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
END; $$;

GRANT EXECUTE ON FUNCTION public.garantir_creditos_usuario(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consumir_creditos(uuid, integer, text) TO authenticated;
