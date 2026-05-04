-- Helper trigger function for updated_at (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============== ALUNOS (Inclusão) ==============
CREATE TABLE public.alunos_inclusao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id TEXT,
  nome TEXT NOT NULL,
  turma TEXT,
  idade INT,
  condicao TEXT,
  cid TEXT,
  nivel_suporte TEXT,
  aee TEXT,
  observacoes TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);
CREATE INDEX idx_alunos_inclusao_user ON public.alunos_inclusao(user_id);
ALTER TABLE public.alunos_inclusao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alunos own select" ON public.alunos_inclusao FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "alunos own insert" ON public.alunos_inclusao FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "alunos own update" ON public.alunos_inclusao FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "alunos own delete" ON public.alunos_inclusao FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_alunos_inclusao_updated BEFORE UPDATE ON public.alunos_inclusao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== ANAMNESE ==============
CREATE TABLE public.alunos_anamnese (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  aluno_client_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, aluno_client_id)
);
CREATE INDEX idx_anam_user ON public.alunos_anamnese(user_id);
ALTER TABLE public.alunos_anamnese ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anam own select" ON public.alunos_anamnese FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "anam own insert" ON public.alunos_anamnese FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "anam own update" ON public.alunos_anamnese FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "anam own delete" ON public.alunos_anamnese FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_anam_updated BEFORE UPDATE ON public.alunos_anamnese
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== REGISTROS de acompanhamento ==============
CREATE TABLE public.alunos_registros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  aluno_client_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, aluno_client_id)
);
CREATE INDEX idx_reg_user ON public.alunos_registros(user_id);
ALTER TABLE public.alunos_registros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reg own select" ON public.alunos_registros FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reg own insert" ON public.alunos_registros FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reg own update" ON public.alunos_registros FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reg own delete" ON public.alunos_registros FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_reg_updated BEFORE UPDATE ON public.alunos_registros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== AGENDA ==============
CREATE TABLE public.agenda_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id TEXT,
  titulo TEXT NOT NULL,
  data_evento DATE NOT NULL,
  hora TEXT,
  tipo TEXT,
  notas TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);
CREATE INDEX idx_agenda_user_date ON public.agenda_eventos(user_id, data_evento);
ALTER TABLE public.agenda_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agenda own select" ON public.agenda_eventos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "agenda own insert" ON public.agenda_eventos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "agenda own update" ON public.agenda_eventos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "agenda own delete" ON public.agenda_eventos FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_agenda_updated BEFORE UPDATE ON public.agenda_eventos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== PLANOS DE AULA ==============
CREATE TABLE public.planos_aula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id TEXT,
  titulo TEXT,
  semana TEXT,
  dia TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);
CREATE INDEX idx_planos_user ON public.planos_aula(user_id);
ALTER TABLE public.planos_aula ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planos own select" ON public.planos_aula FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "planos own insert" ON public.planos_aula FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "planos own update" ON public.planos_aula FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "planos own delete" ON public.planos_aula FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_planos_updated BEFORE UPDATE ON public.planos_aula
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== PARECERES ==============
CREATE TABLE public.pareceres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_id TEXT,
  aluno_nome TEXT,
  aluno_client_id TEXT,
  bimestre TEXT,
  texto TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);
CREATE INDEX idx_pareceres_user ON public.pareceres(user_id);
ALTER TABLE public.pareceres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pareceres own select" ON public.pareceres FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "pareceres own insert" ON public.pareceres FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pareceres own update" ON public.pareceres FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "pareceres own delete" ON public.pareceres FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_pareceres_updated BEFORE UPDATE ON public.pareceres
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();