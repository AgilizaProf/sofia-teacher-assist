-- Cadernos AgilizaProf em PDF (Drive "Atividades AgilizaProf > Cadernos").
-- Bucket privado "cadernos": cada PDF fica com o mesmo nome do arquivo no
-- Drive (ex.: MATEMATICA_3ANO_CADERNO_DE_FIXACAO.pdf). O índice ficha por
-- ficha (título, habilidade da BNCC e página) está no app, em
-- src/lib/cadernos/catalogo.json, então não precisa de tabela.
--
-- Quem envia, troca ou apaga os PDFs: só admin (tela /admin/cadernos).
-- Quem abre: admin sempre; professora a partir de 13/03/2027, com plano Pro
-- ativo. O app abre por link temporário (1 hora).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cadernos', 'cadernos', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Cadernos: admin envia" ON storage.objects;
DROP POLICY IF EXISTS "Cadernos: admin troca" ON storage.objects;
DROP POLICY IF EXISTS "Cadernos: admin apaga" ON storage.objects;
DROP POLICY IF EXISTS "Cadernos: quem pode abrir" ON storage.objects;

CREATE POLICY "Cadernos: admin envia"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'cadernos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Cadernos: admin troca"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'cadernos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'cadernos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Cadernos: admin apaga"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'cadernos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Cadernos: quem pode abrir"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'cadernos'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR (
      now() >= '2027-03-13 00:00:00-03'::timestamptz
      AND EXISTS (
        SELECT 1 FROM public.subscriptions s
        WHERE s.user_id = auth.uid()
          AND s.plano = 'pro'
          AND s.status = 'active'
          AND (s.current_period_end IS NULL OR s.current_period_end > now())
      )
    )
  )
);
