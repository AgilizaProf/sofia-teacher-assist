-- =====================================================================
-- Segurança: indicações, créditos e perfis (auditoria app.md, seção 1)
--   A1  referrals: só o servidor cria indicação; process_due_referrals
--       só para a própria conta (ou admin / service_role)
--   A3  aplicar_bonus_credito fora do alcance de PUBLIC/anon/authenticated
--       + varredura das funções SECURITY DEFINER
--   A4  registrar_mensagem_sofia confere o dono
--   A7  profiles: colunas sensíveis protegidas contra UPDATE do cliente
--   A15 referral_code_exists (para a rota /$ref)
-- Idempotente: pode rodar mais de uma vez.
-- =====================================================================

-- ---------------------------------------------------------------------
-- A1. referrals: nenhuma escrita pelo cliente
-- ---------------------------------------------------------------------
-- Quem cria indicação: o webhook do Mercado Pago (service_role) e
-- admin_conceder_indicacao (SECURITY DEFINER). O app só lê.
DROP POLICY IF EXISTS "ref own insert" ON public.referrals;
DROP POLICY IF EXISTS "ref own update" ON public.referrals;
DROP POLICY IF EXISTS "ref own delete" ON public.referrals;
REVOKE INSERT, UPDATE, DELETE ON public.referrals FROM anon, authenticated;

-- Sem CHECK de valores de bônus: com a escrita fechada para o cliente, só o
-- servidor cria indicações. Um CHECK também barraria a concessão manual do
-- admin e o UPDATE de linhas antigas com outros valores.
ALTER TABLE public.referrals DROP CONSTRAINT IF EXISTS referrals_bonus_fixo_ck;

