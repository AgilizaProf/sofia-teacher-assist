DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'turmas','alunos_inclusao','alunos_registros','alunos_anamnese',
    'agenda_eventos','app_snapshots','pei_pdi','pei_evidencias','pei_progresso',
    'relatorios_ei','roteiros_ei','observacoes_ei','planos_aula',
    'trilhas','trilha_semanas','pareceres','marcos_desenvolvimento',
    'defasagens','progressao_alunos','profiles'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    WHEN others THEN NULL;
    END;
    BEGIN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;
END $$;