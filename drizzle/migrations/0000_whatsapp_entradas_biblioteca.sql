CREATE TABLE IF NOT EXISTS public.whatsapp_entradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recebido_em timestamptz NOT NULL DEFAULT now(),
  tipo text NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto','audio')),
  texto text NOT NULL DEFAULT '',
  aluno_id text,
  aluno_nome text,
  destino_sugerido text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','confirmado','descartado')),
  confirmado_em timestamptz,
  destino_final text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.whatsapp_entradas DROP CONSTRAINT IF EXISTS whatsapp_entradas_destino_sugerido_check;
ALTER TABLE public.whatsapp_entradas ADD CONSTRAINT whatsapp_entradas_destino_sugerido_check
  CHECK (destino_sugerido IN ('registro','parecer','planejamento','diario','pcd','inclusao_pei','agenda','alfabetizacao'));
ALTER TABLE public.whatsapp_entradas DROP CONSTRAINT IF EXISTS whatsapp_entradas_destino_final_check;
ALTER TABLE public.whatsapp_entradas ADD CONSTRAINT whatsapp_entradas_destino_final_check
  CHECK (destino_final IN ('registro','parecer','planejamento','diario','pcd','inclusao_pei','agenda','alfabetizacao'));

CREATE INDEX IF NOT EXISTS idx_whatsapp_entradas_user_status
  ON public.whatsapp_entradas (user_id, status, recebido_em DESC);

REVOKE ALL ON public.whatsapp_entradas FROM anon;
REVOKE INSERT, DELETE ON public.whatsapp_entradas FROM authenticated;
GRANT SELECT, UPDATE ON public.whatsapp_entradas TO authenticated;
GRANT ALL ON public.whatsapp_entradas TO service_role;

ALTER TABLE public.whatsapp_entradas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa entradas own select" ON public.whatsapp_entradas;
CREATE POLICY "wa entradas own select" ON public.whatsapp_entradas
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "wa entradas own update" ON public.whatsapp_entradas;
CREATE POLICY "wa entradas own update" ON public.whatsapp_entradas
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.biblioteca_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tipo text NOT NULL,
  ref_id text,
  titulo text NOT NULL DEFAULT '',
  ano_escolar int CHECK (ano_escolar IS NULL OR (ano_escolar BETWEEN 0 AND 9)),
  componente text,
  ano_letivo int,
  habilidades text[] NOT NULL DEFAULT '{}',
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_biblioteca_itens_user
  ON public.biblioteca_itens (user_id, ano_letivo, ano_escolar);

REVOKE ALL ON public.biblioteca_itens FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_itens TO authenticated;
GRANT ALL ON public.biblioteca_itens TO service_role;

ALTER TABLE public.biblioteca_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "biblioteca own select" ON public.biblioteca_itens;
CREATE POLICY "biblioteca own select" ON public.biblioteca_itens
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "biblioteca own insert" ON public.biblioteca_itens;
CREATE POLICY "biblioteca own insert" ON public.biblioteca_itens
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "biblioteca own update" ON public.biblioteca_itens;
CREATE POLICY "biblioteca own update" ON public.biblioteca_itens
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "biblioteca own delete" ON public.biblioteca_itens;
CREATE POLICY "biblioteca own delete" ON public.biblioteca_itens
  FOR DELETE TO authenticated USING (auth.uid() = user_id);