CREATE OR REPLACE FUNCTION public.process_due_referrals(_uid uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n integer := 0;
  _caller uuid := auth.uid();
BEGIN
  -- Só a própria conta, um admin ou o servidor (service_role).
  IF _caller IS NOT NULL THEN
    IF _caller <> _uid AND NOT public.has_role(_caller, 'admin'::public.app_role) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  ELSIF COALESCE(auth.role(), '') IN ('anon', 'authenticated') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR r IN
    SELECT * FROM public.referrals
    WHERE credit_at <= now()
      AND (referrer_credited = false OR referred_credited = false)
      AND (referrer_user_id = _uid OR referred_user_id = _uid)
    FOR UPDATE SKIP LOCKED
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

-- ---------------------------------------------------------------------
-- A4. registrar_mensagem_sofia: só a própria conta (ou service_role)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_mensagem_sofia(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row    public.creditos_usuario%ROWTYPE;
  _novo   integer;
  _saldo  integer;
BEGIN
  IF NOT (
    (auth.uid() IS NOT NULL AND auth.uid() = _user_id)
    OR COALESCE(auth.role(), '') = 'service_role'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO _row FROM public.creditos_usuario
    WHERE user_id = _user_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('charged', false, 'reason', 'creditos_nao_inicializados');
  END IF;

  _novo := _row.sofia_msg_counter + 1;

  IF _novo < 10 THEN
    UPDATE public.creditos_usuario
       SET sofia_msg_counter = _novo, updated_at = now()
     WHERE user_id = _user_id;
    RETURN jsonb_build_object('charged', false, 'counter', _novo);
  END IF;

  _saldo := _row.creditos_totais - _row.creditos_utilizados;

  IF _saldo < 1 THEN
    UPDATE public.creditos_usuario
       SET sofia_msg_counter = 0, updated_at = now()
     WHERE user_id = _user_id;
    RETURN jsonb_build_object('charged', false, 'reason', 'creditos_insuficientes', 'counter', 0);
  END IF;

  UPDATE public.creditos_usuario
     SET creditos_utilizados = creditos_utilizados + 1,
         sofia_msg_counter   = 0,
         updated_at          = now()
   WHERE user_id = _user_id;

  INSERT INTO public.creditos_historico(user_id, tipo, quantidade, descricao, saldo_apos)
    VALUES (_user_id, 'uso', -1, 'Chat Sofia (10 mensagens)', _saldo - 1);

  RETURN jsonb_build_object('charged', true, 'counter', 0, 'saldo', _saldo - 1);
END;
$$;

-- ---------------------------------------------------------------------
-- reordenar_semanas_trilha: era SECURITY DEFINER sem conferir o dono
-- (qualquer conta reordenava a trilha de outra). Agora confere.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reordenar_semanas_trilha(
  _trilha_id uuid,
  _ordem uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.trilhas t WHERE t.id = _trilha_id AND t.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.trilha_semanas
     SET semana = semana + 10000
   WHERE trilha_id = _trilha_id;

  FOR i IN 1 .. COALESCE(array_length(_ordem, 1), 0) LOOP
    UPDATE public.trilha_semanas
       SET semana = i
     WHERE id = _ordem[i]
       AND trilha_id = _trilha_id;
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------
-- A15. referral_code_exists: a rota /$ref só vira indicação se o código
-- existir. Devolve só true/false (não expõe de quem é o código).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.referral_code_exists(_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _code IS NULL OR upper(trim(_code)) !~ '^[A-Z0-9]{4,12}$' THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.profiles p WHERE p.referral_code = upper(trim(_code))
    )
  END;
$$;

-- ---------------------------------------------------------------------
-- A3. Permissões das funções SECURITY DEFINER
-- No Postgres toda função nasce com EXECUTE para PUBLIC; "REVOKE ... FROM
-- anon, authenticated" sozinho não basta. Aqui cada função fica só com
-- quem precisa chamá-la. Funções inexistentes são puladas.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  sig text;
  -- Só o servidor / banco (nunca o app)
  somente_servidor text[] := ARRAY[
    'public.aplicar_bonus_credito(uuid,integer,text,integer,integer)',
    'public.adicionar_creditos_bonus_persistente(uuid,integer,text)',
    'public.conceder_acesso_bonus_dias(uuid,integer)',
    'public.admin_conceder_indicacao(uuid,uuid,text)',
    'public.expire_referral_bonus_subscriptions()',
    'public.mp_expire_subscriptions()',
    'public.cleanup_old_sofia_conversations()',
    'public.ai_month_usage_brl(uuid)',
    'public.handle_new_user()',
    'public.touch_sofia_conversation()'
  ];
  -- Chamadas pelo app logado (cada uma confere auth.uid() ou has_role admin)
  so_logado text[] := ARRAY[
    'public.process_due_referrals(uuid)',
    'public.ensure_referral_code(uuid)',
    'public.registrar_mensagem_sofia(uuid)',
    'public.consumir_creditos(uuid,integer,text)',
    'public.garantir_creditos_usuario(uuid)',
    'public.acumular_tempo_economizado(uuid,integer,text,text)',
    'public.touch_last_seen()',
    'public.reordenar_semanas_trilha(uuid,uuid[])',
    'public.admin_grant_pro(text,text,integer,text)',
    'public.admin_revoke_pro(uuid)'
  ];
  -- Também sem login (link de indicação e landing)
  publico text[] := ARRAY[
    'public.log_referral_event(text,text,jsonb)',
    'public.referral_code_exists(text)'
  ];
BEGIN
  FOREACH sig IN ARRAY somente_servidor LOOP
    IF to_regprocedure(sig) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', sig);
    END IF;
  END LOOP;

  FOREACH sig IN ARRAY so_logado LOOP
    IF to_regprocedure(sig) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', sig);
    END IF;
  END LOOP;

  FOREACH sig IN ARRAY publico LOOP
    IF to_regprocedure(sig) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated, service_role', sig);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- A7. profiles: colunas sensíveis
-- Vale só para escrita direta do app (papel anon/authenticated). Funções
-- SECURITY DEFINER (ensure_referral_code, process_due_referrals) rodam
-- como o dono e o webhook usa service_role: esses passam.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.profiles_protege_colunas()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  _jwt_email text := lower(trim(COALESCE(auth.jwt() ->> 'email', '')));
  _code text;
  _old_ref text := NULL;
  _old_own text := NULL;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.referral_code := NULL;          -- gerado por ensure_referral_code
    NEW.bonus_days_total := 0;
    IF NEW.email IS NOT NULL AND lower(trim(NEW.email)) <> _jwt_email THEN
      NEW.email := NULLIF(_jwt_email, '');
    END IF;
  ELSE
    _old_ref := OLD.referred_by_code;
    _old_own := OLD.referral_code;
    -- E-mail: só aceita o e-mail da própria conta de login (o mesmo do
    -- token). Qualquer outro valor é ignorado e o antigo fica.
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      IF NEW.email IS NOT NULL AND _jwt_email <> '' AND lower(trim(NEW.email)) = _jwt_email THEN
        NEW.email := _jwt_email;
      ELSE
        NEW.email := OLD.email;
      END IF;
    END IF;
    NEW.referral_code := OLD.referral_code;
    NEW.bonus_days_total := OLD.bonus_days_total;
  END IF;

  -- Código de quem indicou: só pode ser preenchido uma vez, com um código
  -- que existe e não é o da própria pessoa.
  IF NEW.referred_by_code IS DISTINCT FROM _old_ref THEN
    IF _old_ref IS NOT NULL THEN
      RAISE EXCEPTION 'referred_by_code_ja_definido' USING ERRCODE = '42501';
    END IF;
    IF NEW.referred_by_code IS NOT NULL THEN
      _code := upper(trim(NEW.referred_by_code));
      IF _code !~ '^[A-Z0-9]{4,12}$' OR NOT public.referral_code_exists(_code) THEN
        RAISE EXCEPTION 'referred_by_code_inexistente' USING ERRCODE = '22023';
      END IF;
      IF _old_own IS NOT NULL AND _old_own = _code THEN
        RAISE EXCEPTION 'auto_indicacao' USING ERRCODE = '22023';
      END IF;
      NEW.referred_by_code := _code;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protege_colunas ON public.profiles;
CREATE TRIGGER profiles_protege_colunas
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_protege_colunas();

-- E-mail único sem diferenciar maiúsculas. Se já houver duplicados, o
-- índice não é criado (aviso no log) e a consulta de verificação abaixo
-- mostra quais são.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = 'profiles_email_lower_uniq'
  ) THEN
    BEGIN
      CREATE UNIQUE INDEX profiles_email_lower_uniq
        ON public.profiles (lower(email)) WHERE email IS NOT NULL;
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'profiles_email_lower_uniq não criado: há e-mails repetidos (maiúsculas/minúsculas).';
    END;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- Verificação (rodar à parte no SQL do Lovable Cloud):
--   SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'public.referrals'::regclass;
--     -> só "ref own select" (polcmd = r)
--   SELECT has_function_privilege('authenticated',
--     'public.aplicar_bonus_credito(uuid,integer,text,integer,integer)', 'EXECUTE');
--     -> false
-- ---------------------------------------------------------------------
