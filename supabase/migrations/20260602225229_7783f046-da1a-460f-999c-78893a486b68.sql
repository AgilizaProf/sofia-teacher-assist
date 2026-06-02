-- M2 — Cobrança do chat da Sofia movida do localStorage para o servidor.

ALTER TABLE public.creditos_usuario
  ADD COLUMN IF NOT EXISTS sofia_msg_counter integer NOT NULL DEFAULT 0;

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

GRANT EXECUTE ON FUNCTION public.registrar_mensagem_sofia(uuid) TO authenticated;