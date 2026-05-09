
CREATE TABLE public.pei_pdi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  aluno_client_id TEXT NOT NULL,
  aluno_nome TEXT NOT NULL,
  bimestre TEXT NOT NULL,
  versao INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ativo',
  perfil_aluno JSONB NOT NULL DEFAULT '{}'::jsonb,
  objetivos_longo JSONB NOT NULL DEFAULT '[]'::jsonb,
  objetivos_curto JSONB NOT NULL DEFAULT '[]'::jsonb,
  estrategias JSONB NOT NULL DEFAULT '{}'::jsonb,
  avaliacao JSONB NOT NULL DEFAULT '{}'::jsonb,
  responsaveis JSONB NOT NULL DEFAULT '{}'::jsonb,
  versao_familia TEXT,
  contexto_adicional TEXT,
  modelo TEXT,
  gerado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  revisado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pei_pdi_user ON public.pei_pdi(user_id);
CREATE INDEX idx_pei_pdi_aluno ON public.pei_pdi(user_id, aluno_client_id);

ALTER TABLE public.pei_pdi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pei own select" ON public.pei_pdi FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pei own insert" ON public.pei_pdi FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pei own update" ON public.pei_pdi FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pei own delete" ON public.pei_pdi FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_pei_pdi_updated
  BEFORE UPDATE ON public.pei_pdi
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pei_evidencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pei_id UUID NOT NULL REFERENCES public.pei_pdi(id) ON DELETE CASCADE,
  objetivo_id TEXT,
  aluno_client_id TEXT NOT NULL,
  registro_diario_id UUID,
  descricao TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'positiva',
  data_evidencia TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pei_evid_user ON public.pei_evidencias(user_id);
CREATE INDEX idx_pei_evid_pei ON public.pei_evidencias(pei_id);

ALTER TABLE public.pei_evidencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pei evid own select" ON public.pei_evidencias FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pei evid own insert" ON public.pei_evidencias FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pei evid own update" ON public.pei_evidencias FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pei evid own delete" ON public.pei_evidencias FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.pei_progresso (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pei_id UUID NOT NULL REFERENCES public.pei_pdi(id) ON DELETE CASCADE,
  objetivo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'parcialmente',
  evidencia TEXT,
  recomendacao TEXT,
  avaliado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_pei_prog_user ON public.pei_progresso(user_id);
CREATE INDEX idx_pei_prog_pei ON public.pei_progresso(pei_id);

ALTER TABLE public.pei_progresso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pei prog own select" ON public.pei_progresso FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pei prog own insert" ON public.pei_progresso FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pei prog own update" ON public.pei_progresso FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pei prog own delete" ON public.pei_progresso FOR DELETE USING (auth.uid() = user_id);
