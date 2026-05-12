
-- Garantir RLS ativo
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage FORCE ROW LEVEL SECURITY;

-- Recria políticas SELECT separadas (auditável)
DROP POLICY IF EXISTS "ai_usage own select" ON public.ai_usage;
DROP POLICY IF EXISTS "ai_usage user select own" ON public.ai_usage;
DROP POLICY IF EXISTS "ai_usage admin select all" ON public.ai_usage;

CREATE POLICY "ai_usage user select own"
  ON public.ai_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "ai_usage admin select all"
  ON public.ai_usage
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Bloqueia explicitamente escrita do cliente (apenas service_role escreve)
DROP POLICY IF EXISTS "ai_usage no client write insert" ON public.ai_usage;
DROP POLICY IF EXISTS "ai_usage no client write update" ON public.ai_usage;
DROP POLICY IF EXISTS "ai_usage no client write delete" ON public.ai_usage;

CREATE POLICY "ai_usage no client write insert"
  ON public.ai_usage FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "ai_usage no client write update"
  ON public.ai_usage FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "ai_usage no client write delete"
  ON public.ai_usage FOR DELETE TO authenticated
  USING (false);
