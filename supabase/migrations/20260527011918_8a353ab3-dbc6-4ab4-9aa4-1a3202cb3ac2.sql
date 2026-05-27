
-- Saldo de tempo economizado por usuário
CREATE TABLE IF NOT EXISTS public.tempo_economizado (
  user_id uuid PRIMARY KEY,
  minutos_totais integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tempo_economizado TO authenticated;
GRANT ALL ON public.tempo_economizado TO service_role;

ALTER TABLE public.tempo_economizado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tempo own select" ON public.tempo_economizado
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Histórico de acumulações
CREATE TABLE IF NOT EXISTS public.tempo_economizado_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  minutos integer NOT NULL,
  acao text NOT NULL,
  motivo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tempo_hist_user_created
  ON public.tempo_economizado_historico (user_id, created_at DESC);

GRANT SELECT ON public.tempo_economizado_historico TO authenticated;
GRANT ALL ON public.tempo_economizado_historico TO service_role;

ALTER TABLE public.tempo_economizado_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tempo hist own select" ON public.tempo_economizado_historico
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Função para acumular tempo (apenas o próprio usuário)
CREATE OR REPLACE FUNCTION public.acumular_tempo_economizado(
  _user_id uuid,
  _minutos integer,
  _acao text,
  _motivo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _total integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _minutos IS NULL OR _minutos <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'motivo', 'minutos_invalido');
  END IF;

  INSERT INTO public.tempo_economizado AS te (user_id, minutos_totais)
    VALUES (_user_id, _minutos)
    ON CONFLICT (user_id) DO UPDATE
      SET minutos_totais = te.minutos_totais + EXCLUDED.minutos_totais,
          updated_at = now()
    RETURNING minutos_totais INTO _total;

  INSERT INTO public.tempo_economizado_historico(user_id, minutos, acao, motivo)
    VALUES (_user_id, _minutos, _acao, _motivo);

  RETURN jsonb_build_object('ok', true, 'minutos_totais', _total);
END;
$function$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.tempo_economizado;
