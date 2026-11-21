-- Novidades (16/11/2026): entradas do WhatsApp para confirmar e Minha Biblioteca.
-- Idempotente: pode rodar mais de uma vez.

-- ============== whatsapp_entradas ==============
-- Mensagens que chegam pelo WhatsApp (texto ou áudio transcrito) e esperam a
-- confirmação da professora no app (/confirmar). Quem insere é o webhook do
-- WhatsApp (service_role), que ainda será criado. A professora só lê e
-- atualiza as dela (confirmar, descartar, editar o texto, trocar o destino).
CREATE TABLE IF NOT EXISTS public.whatsapp_entradas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recebido_em timestamptz NOT NULL DEFAULT now(),
  tipo text NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto','audio')),
  texto text NOT NULL DEFAULT '',
  aluno_id text,
  aluno_nome text,
  destino_sugerido text CHECK (destino_sugerido IN ('registro','parecer','planejamento','diario','pcd','inclusao_pei','agenda')),
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','confirmado','descartado')),
  confirmado_em timestamptz,
  destino_final text CHECK (destino_final IN ('registro','parecer','planejamento','diario','pcd','inclusao_pei','agenda')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_entradas_user_status
  ON public.whatsapp_entradas (user_id, status, recebido_em DESC);

ALTER TABLE public.whatsapp_entradas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa entradas own select" ON public.whatsapp_entradas;
CREATE POLICY "wa entradas own select"
  ON public.whatsapp_entradas FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "wa entradas own update" ON public.whatsapp_entradas;
CREATE POLICY "wa entradas own update"
  ON public.whatsapp_entradas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Sem política de INSERT/DELETE para authenticated: só o service_role
-- (que ignora RLS) insere, pelo webhook.
REVOKE INSERT, DELETE ON public.whatsapp_entradas FROM anon, authenticated;
REVOKE ALL ON public.whatsapp_entradas FROM anon;
GRANT SELECT, UPDATE ON public.whatsapp_entradas TO authenticated;
GRANT ALL ON public.whatsapp_entradas TO service_role;

-- ============== biblioteca_itens ==============
-- Minha Biblioteca: planos, fichas, simulados e jogos guardados para o
-- próximo ano letivo. ano_escolar: 0 = Educação Infantil, 1 a 9 = ano do EF.
CREATE TABLE IF NOT EXISTS public.biblioteca_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

ALTER TABLE public.biblioteca_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "biblioteca own select" ON public.biblioteca_itens;
CREATE POLICY "biblioteca own select"
  ON public.biblioteca_itens FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "biblioteca own insert" ON public.biblioteca_itens;
CREATE POLICY "biblioteca own insert"
  ON public.biblioteca_itens FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "biblioteca own update" ON public.biblioteca_itens;
CREATE POLICY "biblioteca own update"
  ON public.biblioteca_itens FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "biblioteca own delete" ON public.biblioteca_itens;
CREATE POLICY "biblioteca own delete"
  ON public.biblioteca_itens FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.biblioteca_itens FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca_itens TO authenticated;
GRANT ALL ON public.biblioteca_itens TO service_role;
