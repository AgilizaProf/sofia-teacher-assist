CREATE TABLE public.planejamento_documentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tab TEXT NOT NULL CHECK (tab IN ('m1','m2','m3','m7')),
  turma TEXT NOT NULL,
  escola TEXT NOT NULL,
  professor TEXT NOT NULL,
  data_ini DATE NOT NULL,
  data_fim DATE NOT NULL,
  modo TEXT NOT NULL CHECK (modo IN ('completo','simplificado')),
  conteudo_json JSONB NOT NULL,
  leis TEXT[] NOT NULL DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.planejamento_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own planejamento docs"
  ON public.planejamento_documentos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own planejamento docs"
  ON public.planejamento_documentos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own planejamento docs"
  ON public.planejamento_documentos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own planejamento docs"
  ON public.planejamento_documentos FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_planejamento_documentos_user_tab
  ON public.planejamento_documentos (user_id, tab, created_at DESC);

CREATE TRIGGER trg_planejamento_documentos_updated_at
  BEFORE UPDATE ON public.planejamento_documentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();