
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nivel_ensino text,
  ADD COLUMN IF NOT EXISTS faixa_etaria text;

ALTER TABLE public.alunos_inclusao
  ADD COLUMN IF NOT EXISTS nivel text,
  ADD COLUMN IF NOT EXISTS faixa_etaria text;

-- ROTEIROS EI
CREATE TABLE public.roteiros_ei (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  turma text,
  faixa_etaria text,
  campos_experiencia jsonb NOT NULL DEFAULT '[]'::jsonb,
  tema text,
  tipo_experiencia text,
  duracao integer,
  conteudo jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'rascunho',
  modelo text,
  gerado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.roteiros_ei ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rot ei own select" ON public.roteiros_ei FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rot ei own insert" ON public.roteiros_ei FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rot ei own update" ON public.roteiros_ei FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rot ei own delete" ON public.roteiros_ei FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_roteiros_ei_updated BEFORE UPDATE ON public.roteiros_ei
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- OBSERVAÇÕES EI
CREATE TABLE public.observacoes_ei (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  turma text,
  crianca_client_id text,
  crianca_nome text,
  texto text NOT NULL,
  direitos jsonb NOT NULL DEFAULT '[]'::jsonb,
  campos jsonb NOT NULL DEFAULT '[]'::jsonb,
  foto_url text,
  analise_sofia jsonb,
  registrado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.observacoes_ei ENABLE ROW LEVEL SECURITY;
CREATE POLICY "obs ei own select" ON public.observacoes_ei FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "obs ei own insert" ON public.observacoes_ei FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "obs ei own update" ON public.observacoes_ei FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "obs ei own delete" ON public.observacoes_ei FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_observacoes_ei_updated BEFORE UPDATE ON public.observacoes_ei
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MARCOS
CREATE TABLE public.marcos_desenvolvimento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  crianca_client_id text NOT NULL,
  crianca_nome text,
  campo_experiencia text NOT NULL,
  descricao text NOT NULL,
  status text NOT NULL DEFAULT 'em_processo',
  evidencia text,
  observado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.marcos_desenvolvimento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mar des own select" ON public.marcos_desenvolvimento FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "mar des own insert" ON public.marcos_desenvolvimento FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mar des own update" ON public.marcos_desenvolvimento FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "mar des own delete" ON public.marcos_desenvolvimento FOR DELETE USING (auth.uid() = user_id);

-- RELATÓRIOS EI
CREATE TABLE public.relatorios_ei (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  crianca_client_id text NOT NULL,
  crianca_nome text,
  bimestre text NOT NULL,
  conteudo_texto text,
  versao_familia text,
  status text NOT NULL DEFAULT 'gerado',
  gerado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.relatorios_ei ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rel ei own select" ON public.relatorios_ei FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rel ei own insert" ON public.relatorios_ei FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rel ei own update" ON public.relatorios_ei FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "rel ei own delete" ON public.relatorios_ei FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER trg_relatorios_ei_updated BEFORE UPDATE ON public.relatorios_ei
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
