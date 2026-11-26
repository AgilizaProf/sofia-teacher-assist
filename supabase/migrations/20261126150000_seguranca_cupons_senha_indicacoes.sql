-- Segurança (auditoria de 19/11): cupons, pedidos de nova senha e eventos
-- de indicação.

-- ---------------------------------------------------------------------
-- 1. Cupons de desconto (redeem_promo_code)
-- Antes: funcionava sem login, sem limite de tentativas, e cada chamada
-- somava um uso. Dava para testar códigos até achar um válido e para gastar
-- todos os usos de um cupom limitado chamando a função várias vezes.
-- Agora:
--   * só para quem está logado;
--   * no máximo 10 tentativas por pessoa a cada hora (acertando ou não);
--   * cada pessoa conta um único uso por cupom, por mais que digite de novo.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promo_code_tentativas (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_promo_code_tentativas_user
  ON public.promo_code_tentativas(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.promo_code_resgates (
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (promo_code_id, user_id)
);

-- Só o banco (pela função abaixo) mexe nessas tabelas; admins podem ler.
ALTER TABLE public.promo_code_tentativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_code_resgates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.promo_code_tentativas FROM anon, authenticated;
REVOKE ALL ON public.promo_code_resgates FROM anon, authenticated;
GRANT SELECT ON public.promo_code_resgates TO authenticated;
GRANT ALL ON public.promo_code_tentativas TO service_role;
GRANT ALL ON public.promo_code_resgates TO service_role;

DROP POLICY IF EXISTS "admins read promo resgates" ON public.promo_code_resgates;
CREATE POLICY "admins read promo resgates"
  ON public.promo_code_resgates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.redeem_promo_code(p_code text)
RETURNS TABLE (url_mensal text, url_anual text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.promo_codes%ROWTYPE;
  _uid uuid := auth.uid();
  _tentativas integer;
  _ja_usou boolean;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'login_necessario' USING ERRCODE = '42501';
  END IF;

  -- Limite de tentativas (conta antes de olhar o código).
  SELECT count(*) INTO _tentativas
    FROM public.promo_code_tentativas
   WHERE user_id = _uid AND created_at > now() - interval '1 hour';
  IF _tentativas >= 10 THEN
    RAISE EXCEPTION 'muitas_tentativas' USING ERRCODE = '54000';
  END IF;
  INSERT INTO public.promo_code_tentativas(user_id) VALUES (_uid);

  IF p_code IS NULL OR length(trim(p_code)) = 0 OR length(p_code) > 64 THEN
    RETURN;
  END IF;

  SELECT * INTO v
    FROM public.promo_codes
   WHERE lower(code) = lower(trim(p_code))
     AND active = true
   LIMIT 1
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v.expires_at IS NOT NULL AND v.expires_at < now() THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.promo_code_resgates r
     WHERE r.promo_code_id = v.id AND r.user_id = _uid
  ) INTO _ja_usou;

  IF NOT _ja_usou THEN
    IF v.max_uses IS NOT NULL AND v.used_count >= v.max_uses THEN
      RETURN;
    END IF;
    INSERT INTO public.promo_code_resgates(promo_code_id, user_id) VALUES (v.id, _uid);
    UPDATE public.promo_codes SET used_count = used_count + 1 WHERE id = v.id;
  END IF;

  url_mensal := v.url_mensal;
  url_anual  := v.url_anual;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_promo_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(text) TO authenticated, service_role;

-- Limpeza: tentativas com mais de 1 dia não servem para nada.
DELETE FROM public.promo_code_tentativas WHERE created_at < now() - interval '1 day';

-- ---------------------------------------------------------------------
-- 2. Pedidos de nova senha (password_reset_attempts)
-- Antes qualquer visitante podia gravar "tentativas" com o e-mail de outra
-- pessoa direto no banco e, com 3 registros, bloquear o pedido de nova senha
-- dela por 15 minutos (repetindo sem parar). Quem grava é só o servidor
-- (requestPasswordReset usa a chave de serviço), então o app não precisa
-- dessa permissão.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "log reset attempts with valid email" ON public.password_reset_attempts;
DROP POLICY IF EXISTS "anyone can log reset attempts" ON public.password_reset_attempts;
REVOKE INSERT, UPDATE, DELETE ON public.password_reset_attempts FROM anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Eventos de indicação (log_referral_event)
-- Continua aberta sem login (o link de indicação é aberto antes do cadastro),
-- mas só aceita os eventos que o app usa e limita o tamanho do que é gravado,
-- para ninguém encher a tabela com textos enormes ou eventos inventados.
-- ---------------------------------------------------------------------
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
  IF _event IS NULL OR _event NOT IN (
    'ref_visualizar_secao', 'ref_copiar_link', 'ref_compartilhar',
    'ref_cadastro_via_link', 'ref_registrado', 'ref_registro_falhou',
    'ref_conversao'
  ) THEN
    RAISE EXCEPTION 'evento_invalido' USING ERRCODE = '22023';
  END IF;

  IF _code_norm IS NOT NULL AND _code_norm !~ '^[A-Z0-9]{4,12}$' THEN
    _code_norm := NULL;
  END IF;

  IF _meta IS NOT NULL AND length(_meta::text) > 2000 THEN
    _meta := NULL;
  END IF;

  -- Sem login e sem código válido não há a quem atribuir: não grava.
  IF _code_norm IS NOT NULL THEN
    SELECT user_id INTO _referrer FROM public.profiles WHERE referral_code = _code_norm LIMIT 1;
  END IF;
  IF _referrer IS NULL THEN
    _referrer := _caller;
  END IF;
  IF _referrer IS NULL THEN
    RETURN NULL;
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
GRANT EXECUTE ON FUNCTION public.log_referral_event(text, text, jsonb) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 4. Índice para o limite de ritmo da IA (edge functions contam as chamadas
--    de cada pessoa nos últimos 10 minutos em ai_usage).
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_created
  ON public.ai_usage (user_id, created_at DESC);
