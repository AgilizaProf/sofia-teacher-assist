
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos-professor', 'documentos-professor', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can select documentos-professor"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documentos-professor');

CREATE POLICY "Authenticated can insert documentos-professor"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documentos-professor');

CREATE POLICY "Authenticated can update documentos-professor"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documentos-professor')
WITH CHECK (bucket_id = 'documentos-professor');

CREATE POLICY "Authenticated can delete documentos-professor"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documentos-professor');
