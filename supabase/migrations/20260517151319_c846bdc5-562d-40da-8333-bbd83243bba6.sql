CREATE TABLE public.relatorios_documento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  aluno_client_id text NOT NULL,
  aluno_nome text NOT NULL,
  turma_id uuid,
  turma_nome text,
  tipo text NOT NULL,
  modo text NOT NULL,
  periodo text NOT NULL,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  escola text,
  professor text,
  conteudo jsonb NOT NULL,
  leis text[] NOT NULL DEFAULT '{}',
  versao integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.relatorios_documento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reldoc own select" ON public.relatorios_documento
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "reldoc own insert" ON public.relatorios_documento
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reldoc own update" ON public.relatorios_documento
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "reldoc own delete" ON public.relatorios_documento
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_reldoc_user_aluno_periodo
  ON public.relatorios_documento(user_id, aluno_client_id, periodo);

CREATE TRIGGER trg_reldoc_updated_at
  BEFORE UPDATE ON public.relatorios_documento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();