ALTER TABLE public.alunos_inclusao
  ADD COLUMN IF NOT EXISTS ano_referencia_pedagogico text;

COMMENT ON COLUMN public.alunos_inclusao.ano_referencia_pedagogico IS
  'Ano/etapa pedagógica de referência usada pela Sofia para gerar atividades, adaptações e documentos. Pode diferir do ano de matrícula.';