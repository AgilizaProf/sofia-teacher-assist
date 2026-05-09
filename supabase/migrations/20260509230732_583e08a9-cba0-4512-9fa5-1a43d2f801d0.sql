CREATE TABLE public.turmas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  escola text,
  ano text,
  turno text,
  qtd_alunos text,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "turmas own select" ON public.turmas FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "turmas own insert" ON public.turmas FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "turmas own update" ON public.turmas FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "turmas own delete" ON public.turmas FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_turmas_updated_at
BEFORE UPDATE ON public.turmas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();